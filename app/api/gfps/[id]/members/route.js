import GFPS from "@/models/gfps";
import { connectDB } from "@/lib/db";

export async function PATCH(req, { params }) {
  try {
     await connectDB();
    const body = await req.json();
    const { sectionKey, memberIndex, data } = body;

    const gfps = await GFPS.findById(params.id);

    if (!gfps) {
      return Response.json({ success: false, message: "Not found" }, { status: 404 });
    }

    const section = gfps.sections[sectionKey];

    if (!section) {
      return Response.json({ success: false, message: "Invalid section" }, { status: 400 });
    }

    const oldData = section.members[memberIndex];

    section.members[memberIndex] = {
      ...oldData.toObject(),
      ...data,
    };

    // update timestamp
    section.updatedAt = new Date();

    await gfps.save();

    return Response.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}