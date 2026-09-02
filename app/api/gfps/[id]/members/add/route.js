import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getGFPSMemberList } from "@/lib/gfpsServer";

export async function POST(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();

    const body = await req.json();
    const { sectionKey, member } = body;

    const gfps = await GFPS.findById(params.id);

    const members = getGFPSMemberList(gfps, sectionKey);

    if (!members) {
      return Response.json({ success: false, message: "Invalid section" }, { status: 400 });
    }

    members.push({
      ...member,
      appointedAt: new Date(),
      isActive: true,
    });

    await gfps.save();

    await logActivity({
      req,
      action: "GFP_MEMBER_ADD",
      description: `Added member to GFPS section "${sectionKey}"`,
      resource_type: "gfps",
      resource_id: params.id,
      severity: "info",
      metadata: { sectionKey },
    });

    return Response.json({ success: true, message: "Member added" });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
