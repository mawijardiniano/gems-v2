import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import ActivityLog from "@/models/activity_log";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/* Per-record membership history for one GFPS.
 *
 * This endpoint used to read `gfps.auditLogs`, an array no schema ever defined
 * — it returned `undefined` with HTTP 200 on every call, so any client reading
 * the empty body as "no changes" was being told something false. The entries
 * live in ActivityLog, keyed by resource, so that is what we query.
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    try {
      decoded = token ? jwt.verify(token, JWT_SECRET) : null;
    } catch {
      decoded = null;
    }
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const gfps = await GFPS.findById(id).select("_id gfpsName").lean();
    if (!gfps) {
      return NextResponse.json({ message: "GFPS not found" }, { status: 404 });
    }

    const logs = await ActivityLog.find({
      resource_type: "gfps",
      resource_id: gfps._id,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, data: logs }, { status: 200 });
  } catch (err) {
    console.error("GFPS audit fetch error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
