import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { validateMappedPayload } from "@/app/api/integration/_utils/mapping";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status },
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

    const seen = new Set();
    let valid = 0;
    let invalid = 0;

    for (const record of records) {
      const errors = validateMappedPayload(record.mapped_payload || {});

      const identity = record.identity || {};
      const dedupeKey =
        identity.student_id || identity.employee_id || identity.email || "";
      if (dedupeKey) {
        if (seen.has(dedupeKey)) {
          errors.push({
            field: "identity",
            code: "duplicate_in_batch",
            message: `Duplicate identity in batch: ${dedupeKey}`,
          });
        } else {
          seen.add(dedupeKey);
        }
      }

      record.validation_errors = errors;
      record.status = errors.length ? "invalid" : "valid";
      await record.save();

      if (errors.length) invalid += 1;
      else valid += 1;

      await writeSyncLog({
        batchId: batch._id,
        stagingRecordId: record._id,
        level: errors.length ? "warn" : "info",
        action: "validate",
        message: errors.length
          ? "Record failed validation"
          : "Record validated",
        details: { errors },
        executedBy: auth.user._id,
        executedByUsername: auth.user.username,
      });
    }

    batch.status = valid > 0 ? "ready" : "failed";
    batch.totals.valid = valid;
    batch.totals.invalid = invalid;
    await batch.save();

    return NextResponse.json({
      status: "success",
      data: {
        batch_id: batch._id,
        valid,
        invalid,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
