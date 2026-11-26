import { NextResponse, after } from "next/server";
import { connectDB } from "@/data/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import bcrypt from "bcryptjs";
import UserAuth from "@/models/user";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { logActivity } from "@/data/lib/activityLog";
import {
  mergeProfile,
  mergeTermAffiliation,
} from "@/app/api/integration/_utils/mapping";
import {
  findExistingProfileForRecord,
  extractIncomingPii,
  diffPii,
} from "@/app/api/integration/_utils/profileMatch";
import { assignIdentifiers, savePii } from "@/data/lib/vaultWriter";
import { loadDecryptedPii } from "@/data/lib/profileBroker";
import { createSyncLogBuffer } from "@/app/api/integration/_utils/logger";

/* At or above this many approved rows, migrate runs in the background. */
const BACKGROUND_MIN_ROWS = 200;
/* How often (in rows) a background run saves its progress. */
const PROGRESS_EVERY = 25;
/* Rows migrated at once. Each row waits mostly on database round trips. */
const MIGRATE_CONCURRENCY = 4;
import { friendlyMigrationError } from "@/app/api/integration/_utils/fieldLabels";
import {
  normalizeStudentUsername,
  normalizeEmployeeUsername,
  usernameEqualsFilter,
} from "@/data/lib/usernames";

function normalizeUsername(value) {
  if (!value) return "";
  // Locked rule for name/ID fallbacks: strip [-_. space], keep Aa-Zz case.
  return normalizeEmployeeUsername(value);
}

const STARTING_PASSWORD = "gems1234";

function normalizeStudentIdUsername(value) {
  if (!value) return "";
  return normalizeStudentUsername(value);
}

/* Account creation checks that a username is free (ignoring case) and then
   inserts it. Two queues doing that at once could both take the same name,
   so accounts are created one at a time within this process. */
let accountQueue = Promise.resolve();
function ensureUserAuthForProfile(profile, identity, mapped) {
  const run = accountQueue.then(() =>
    createUserAuthForProfile(profile, identity, mapped),
  );
  accountQueue = run.catch(() => {});
  return run;
}

/**
 * Splits rows into up to `count` queues. Rows that share a name, email,
 * Student No. or Employee No. (directly or through another row) land in
 * the same queue, so the match-or-create step for one person never runs
 * in two queues at once. Groups are dealt largest first to the shortest
 * queue.
 */
function partitionForMigration(records, count) {
  const parent = records.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const owner = new Map();
  records.forEach((record, i) => {
    const mapped = record.mapped_payload || {};
    const idt = record.identity || {};
    const name = [mapped.personal?.first_name, mapped.personal?.last_name]
      .map((v) => String(v || "").trim().toLowerCase())
      .join("|");
    const email = String(idt.email || mapped.contact?.email || "")
      .trim()
      .toLowerCase();
    const keys = [
      name !== "|" && `n:${name}`,
      email && `e:${email}`,
      idt.student_id && `s:${idt.student_id}`,
      idt.employee_id && `m:${idt.employee_id}`,
    ].filter(Boolean);
    for (const key of keys) {
      if (owner.has(key)) parent[find(i)] = find(owner.get(key));
      else owner.set(key, i);
    }
  });

  const groups = new Map();
  records.forEach((record, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  });
  const queues = Array.from({ length: Math.max(1, count) }, () => []);
  for (const group of [...groups.values()].sort((a, b) => b.length - a.length)) {
    queues.reduce((a, b) => (b.length < a.length ? b : a)).push(...group);
  }
  return queues.filter((q) => q.length > 0);
}

async function createUserAuthForProfile(profile, identity, mapped) {
  const linked = await UserAuth.findOne({ personal_info_id: profile._id });
  if (linked) {
    return { action: "exists", username: linked.username };
  }

  const emailLocal = String(identity?.email || "").split("@")[0];
  const first = normalizeUsername(mapped?.personal?.first_name);
  const last = normalizeUsername(mapped?.personal?.last_name);

  const candidates = [
    normalizeStudentIdUsername(identity?.student_id),
    normalizeUsername(identity?.employee_id),
    normalizeUsername(emailLocal),
    normalizeUsername([first, last].filter(Boolean).join("")),
    normalizeUsername(
      [first, normalizeStudentIdUsername(identity?.student_id)]
        .filter(Boolean)
        .join(""),
    ),
  ].filter(Boolean);

  let chosenUsername = "";
  for (const candidate of candidates) {
    const exists = await UserAuth.findOne(
      usernameEqualsFilter(candidate),
    ).lean();
    if (!exists) {
      chosenUsername = candidate;
      break;
    }
  }

  if (!chosenUsername) {
    chosenUsername = `user${String(profile._id).slice(-8).toLowerCase()}`;
    let counter = 1;
    while (
      await UserAuth.findOne(usernameEqualsFilter(chosenUsername)).lean()
    ) {
      chosenUsername = `user${String(profile._id).slice(-8).toLowerCase()}${counter}`;
      counter += 1;
    }
  }

  /* insertMany skips the save hook, so the starting password goes in
     already hashed (see startingPasswordHash). Schema validation still
     runs. */
  await UserAuth.insertMany([
    {
      personal_info_id: profile._id,
      username: chosenUsername,
      password: await startingPasswordHash(),
      role: "User",
    },
  ]);

  return { action: "created", username: chosenUsername };
}

/* Every imported account starts with the same password. bcryptjs at cost
   12 takes about half a second per hash, which made each new account the
   slowest step of a migration; the hash is made once and reused. Each
   person's own password is hashed with a fresh salt when they change it. */
let startingHashPromise = null;
function startingPasswordHash() {
  if (!startingHashPromise) {
    startingHashPromise = bcrypt
      .hash(STARTING_PASSWORD, 12)
      .catch((error) => {
        startingHashPromise = null;
        throw error;
      });
  }
  return startingHashPromise;
}

/**
 * Migrates the batch's approved rows. Runs inside the request for a small
 * batch, or after the response (see BACKGROUND_MIN_ROWS) for a large one,
 * reporting progress on the batch as it goes.
 */
async function migrateApproved({ batch, approved, auth, req, trackProgress }) {
  const id = batch._id;
  /* Sync logs are written in chunks, not one insert per row. */
  const logs = createSyncLogBuffer();
  const writeSyncLog = (entry) => logs.push(entry);
  let processed = 0;

  let created = 0;
  let updated = 0;
  let identical = 0;
  let skipped = 0;
  let failed = 0;

  /* Rows run in MIGRATE_CONCURRENCY queues; rows that could be the same
     person (shared name, email or ID) share a queue, so one person is
     never created twice by two queues at once. */
  const processRecord = async (record) => {
    try {
      const mapped = record.mapped_payload || {};
      /* Rows staged before email matching was restored have an empty
         identity.email; take it from the mapped payload instead. */
      const identity = {
        ...(record.identity?.toObject?.() ?? record.identity ?? {}),
      };
      if (!identity.email) {
        identity.email = String(mapped.contact?.email || "")
          .trim()
          .toLowerCase();
      }

      const hasIdentity =
        identity.student_id || identity.employee_id || identity.email;
      if (!hasIdentity) {
        skipped += 1;
        record.status = "failed";
        record.migration_result = {
          action: "skipped",
          message: "No Student No., Employee No., or Email on this row.",
        };
        await record.save();

        await writeSyncLog({
          batchId: batch._id,
          stagingRecordId: record._id,
          level: "warn",
          action: "skip",
          message:
            "Skipped — no Student No., Employee No., or Email on the row.",
          executedBy: auth.user._id,
          executedByUsername: auth.user.username,
        });
        return;
      }

      /* The lookup returns `{ profile, matchedOn }`, not the document. */
      const match = await findExistingProfileForRecord(record, GemsProfile);
      let profile = match?.profile || null;
      const matchedOn = match?.matchedOn || null;
      let profileAction = "updated";
      let profileChanges = [];

      /* PII (names, birthday, contact, GAD data) lives encrypted in the
         Identity Vault; the profile holds identifiers, `vaultRef` and the
         blind search index only. Same write path as POST /api/profile. */
      const incomingPii = extractIncomingPii(mapped);

      if (!profile) {
        const { gemsPublicId, vaultRef } =
          await assignIdentifiers(GemsProfile);
        profile = new GemsProfile({
          gemsPublicId,
          vaultRef,
          migrationStatus: "vaulted",
          created_by: auth.user._id,
          /* `person_type` is GEMS-owned and required, so it is carried onto
             the affiliation block explicitly. It arrives on the mapped
             payload's affiliation already; the fallback covers a payload
             built before the field existed. */
          affiliation: {
            ...(mapped.affiliation || {}),
            person_type:
              mapped.affiliation?.person_type ||
              mapped.personal?.currentStatus ||
              undefined,
          },
        });
        /* Validate before touching the vault, so a row the profile schema
           refuses (say, an office not in the list) writes no PII at all. */
        await profile.validate();
        /* Vault first: if the profile write then fails, the worst case is
           an orphan vault row — never a profile without its PII. */
        const { patch } = await savePii({
          vaultRef,
          pii: incomingPii,
          ownerType: "profile",
        });
        profile.profileSearchIndex = patch.profileSearchIndex;
        await profile.save();
        profileAction = "created";
        created += 1;
      } else {
        /* A profile from an import made before this fix may have no vault
           row at all; it gets one now, filled from this row. */
        let existingPii = {};
        if (profile.vaultRef) {
          existingPii = (await loadDecryptedPii(profile.vaultRef)) || {};
        } else {
          const ids = await assignIdentifiers(GemsProfile);
          profile.vaultRef = ids.vaultRef;
          if (!profile.gemsPublicId) profile.gemsPublicId = ids.gemsPublicId;
          profile.migrationStatus = "vaulted";
        }

        const { changedPii, changes: piiChanges } = diffPii(
          existingPii,
          incomingPii,
        );

        /* Merge and validate the GEMS-side changes before writing PII. A
           row the profile schema refuses used to update the vault and then
           fail on save, leaving the person's PII changed (and the search
           index stale) while the row reported "failed". */
        const { merged, changes } = mergeProfile(profile, mapped);
        profile.set(merged);
        await profile.validate();

        if (piiChanges.length > 0) {
          const { patch } = await savePii({
            profileId: profile._id,
            vaultRef: profile.vaultRef,
            pii: changedPii,
            mergedWith: existingPii,
            ownerType: "profile",
          });
          profile.profileSearchIndex = patch.profileSearchIndex;
        }

        await profile.save();
        updated += 1;
        profileChanges = [...changes, ...piiChanges];
        if (profileChanges.length === 0) identical += 1;
      }

      const account = await ensureUserAuthForProfile(
        profile,
        identity,
        mapped,
      );

      const schoolYear = mapped.school_year;
      const semester = mapped.semester;

      if (!schoolYear || !semester) {
        skipped += 1;
        record.status = "failed";
        record.migration_result = {
          action: "skipped",
          profile_id: profile._id,
          message: `No school year or semester on this row — person saved but no term added (account: ${account.username}).`,
        };
        await record.save();

        await writeSyncLog({
          batchId: batch._id,
          stagingRecordId: record._id,
          level: "warn",
          action: "skip",
          message:
            "Skipped — row has no school year/semester, so no term was saved.",
          executedBy: auth.user._id,
          executedByUsername: auth.user.username,
          targetProfileId: profile._id,
          details: {
            account_action: account.action,
            account_username: account.username,
          },
        });
        return;
      }

      const existingTerm = await ProfileTerm.findOne({
        profile_id: profile._id,
        school_year: schoolYear,
        semester,
      });
      const termAffiliation = mergeTermAffiliation(
        existingTerm?.affiliation,
        mapped.affiliation || {},
      );

      const term = await ProfileTerm.findOneAndUpdate(
        {
          profile_id: profile._id,
          school_year: schoolYear,
          semester,
        },
        {
          $set: {
            affiliation: termAffiliation,
            import_meta: {
              source_file: batch.source_file_key || batch.source_name || "",
              imported_at: new Date(),
              uploaded_by: auth.user._id,
              uploaded_by_username: auth.user.username,
            },
          },
        },
        { upsert: true, new: true },
      );

      record.status = "migrated";
      record.migration_result = {
        action: profileAction,
        profile_id: profile._id,
        profile_term_id: term._id,
        matched_on: matchedOn,
        term_created: !existingTerm,
        account_created: account.action === "created",
        changes: profileChanges,
        message:
          profileAction === "created"
            ? `New record created with the ${schoolYear} ${semester} term. Account: ${account.username}`
            : profileChanges.length === 0
              ? `Already up to date — nothing changed. Account: ${account.username}`
              : `Record updated with the ${schoolYear} ${semester} term. Account: ${account.username}`,
      };
      await record.save();

      /* Name + birthday is the weakest match: two different people can
         share both. Flag it so a reviewer can confirm the merge. */
      const weakMatch = matchedOn === "name_birthday";
      await writeSyncLog({
        batchId: batch._id,
        stagingRecordId: record._id,
        level: weakMatch ? "warn" : "info",
        action: profileAction === "created" ? "create" : "update",
        message:
          profileAction === "created"
            ? "Imported: new record created."
            : weakMatch
              ? "Matched existing person by name + birthday — check this is the same person."
              : "Imported: existing record updated.",
        executedBy: auth.user._id,
        executedByUsername: auth.user.username,
        targetProfileId: profile._id,
        targetProfileTermId: term._id,
        details: {
          school_year: schoolYear,
          semester,
          matched_on: matchedOn,
          account_action: account.action,
          account_username: account.username,
        },
      });
    } catch (e) {
      failed += 1;
      record.status = "failed";
      /* The admin sees a readable reason; the raw error stays in the
         sync log's technical details for debugging. */
      const reason = friendlyMigrationError(e);
      record.migration_result = {
        action: "failed",
        message: reason,
      };
      await record.save();

      await writeSyncLog({
        batchId: batch._id,
        stagingRecordId: record._id,
        level: "error",
        action: "fail",
        message: "Migration failed",
        details: {
          error: reason,
          ...(reason !== e.message ? { raw_error: e.message } : {}),
        },
        executedBy: auth.user._id,
        executedByUsername: auth.user.username,
      });
    }
  };

  const queues = partitionForMigration(approved, MIGRATE_CONCURRENCY);
  await Promise.all(
    queues.map(async (queue) => {
      for (const record of queue) {
        if (trackProgress && processed > 0 && processed % PROGRESS_EVERY === 0) {
          await ImportBatch.updateOne(
            { _id: batch._id },
            {
              $set: {
                "progress.done": processed,
                "progress.updated_at": new Date(),
              },
            },
          );
        }
        processed += 1;
        await processRecord(record);
      }
    }),
  );

  await logs.flush();
  if (batch.progress?.total) {
    batch.progress.done = processed;
    batch.progress.updated_at = new Date();
  }
  batch.status = failed > 0 ? "failed" : "completed";
  batch.finished_at = new Date();
  /* A batch can be migrated again after its failed rows are fixed and
     re-approved; each run only handles the rows approved since, so the
     counts add up. `failed` is what is still failed after this run. */
  batch.totals.migrated_created =
    (batch.totals.migrated_created || 0) + created;
  batch.totals.migrated_updated =
    (batch.totals.migrated_updated || 0) + updated;
  batch.totals.identical = (batch.totals.identical || 0) + identical;
  batch.totals.skipped = (batch.totals.skipped || 0) + skipped;
  batch.totals.failed = failed;
  await batch.save();

  /* Migration is where staged rows become live profiles *and live login
     accounts*. Per-record detail is in SyncLog, which dies with the batch;
     this is the durable record that the import ran, when, by whom, and with
     what result — the fact an access review needs a year later. */
  await logActivity({
    req,
    actor: {
      user_id: auth.user._id,
      username: auth.user.username,
      role: auth.user.role,
      auth_method: "session",
    },
    action:
      failed > 0 ? "IMPORT_BATCH_MIGRATE_PARTIAL" : "IMPORT_BATCH_MIGRATE",
    description: `Migrated import batch ${batch.source_name || id}: ${created} created, ${updated} updated, ${failed} failed`,
    severity: failed > 0 ? "error" : "warning",
    resource_type: "import_batch",
    resource_id: batch._id,
    module: "integration",
    metadata: {
      created,
      updated,
      identical,
      skipped,
      failed,
      batch_status: batch.status,
    },
    outcome: {
      result: failed > 0 ? "failure" : "success",
      error_code: failed > 0 ? "PARTIAL_MIGRATION" : null,
      message: failed > 0 ? `${failed} record(s) failed to migrate` : null,
    },
  });

  return {
    batch_id: batch._id,
    created,
    updated,
    identical,
    skipped,
    failed,
  };
}

export async function POST(req, { params }) {
  let lockedBatchId = null;
  try {
    await connectDB();

    const auth = await requireIntegrationAccess(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const { id } = await params;

    /* Claim the batch atomically: only a `ready` batch can be migrated, and
       only one request can move it to `migrating`. A double-click or a re-run
       on a finished batch is refused instead of processing rows twice. */
    const batch = await ImportBatch.findOneAndUpdate(
      { _id: id, status: "ready" },
      { $set: { status: "migrating" } },
      { new: true },
    );
    if (!batch) {
      const existing = await ImportBatch.findById(id).select("status").lean();
      if (!existing) {
        return NextResponse.json(
          { status: "error", message: "Batch not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          status: "error",
          message: `Batch is ${existing.status}; only a ready batch can be migrated.`,
        },
        { status: 409 },
      );
    }
    lockedBatchId = batch._id;

    const approved = await StagingRecord.find({
      batch_id: id,
      status: "approved",
    });

    batch.progress = {
      done: 0,
      total: approved.length,
      updated_at: new Date(),
    };
    await batch.save();

    /* A large batch would outlast the request (and any proxy timeout in
       front of it). It runs after the response; the page polls the batch's
       status and progress. after() needs a Next.js request scope; without
       one (a script calling the handler) the batch runs inline instead. */
    let scheduled = false;
    if (approved.length >= BACKGROUND_MIN_ROWS) {
      try {
        after(() =>
          migrateApproved({
            batch,
            approved,
            auth,
            req,
            trackProgress: true,
          }).catch(async (error) => {
            console.error("[integration] background migrate failed:", error);
            await ImportBatch.updateOne(
              { _id: batch._id, status: "migrating" },
              { $set: { status: "failed", finished_at: new Date() } },
            ).catch(() => {});
          }),
        );
        scheduled = true;
      } catch {
        scheduled = false;
      }
    }
    if (scheduled) {
      /* The result entry (IMPORT_BATCH_MIGRATE) is written when the run
         ends, after this response; this one records who started it. */
      await logActivity({
        req,
        actor: {
          user_id: auth.user._id,
          username: auth.user.username,
          role: auth.user.role,
          auth_method: "session",
        },
        action: "IMPORT_BATCH_MIGRATE_START",
        description: `Started migrating ${approved.length} row(s) of import batch ${batch.source_name || batch._id} in the background`,
        severity: "warning",
        resource_type: "import_batch",
        resource_id: batch._id,
        module: "integration",
        metadata: { approved: approved.length },
      });
      return NextResponse.json(
        {
          status: "success",
          data: {
            batch_id: batch._id,
            background: true,
            total: approved.length,
          },
        },
        { status: 202 },
      );
    }

    const result = await migrateApproved({ batch, approved, auth, req });
    return NextResponse.json({ status: "success", data: result });
  } catch (error) {
    /* Don't leave a claimed batch stuck in `migrating` after a crash. */
    if (lockedBatchId) {
      await ImportBatch.updateOne(
        { _id: lockedBatchId, status: "migrating" },
        { $set: { status: "failed", finished_at: new Date() } },
      ).catch(() => {});
    }
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
