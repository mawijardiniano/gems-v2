import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StagingRecord from "@/models/stagingRecord";
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
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const filter = { batch_id: id };
    if (status) filter.status = status;

    const records = await StagingRecord.find(filter)
      .sort({ row_number: 1 })
      .lean();

    return NextResponse.json({ status: "success", data: records });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
