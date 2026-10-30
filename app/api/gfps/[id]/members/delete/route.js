import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getGFPSMemberList } from "@/lib/gfpsServer";

export async function DELETE(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();

    const { sectionKey, memberIndex } = await req.json();

    const gfps = await GFPS.findById(params.id);

    const members = getGFPSMemberList(gfps, sectionKey);

    if (!members) {
      return Response.json({ success: false, message: "Invalid section" }, { status: 400 });
    }

    const removed = members[memberIndex];
    if (!removed) {
      return Response.json({ success: false, message: "Invalid member" }, { status: 400 });
    }

    /* Capture the removed row before splicing. Without this the record says
       only that *a* member left section X — it cannot answer "who", which is
       the whole question when a seat change is disputed months later. */
    const removedSnapshot = removed.toObject ? removed.toObject() : { ...removed };

    members.splice(memberIndex, 1);

    await gfps.save();

    await logActivity({
      req,
      action: "GFP_MEMBER_REMOVE",
      description: `Removed ${removedSnapshot.official_text || "member"} from GFPS section "${sectionKey}"`,
      resource_type: "gfps",
      resource_id: gfps._id,
      severity: "warning",
      metadata: {
        sectionKey,
        memberIndex,
        member_id: removedSnapshot._id ? String(removedSnapshot._id) : null,
        member_name: removedSnapshot.official_text || null,
        seat: removedSnapshot.position_title || null,
        sort_order: removedSnapshot.sort_order ?? null,
        appointedAt: removedSnapshot.appointedAt || null,
        /* The full row, so the removal can be reversed exactly. */
        removed: removedSnapshot,
      },
    });

    return Response.json({ success: true, message: "Member removed" });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
