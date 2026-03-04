import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";

function generateUsername(personal) {
  if (personal?.first_name) return personal.first_name;
  return "user";
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
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const personal = body.personal || body.personal_information;
    if (!personal || !personal.first_name || !personal.last_name) {
      throw new Error(
        "personal.first_name and personal.last_name are required",
      );
    }

    if (personal.religion) {
      const allowedReligions = [
        "Roman Catholic",
        "Iglesia ni Cristo",
        "Iglesia Independencia Filipina",
        "Protestant",
        "Born Again Christian",
        "Evangelical Christian",
        "Latter Day Saints",
        "Members Church of God International (MGCI)",
        "Other",
      ];
      personal.religion =
        allowedReligions.find(
          (r) => r.toLowerCase() === personal.religion.toLowerCase(),
        ) || personal.religion;
    }
    if (personal.bloodType) {
      const allowedBloodTypes = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
        "Unknown",
      ];
      personal.bloodType =
        allowedBloodTypes.find(
          (b) => b.toLowerCase() === personal.bloodType.toLowerCase(),
        ) || personal.bloodType;
    }

    const profilePayload = { ...body, personal };
    delete profilePayload.personal_information;

    const profile = await Profile.create(profilePayload);
    const role = body.role ? body.role : "User";

    const username = generateUsername(personal);
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
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  try {
    await connectDB();

    const usersToDelete = await UserAuth.find({ role: "User" }).select(
      "personal_info_id",
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
      { status: 500 },
    );
  }
}
