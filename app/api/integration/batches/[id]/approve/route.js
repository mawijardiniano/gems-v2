import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
import { logActivity } from "@/data/lib/activityLog";

/* Set by the validate route on a row matched only on name + birthday. */
const WEAK_MATCH_CODE = "matched_by_name_birthday";

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
    const body = await req.json().catch(() => ({}));

    const batch = await ImportBatch.findById(id);
    if (!batch) {
      return NextResponse.json(
        { status: "error", message: "Batch not found" },
        { status: 404 },
      );
    }

    /* Approval only makes sense on a validated batch that hasn't started
       migrating; anything else would approve rows nobody checked. */
    if (batch.status !== "ready") {
      return NextResponse.json(
        {
          status: "error",
          message: `Batch is ${batch.status}; validate it first (only a ready batch can be approved).`,
        },
        { status: 409 },
      );
    }

    const ids = Array.isArray(body.record_ids) ? body.record_ids : null;

    const filter = { batch_id: id, status: "valid" };
    let needsReview = 0;
    if (ids && ids.length > 0) {
      filter._id = { $in: ids };
    } else {
      /* A row matched to an existing person on name + birthday alone is
         merged into that person, PII included. Bulk "approve all" leaves
         those rows out, so each one is approved deliberately by selecting
         it after checking it is the same person. */
      filter["validation_errors.code"] = { $ne: WEAK_MATCH_CODE };
      needsReview = await StagingRecord.countDocuments({
        batch_id: id,
        status: "valid",
        "validation_errors.code": WEAK_MATCH_CODE,
      });
    }

    const result = await StagingRecord.updateMany(filter, {
      $set: {
        status: "approved",
        reviewed_by: auth.user._id,
        reviewed_at: new Date(),
      },
    });

    const approved = await StagingRecord.countDocuments({
      batch_id: id,
      status: "approved",
    });
    batch.totals.approved = approved;
    await batch.save();

    await writeSyncLog({
      batchId: batch._id,
      action: "approve",
      message: `Approved ${result.modifiedCount} record(s)`,
      details: { modifiedCount: result.modifiedCount, ids: ids || "all valid" },
      executedBy: auth.user._id,
      executedByUsername: auth.user.username,
    });

    /* SyncLog is batch-scoped: it is deleted along with the batch, so it cannot
       answer "who approved the import that created these accounts" once the
       batch is cleaned up. Approval is the gate before migration makes live
       user accounts, so it belongs in the durable trail too. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "IMPORT_BATCH_APPROVE",
      description: `Approved ${result.modifiedCount} record(s) in import batch ${batch.source_name || id}`,
      severity: "warning",
      resource_type: "import_batch",
      resource_id: batch._id,
      module: "integration",
      metadata: {
        modified_count: result.modifiedCount,
        approved_total: approved,
        record_ids: ids || "all valid",
        left_for_review: needsReview,
      },
    });

    return NextResponse.json({
      status: "success",
      data: {
        approved_now: result.modifiedCount,
        approved_total: approved,
        needs_review: needsReview,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
