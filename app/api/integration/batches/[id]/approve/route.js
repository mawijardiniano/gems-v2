import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
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
    const body = await req.json().catch(() => ({}));

    const batch = await ImportBatch.findById(id);
    if (!batch) {
      return NextResponse.json(
        { status: "error", message: "Batch not found" },
        { status: 404 },
      );
    }

    const ids = Array.isArray(body.record_ids) ? body.record_ids : null;

    const filter = { batch_id: id, status: "valid" };
    if (ids && ids.length > 0) {
      filter._id = { $in: ids };
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

    return NextResponse.json({
      status: "success",
      data: {
        approved_now: result.modifiedCount,
        approved_total: approved,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
