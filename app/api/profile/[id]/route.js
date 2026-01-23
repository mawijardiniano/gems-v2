import Profile from "@/models/profile";
import UserAuth from "@/models/user"
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 }
    );

  await connectDB();
  const profile = await UserAuth.findById(id).populate("personal_info_id").lean();
  if (!profile)
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 }
    );

  return NextResponse.json({ status: "success", data: profile });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 }
    );
  }

  await connectDB();
  const body = await req.json();
  console.log("body", body);

  const profile = await Profile.findById(id);
  if (!profile) {
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 }
    );
  }

  profile.set(body);
  try {
    const updated = await profile.save();

 const user = await UserAuth.findOne({ personal_info_id: profile._id });
    const userId = user?._id;

    if (userId) {
      await logActivity({
        user_id: userId,
        action: "UPDATE_PROFILE",
        description: "User updated their profile",
      });
      console.log("✅ Logged activity: UPDATE_PROFILE");
    }


    if (global.io) {
      global.io.emit("profile:updated", updated);
      console.log("✅ Emitted profile:updated", updated._id);
    }

    return NextResponse.json({ status: "success", data: updated });
  } catch (error) {
    console.error("Validation failed:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing user id" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const user = await UserAuth.findById(id);
    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 }
      );
    }

    if (user.personal_info_id) {
      const deletedProfile = await Profile.findByIdAndDelete(user.personal_info_id);
      if (deletedProfile) {
        console.log("✅ Deleted linked profile:", deletedProfile._id.toString());
      } else {
        console.warn("⚠️ Profile not found for deletion:", user.personal_info_id.toString());
      }
    }

    await UserAuth.findByIdAndDelete(id);
    console.log("✅ Deleted user account:", id);

    if (global.io) {
      global.io.emit("profile:deleted", { id: user.personal_info_id?.toString() });
    }

    return NextResponse.json({
      status: "success",
      message: "User account and linked profile deleted",
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
