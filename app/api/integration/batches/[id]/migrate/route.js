import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
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
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
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

function normalizeStudentIdUsername(value) {
  if (!value) return "";
  return normalizeStudentUsername(value);
}

async function ensureUserAuthForProfile(profile, identity, mapped) {
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

  await UserAuth.create({
    personal_info_id: profile._id,
    username: chosenUsername,
    password: "gems1234",
    role: "User",
  });

  return { action: "created", username: chosenUsername };
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

    let created = 0;
    let updated = 0;
    let identical = 0;
    let skipped = 0;
    let failed = 0;

    for (const record of approved) {
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
          continue;
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
          continue;
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

    return NextResponse.json({
      status: "success",
      data: {
        batch_id: batch._id,
        created,
        updated,
        identical,
        skipped,
        failed,
      },
    });
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
