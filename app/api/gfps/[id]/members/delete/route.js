import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { sectionKey, memberIndex } = await req.json();

    const gfps = await GFPS.findById(params.id);

    if (!gfps?.sections?.[sectionKey]) {
      return Response.json({ success: false, message: "Invalid section" }, { status: 400 });
    }

    gfps.sections[sectionKey].members.splice(memberIndex, 1);

    await gfps.save();

    await logActivity({
      req,
      action: "GFP_MEMBER_REMOVE",
      description: `Removed member from GFPS section "${sectionKey}"`,
      resource_type: "gfps",
      resource_id: params.id,
      severity: "warning",
      metadata: { sectionKey },
    });

    return Response.json({ success: true, message: "Member removed" });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}