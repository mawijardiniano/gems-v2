import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const body = await req.json();
    const { sectionKey, member } = body;

    const gfps = await GFPS.findById(params.id);

    if (!gfps.sections[sectionKey]) {
      return Response.json({ success: false, message: "Invalid section" }, { status: 400 });
    }

    gfps.sections[sectionKey].members.push({
      ...member,
      appointedAt: new Date(),
      isActive: true,
    });

    await gfps.save();

    return Response.json({ success: true, message: "Member added" });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}