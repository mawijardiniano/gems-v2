import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import SyncLog from "@/models/syncLog";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { logActivity } from "@/lib/activityLog";

export async function DELETE(req, { params }) {
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

    const [recordsResult, logsResult] = await Promise.all([
      StagingRecord.deleteMany({ batch_id: id }),
      SyncLog.deleteMany({ batch_id: id }),
    ]);

    await ImportBatch.deleteOne({ _id: id });

    /* This deletes the batch's own SyncLog, so the trail of everything that
       happened inside it goes with it. The durable record has to be written
       here, and it has to say what was destroyed — after the delete there is
       nothing left to inspect. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "IMPORT_BATCH_DELETE",
      description: `Deleted import batch ${batch.source_name || id} and its records`,
      severity: "critical",
      resource_type: "import_batch",
      resource_id: batch._id,
      module: "integration",
      metadata: {
        source_type: batch.source_type,
        source_name: batch.source_name || null,
        batch_status: batch.status,
        created_by_username: batch.created_by_username || null,
        deleted_records: recordsResult.deletedCount || 0,
        deleted_logs: logsResult.deletedCount || 0,
        totals: batch.totals || null,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Batch deleted",
      data: {
        batch_id: id,
        deleted_records: recordsResult.deletedCount || 0,
        deleted_logs: logsResult.deletedCount || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
