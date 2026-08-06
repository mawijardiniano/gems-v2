import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import SyncLog from "@/models/syncLog";
import { requireAdmin } from "@/app/api/integration/_utils/auth";

export async function DELETE(req, { params }) {
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

    const [recordsResult, logsResult] = await Promise.all([
      StagingRecord.deleteMany({ batch_id: id }),
      SyncLog.deleteMany({ batch_id: id }),
    ]);

    await ImportBatch.deleteOne({ _id: id });

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
