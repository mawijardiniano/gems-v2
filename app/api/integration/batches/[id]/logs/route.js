import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SyncLog from "@/models/syncLog";
import { requireAdmin } from "@/app/api/integration/_utils/auth";

export async function GET(req, { params }) {
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
    const logs = await SyncLog.find({ batch_id: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ status: "success", data: logs });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
