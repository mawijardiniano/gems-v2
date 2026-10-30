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

    const added = {
      ...member,
      appointedAt: new Date(),
      isActive: true,
    };
    members.push(added);

    await gfps.save();

    await logActivity({
      req,
      action: "GFP_MEMBER_ADD",
      description: `Added member to GFPS section "${sectionKey}"`,
      resource_type: "gfps",
      resource_id: gfps._id,
      /* Adding a seat-holder changes who may act for the agency, so it must be
         awaited rather than fire-and-forget. */
      severity: "warning",
      metadata: {
        sectionKey,
        /* The identity added, captured here because the row's `_id` is not
           authoritative once the member is later removed and re-added. */
        member_name: added.official_text || null,
        seat: added.position_title || null,
        sort_order: added.sort_order ?? null,
      },
    });

    return Response.json({ success: true, message: "Member added" });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
