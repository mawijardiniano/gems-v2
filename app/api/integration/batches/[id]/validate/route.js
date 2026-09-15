import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { validateMappedPayload, buildIdentityDedupeKey } from "@/app/api/integration/_utils/mapping";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";

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

    batch.status = "validating";
    await batch.save();

    const records = await StagingRecord.find({ batch_id: id });

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
      orClauses.push({ "affiliation.academic_information.student_id": { $in: studentIds } });
    if (employeeIds.length)
      orClauses.push({ "affiliation.employment_information.employee_id": { $in: employeeIds } });
    if (emails.length)
      orClauses.push({ "contact.email": { $in: emails } });

    const existingProfiles = orClauses.length
      ? await GemsProfile.find({ $or: orClauses })
          .select("personal affiliation contact")
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
      const em = p.contact?.email;
      if (em && !profileByEmail.has(em)) profileByEmail.set(em, p);
    }

    const profileIds = [...new Set(existingProfiles.map((p) => String(p._id)))];
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

    const seen = new Set();
    let valid = 0;
    let invalid = 0;
    let existingCount = 0;

    for (const record of records) {
      if (record.status === "duplicate") continue;

      const errors = validateMappedPayload(record.mapped_payload || {});

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

      if (errors.length === 0) {
        const profile =
          (identity.student_id && profileByStudent.get(identity.student_id)) ||
          (identity.employee_id && profileByEmployee.get(identity.employee_id)) ||
          (identity.email && profileByEmail.get(identity.email)) ||
          null;

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

      await writeSyncLog({
        batchId: batch._id,
        stagingRecordId: record._id,
        level: blocking ? "warn" : "info",
        action: "validate",
        message: blocking
          ? "Row checked — has problems"
          : "Row checked — OK",
        details: { errors },
        executedBy: auth.user._id,
        executedByUsername: auth.user.username,
      });
    }

    batch.status = valid > 0 ? "ready" : "failed";
    batch.totals.valid = valid;
    batch.totals.invalid = invalid;
    batch.totals.existing = existingCount;
    await batch.save();

    return NextResponse.json({
      status: "success",
      data: {
        batch_id: batch._id,
        valid,
        invalid,
        existing: existingCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
