import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import {
  validateMappedPayload,
  buildIdentity,
  buildIdentityDedupeKey,
} from "@/app/api/integration/_utils/mapping";
import { blindIndex } from "@/data/lib/identityVault";
import {
  AMBIGUOUS_NAME_BIRTHDAY_CODE,
  ambiguousNameBirthdayMessage,
  matchByNameBirthday,
} from "@/app/api/integration/_utils/profileMatch";
import {
  affiliationSchemaErrors,
  canonicalizeAffiliation,
} from "@/app/api/integration/_utils/affiliationCheck";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
import { logActivity } from "@/data/lib/activityLog";

export async function POST(req, { params }) {
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
    const batch = await ImportBatch.findById(id);
    if (!batch) {
      return NextResponse.json(
        { status: "error", message: "Batch not found" },
        { status: 404 },
      );
    }

    /* A batch being migrated, or already migrated, must not be re-checked:
       validation rewrites record statuses and would put migrated rows back
       in the approve queue. */
    if (["migrating", "completed"].includes(batch.status)) {
      return NextResponse.json(
        {
          status: "error",
          message: `Batch is ${batch.status}; it cannot be validated now.`,
        },
        { status: 409 },
      );
    }

    batch.status = "validating";
    await batch.save();

    /* Only rows still under review are (re)checked, plus rows whose
       migration failed, so they can be fixed, approved and migrated again.
       Approved, rejected, migrated and duplicate rows keep their status. */
    const REVALIDATABLE = ["pending", "valid", "invalid", "failed"];
    const allRecords = await StagingRecord.find({ batch_id: id });
    const records = allRecords.filter((r) => REVALIDATABLE.includes(r.status));
    let retried = 0;
    for (const r of records) {
      if (r.status !== "failed") continue;
      /* The old failure reason stays in the sync log. */
      r.migration_result = undefined;
      retried += 1;
    }
    const approvedCount = allRecords.filter(
      (r) => r.status === "approved",
    ).length;

    /* Rows staged before email matching was restored have no identity.email;
       rebuild identity from the mapped payload so they get it. */
    for (const r of records) {
      r.identity = buildIdentity(r.mapped_payload || {});
      /* "budget office", "CICS", "JO" -> the exact listed value, so case or
         a common short form does not fail the row. Saved with the record,
         so migrate writes the listed value. */
      if (r.mapped_payload && canonicalizeAffiliation(r.mapped_payload).length) {
        r.markModified("mapped_payload");
      }
    }

    const studentIds = [];
    const employeeIds = [];
    const emails = [];
    for (const r of records) {
      const idt = r.identity || {};
      if (idt.student_id) studentIds.push(idt.student_id);
      if (idt.employee_id) employeeIds.push(idt.employee_id);
      if (idt.email) emails.push(idt.email);
    }

    const orClauses = [];
    if (studentIds.length)
      orClauses.push({
        "affiliation.academic_information.student_id": { $in: studentIds },
      });
    if (employeeIds.length)
      orClauses.push({
        "affiliation.employment_information.employee_id": { $in: employeeIds },
      });
    /* Email is encrypted in the vault; it is matched through the profile's
       blind index (lowercased, so case doesn't matter). */
    const emailByDigest = new Map();
    for (const email of emails) {
      const digest = blindIndex(email);
      if (digest) emailByDigest.set(digest, email);
    }
    if (emailByDigest.size)
      orClauses.push({
        profileSearchIndex: { $in: [...emailByDigest.keys()] },
      });

    const existingProfiles = orClauses.length
      ? await GemsProfile.find({ $or: orClauses })
          .select("affiliation profileSearchIndex")
          .lean()
      : [];

    const profileByStudent = new Map();
    const profileByEmployee = new Map();
    const profileByEmail = new Map();
    for (const p of existingProfiles) {
      const sid = p.affiliation?.academic_information?.student_id;
      if (sid && !profileByStudent.has(sid)) profileByStudent.set(sid, p);
      const eid = p.affiliation?.employment_information?.employee_id;
      if (eid && !profileByEmployee.has(eid)) profileByEmployee.set(eid, p);
      for (const digest of p.profileSearchIndex || []) {
        const em = emailByDigest.get(digest);
        if (em && !profileByEmail.has(em)) profileByEmail.set(em, p);
      }
    }

    const idOrEmailMatch = (identity) =>
      (identity.student_id && profileByStudent.get(identity.student_id)) ||
      (identity.employee_id && profileByEmployee.get(identity.employee_id)) ||
      (identity.email && profileByEmail.get(identity.email)) ||
      null;

    /* Rows no ID or email matched still get merged into an existing person
       when name + birthday match (same rule as migrate). That is the weakest
       match, so it is surfaced here, before approval, as a warning. */
    const nameMatchByRecord = await matchByNameBirthday(
      GemsProfile,
      records
        .filter((r) => !idOrEmailMatch(r.identity || {}))
        .map((r) => ({
          key: String(r._id),
          mapped: r.mapped_payload || {},
          identity: r.identity || {},
        })),
    );

    const profileIds = [
      ...new Set(
        [...existingProfiles, ...[...nameMatchByRecord.values()].flat()].map(
          (p) => String(p._id),
        ),
      ),
    ];
    const existingTerms = profileIds.length
      ? await ProfileTerm.find({ profile_id: { $in: profileIds } })
          .select("profile_id school_year semester")
          .lean()
      : [];
    const termKeySet = new Set(
      existingTerms.map(
        (t) => `${String(t.profile_id)}|${t.school_year}|${t.semester}`,
      ),
    );

    const openBatchIds = (
      await ImportBatch.find({
        _id: { $ne: batch._id },
        status: { $in: ["pending", "validating", "ready", "migrating"] },
      })
        .select("_id")
        .lean()
    ).map((b) => b._id);

    const otherQueueCount = new Map();
    if (openBatchIds.length) {
      const queueRecords = await StagingRecord.find({
        batch_id: { $in: openBatchIds },
        status: { $in: ["pending", "valid", "approved"] },
      })
        .select("identity")
        .lean();
      for (const qr of queueRecords) {
        const key = buildIdentityDedupeKey(qr.identity || {});
        if (key) otherQueueCount.set(key, (otherQueueCount.get(key) || 0) + 1);
      }
    }

    /* Rows already approved still occupy their ID within this batch. */
    const seen = new Set(
      allRecords
        .filter((r) => r.status === "approved")
        .map((r) => buildIdentityDedupeKey(r.identity || {}))
        .filter(Boolean),
    );
    let valid = 0;
    let invalid = 0;
    let existingCount = 0;
    /* field|code -> { field, code, message, count } over blocking errors. */
    const errorCounts = new Map();

    for (const record of records) {
      if (record.status === "duplicate") continue;

      const errors = [
        ...validateMappedPayload(record.mapped_payload || {}),
        /* Values the profile schema would refuse at migration time. */
        ...affiliationSchemaErrors(record.mapped_payload || {}),
      ];

      const identity = record.identity || {};
      const dedupeKey = buildIdentityDedupeKey(identity);
      if (dedupeKey) {
        if (seen.has(dedupeKey)) {
          errors.push({
            field: "identity",
            code: "duplicate_in_batch",
            message: `This ID (${dedupeKey}) appears more than once in this file.`,
          });
        } else {
          seen.add(dedupeKey);
        }
      }

      const strongMatch = idOrEmailMatch(identity);
      const nameMatches = strongMatch
        ? []
        : nameMatchByRecord.get(String(record._id)) || [];
      /* Several people share this name and birthday: migrate would refuse
         the row, so block it here with the fix. */
      if (errors.length === 0 && nameMatches.length > 1) {
        errors.push({
          field: "identity",
          code: AMBIGUOUS_NAME_BIRTHDAY_CODE,
          message: ambiguousNameBirthdayMessage(nameMatches.length),
        });
      }

      if (errors.length === 0) {
        const nameMatch = nameMatches.length === 1 ? nameMatches[0] : null;
        const profile = strongMatch || nameMatch;

        if (nameMatch) {
          errors.push({
            field: "identity",
            code: "matched_by_name_birthday",
            level: "warning",
            message:
              "No ID or email matched, but an existing person has the same name and birthday — importing will merge this row into that person. Check it is the same person before approving.",
          });
        }

        if (profile) {
          const termKey = `${String(profile._id)}|${record.school_year}|${record.semester}`;
          if (termKeySet.has(termKey)) {
            errors.push({
              field: "identity",
              code: "already_exists",
              level: "warning",
              message: `Already in the records, and ${record.school_year} ${record.semester} is already saved for this person — importing will refresh that term's info.`,
            });
            existingCount += 1;
          } else {
            errors.push({
              field: "identity",
              code: "already_exists",
              level: "warning",
              message: `Already in the records — importing will add the ${record.school_year || "?"} ${record.semester || "?"} term.`,
            });
            existingCount += 1;
          }
        }

        const queueCount = otherQueueCount.get(dedupeKey) || 0;
        if (queueCount > 0) {
          errors.push({
            field: "identity",
            code: "already_in_batch_queue",
            level: "warning",
            message: `Also listed in ${queueCount} other ${
              queueCount === 1 ? "batch that hasn't" : "batches that haven't"
            } been imported yet — check it before importing to avoid doubles.`,
          });
        }
      }

      record.validation_errors = errors;
      const blocking = errors.some((e) => e.level !== "warning");
      record.status = blocking ? "invalid" : "valid";
      await record.save();

      if (blocking) invalid += 1;
      else valid += 1;
      for (const e of errors) {
        if (e.level === "warning") continue;
        const key = `${e.field}|${e.code}`;
        const entry = errorCounts.get(key);
        if (entry) entry.count += 1;
        else
          errorCounts.set(key, {
            field: e.field,
            code: e.code,
            message: e.message,
            count: 1,
          });
      }

      await writeSyncLog({
        batchId: batch._id,
        stagingRecordId: record._id,
        level: blocking ? "warn" : "info",
        action: "validate",
        message: blocking ? "Row checked — has problems" : "Row checked — OK",
        details: { errors },
        executedBy: auth.user._id,
        executedByUsername: auth.user.username,
      });
    }

    const totalsBefore = {
      valid: batch.totals.valid,
      invalid: batch.totals.invalid,
      existing: batch.totals.existing,
    };

    /* Rows approved earlier are still migratable, so they keep the batch ready. */
    const migratable = valid + approvedCount;
    batch.status = migratable > 0 ? "ready" : "failed";
    batch.totals.valid = valid;
    batch.totals.invalid = invalid;
    batch.totals.existing = existingCount;
    /* One problem shared by many rows (a missing column, a wrong default)
       is shown once on the batch instead of hundreds of times. The message
       of duplicate_in_batch names one row's ID, so it is made generic. */
    batch.error_summary = [...errorCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((e) =>
        e.code === "duplicate_in_batch"
          ? { ...e, message: "The same ID appears more than once in this file." }
          : e,
      );
    await batch.save();

    /* Validation is the gate, not a read-only check: the result decides whether
       the batch becomes eligible for migration. The change is recorded because
       the existence of a `ready` batch, and who made it ready, is what a later
       reviewer needs to judge whether an import should have proceeded. Row-level
       detail already lives in SyncLog and is deliberately not duplicated here. */
    await logActivity({
      req,
      user_id: auth.user._id,
      action: "IMPORT_BATCH_VALIDATE",
      description: `Validated batch: ${valid} valid, ${invalid} invalid, ${existingCount} already in records`,
      resource_type: "import_batch",
      resource_id: batch._id,
      module: "integration",
      metadata: {
        batch_id: String(batch._id),
        source_name: batch.source_name || null,
        previous_status: "validating",
        new_status: batch.status,
        valid,
        invalid,
        existing: existingCount,
      },
      changes: [
        {
          field: "status",
          before: "validating",
          after: batch.status,
          redacted: false,
        },
        {
          field: "totals.valid",
          before: totalsBefore.valid,
          after: valid,
          redacted: false,
        },
        {
          field: "totals.invalid",
          before: totalsBefore.invalid,
          after: invalid,
          redacted: false,
        },
        {
          field: "totals.existing",
          before: totalsBefore.existing,
          after: existingCount,
          redacted: false,
        },
      ],
      outcome: {
        result: migratable > 0 ? "success" : "failure",
        status_code: 200,
      },
    });

    return NextResponse.json({
      status: "success",
      data: {
        batch_id: batch._id,
        valid,
        invalid,
        existing: existingCount,
        retried,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
