import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";

function generateUsername(personal) {
  return personal.first_name;
}

function generateTempPassword() {
  return `gems123!`; //set default password
}

export async function GET() {
  try {
    await connectDB();

    const users = await UserAuth.find({ role: "User" })
      .populate("personal_info_id")
      .lean();

    return NextResponse.json({ status: "success", data: users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const profile = await Profile.create(body);
    const role = body.role ? body.role : "User";

    const username = generateUsername(body.personal_information);
    const tempPassword = generateTempPassword();

    await UserAuth.create({
      personal_info_id: profile._id,
      username,
      password: tempPassword,
      role,
    });

    if (global.io) {
      global.io.emit("profile:new", profile);
      console.log("✅ Emitted profile:new", profile._id);
    }

    return NextResponse.json(
      {
        success: true,
        profile_id: profile._id,
        username,
        temporary_password: tempPassword,
        role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    await connectDB();

    const usersToDelete = await UserAuth.find({ role: "User" }).select(
      "personal_info_id"
    );
    const profileIds = usersToDelete.map((u) => u.personal_info_id);

    await Profile.deleteMany({ _id: { $in: profileIds } });
    await UserAuth.deleteMany({ role: "User" });

    if (global.io) {
      global.io.emit("profile:deleted");
      console.log("✅ Emitted profile:deleted for User role only");
    }

    return NextResponse.json({
      status: "success",
      message: `Deleted ${usersToDelete.length} users with role "User".`,
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
