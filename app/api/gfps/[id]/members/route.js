import GFPS from "@/models/gfps";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getGFPSMemberList } from "@/lib/gfpsServer";
import { logActivity, diffFields } from "@/lib/activityLog";

/* Fields a member row is compared on. Both sides of the diff are plain
   `toObject()` snapshots, so a Date compares against a Date and no field needs
   special-casing. */
const MEMBER_DIFF_FIELDS = [
  "official_text",
  "position_title",
  "role",
  "sort_order",
  "isActive",
  "appointedAt",
];

export async function PATCH(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();
    const body = await req.json();
    const { sectionKey, memberIndex, data } = body;

    const gfps = await GFPS.findById(params.id);

    if (!gfps) {
      return Response.json({ success: false, message: "Not found" }, { status: 404 });
    }

    const members = getGFPSMemberList(gfps, sectionKey);

    if (!members) {
      return Response.json({ success: false, message: "Invalid section" }, { status: 400 });
    }

    const oldData = members[memberIndex];

    if (!oldData) {
      return Response.json({ success: false, message: "Invalid member" }, { status: 400 });
    }

    /* Snapshot before mutating. Editing a GFPS seat is the highest-consequence
       change in this module — it decides who signs off agency submissions — and
       it was the one route with no trail at all. */
    const before = oldData.toObject();

    members[memberIndex] = {
      ...before,
      ...data,
    };

    await gfps.save();

    const changes = diffFields(before, members[memberIndex], MEMBER_DIFF_FIELDS);

    await logActivity({
      req,
      action: "GFP_MEMBER_UPDATE",
      description: `Updated member in GFPS section "${sectionKey}"`,
      resource_type: "gfps",
      resource_id: gfps._id,
      severity: "warning",
      changes,
      metadata: {
        sectionKey,
        memberIndex,
        member_id: before._id ? String(before._id) : null,
        /* The identity at time of edit, so the record stays legible even after
           the member is later renamed or removed. */
        member_name: before.official_text || null,
        seat: before.position_title || null,
      },
    });

    return Response.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
