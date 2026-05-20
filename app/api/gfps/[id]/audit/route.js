import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";

export async function GET(_, { params }) {
  try {
    await connectDB();

    const gfps = await GFPS.findById(params.id).populate("auditLogs.performedBy");

    return Response.json({
      success: true,
      data: gfps.auditLogs,
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}