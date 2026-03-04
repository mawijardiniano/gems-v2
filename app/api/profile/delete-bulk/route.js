import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req) {
  try {
    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ status: "error", message: "No IDs provided" }, { status: 400 });
    }

    const users = await UserAuth.find({ _id: { $in: ids } });
    const profileIds = users.map(u => u.personal_info_id).filter(Boolean);
    await Profile.deleteMany({ _id: { $in: profileIds } });
    await UserAuth.deleteMany({ _id: { $in: ids } });

    if (global.io) {
      profileIds.forEach(pid => {
        global.io.emit("profile:deleted", { id: pid.toString() });
      });
    }

    return NextResponse.json({ status: "success", message: "Users and linked profiles deleted" });
  } catch (error) {
    console.error("BULK DELETE /api/profile/bulk error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
