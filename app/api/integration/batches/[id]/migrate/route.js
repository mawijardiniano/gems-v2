import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import UserAuth from "@/models/user";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import {
  findExistingProfileForRecord,
  mergeProfile,
  mergeTermAffiliation,
} from "@/app/api/integration/_utils/mapping";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";

function asDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeUsername(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "");
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
    normalizeUsername(identity?.student_id),
    normalizeUsername(identity?.employee_id),
    normalizeUsername(emailLocal),
    normalizeUsername([first, last].filter(Boolean).join(".")),
    normalizeUsername([first, identity?.student_id].filter(Boolean).join(".")),
  ].filter(Boolean);

  let chosenUsername = "";
  for (const candidate of candidates) {
    const exists = await UserAuth.findOne({ username: candidate }).lean();
    if (!exists) {
      chosenUsername = candidate;
      break;
    }
  }

  if (!chosenUsername) {
    chosenUsername = `user.${String(profile._id).slice(-8).toLowerCase()}`;
    let counter = 1;
    while (await UserAuth.findOne({ username: chosenUsername }).lean()) {
      chosenUsername = `user.${String(profile._id).slice(-8).toLowerCase()}.${counter}`;
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
  try {
    await connectDB();

    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const { id } = await params;

    const batch = await ImportBatch.findById(id);
    if (!batch) {
      return NextResponse.json(
        { status: "error", message: "Batch not found" },
        { status: 404 },
      );
    }

    batch.status = "migrating";
    await batch.save();

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
        const identity = record.identity || {};

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

        let profile = await findExistingProfileForRecord(record, GemsProfile);
        let profileAction = "updated";
        let profileChanges = [];

        if (!profile) {
          profile = await GemsProfile.create({
            personal: {
              ...(mapped.personal || {}),
              birthday: asDate(mapped.personal?.birthday),
            },
            gadData: mapped.gadData || {},
            affiliation: mapped.affiliation || {},
            contact: mapped.contact || {},
          });
          profileAction = "created";
          created += 1;
        } else {
          const { merged, changes } = mergeProfile(profile, mapped);
          profile.set(merged);
          await profile.save();
          updated += 1;
          profileChanges = changes;
          if (changes.length === 0) identical += 1;
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
          changes: profileChanges,
          message:
            profileAction === "created"
              ? `New record created with the ${schoolYear} ${semester} term. Account: ${account.username}`
              : profileChanges.length === 0
                ? `Already up to date — nothing changed. Account: ${account.username}`
                : `Record updated with the ${schoolYear} ${semester} term. Account: ${account.username}`,
        };
        await record.save();

        await writeSyncLog({
          batchId: batch._id,
          stagingRecordId: record._id,
          action: profileAction === "created" ? "create" : "update",
          message:
            profileAction === "created"
              ? "Imported: new record created."
              : "Imported: existing record updated.",
          executedBy: auth.user._id,
          executedByUsername: auth.user.username,
          targetProfileId: profile._id,
          targetProfileTermId: term._id,
          details: {
            school_year: schoolYear,
            semester,
            account_action: account.action,
            account_username: account.username,
          },
        });
      } catch (e) {
        failed += 1;
        record.status = "failed";
        record.migration_result = {
          action: "failed",
          message: e.message,
        };
        await record.save();

        await writeSyncLog({
          batchId: batch._id,
          stagingRecordId: record._id,
          level: "error",
          action: "fail",
          message: "Migration failed",
          details: { error: e.message },
          executedBy: auth.user._id,
          executedByUsername: auth.user.username,
        });
      }
    }

    batch.status = failed > 0 ? "failed" : "completed";
    batch.finished_at = new Date();
    batch.totals.migrated_created = created;
    batch.totals.migrated_updated = updated;
    batch.totals.identical = identical;
    batch.totals.skipped = skipped;
    batch.totals.failed = failed;
    await batch.save();

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
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
