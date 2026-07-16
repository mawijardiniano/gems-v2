import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLog";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 },
    );

  await connectDB();
  const profile = await UserAuth.findById(id)
    .populate("personal_info_id")
    .lean();
  if (!profile)
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 },
    );

  return NextResponse.json({ status: "success", data: profile });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 },
    );
  }

  await connectDB();
  const body = await req.json();
  console.log("body", body);

  const profile = await Profile.findById(id);
  if (!profile) {
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 },
    );
  }

  try {
    if (Object.prototype.hasOwnProperty.call(body, "personal_information")) {
      const incomingPI = body.personal_information;
      if (incomingPI === null) {
        profile.personal_information = null;
      } else {
        const existingPI = profile.personal_information
          ? typeof profile.personal_information.toObject === "function"
            ? profile.personal_information.toObject()
            : profile.personal_information
          : {};
        const mergedPI = { ...existingPI, ...incomingPI };
        profile.personal_information = mergedPI;
      }
      delete body.personal_information;
    }

    profile.set(body);
  } catch (mergeErr) {
    console.error("Error merging personal_information:", mergeErr);
    return NextResponse.json(
      { status: "error", message: mergeErr.message },
      { status: 400 },
    );
  }
  try {
    profile.data_version = (profile.data_version || 1) + 1;
    
    try {
      const token = req.cookies.get("auth_token")?.value;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback");
        if (decoded?.id) {
          profile.updated_by = decoded.id;
        }
      }
    } catch {
      
    }

    const updated = await profile.save();

    const user = await UserAuth.findOne({ personal_info_id: profile._id });
    const userId = user?._id;

    if (userId) {
      await logActivity({
        user_id: userId,
        action: "PROFILE_UPDATE",
        description: "User updated their profile",
        req,
        metadata: { profile_id: profile._id, data_version: profile.data_version },
        resource_type: "profile",
        resource_id: profile._id,
        severity: "info",
      });
      console.log("✅ Logged activity: PROFILE_UPDATE");
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
      { status: 400 },
    );
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing user id" },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await UserAuth.findById(id);
    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    if (user.personal_info_id) {
      const deletedProfile = await Profile.findByIdAndDelete(
        user.personal_info_id,
      );
      if (deletedProfile) {
        console.log(
          "✅ Deleted linked profile:",
          deletedProfile._id.toString(),
        );
      } else {
        console.warn(
          "⚠️ Profile not found for deletion:",
          user.personal_info_id.toString(),
        );
      }
    }

    await UserAuth.findByIdAndDelete(id);
    console.log("✅ Deleted user account:", id);

    if (global.io) {
      global.io.emit("profile:deleted", {
        id: user.personal_info_id?.toString(),
      });
    }

    return NextResponse.json({
      status: "success",
      message: "User account and linked profile deleted",
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
