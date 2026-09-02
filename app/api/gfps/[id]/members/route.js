import GFPS from "@/models/gfps";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getGFPSMemberList } from "@/lib/gfpsServer";

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

    members[memberIndex] = {
      ...oldData.toObject(),
      ...data,
    };

    await gfps.save();

    return Response.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
