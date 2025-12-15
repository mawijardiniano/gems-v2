import Profile from "@/models/profile";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 }
    );

  await connectDB();
  const profile = await Profile.findById(id).lean();
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

  const profile = await Profile.findById(id);
  if (!profile) {
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 }
    );
  }

  Object.assign(profile, body);

  const newStatus = body.currentStatus || profile.currentStatus;
  if (newStatus === "Employee") profile.affiliation.studentDetails = undefined;
  if (newStatus === "Student") profile.affiliation.employeeDetails = undefined;

  if (profile.gadData.isPWD === false) {
    profile.gadData.disabilityDetails = undefined;
  }

  if (newStatus === "Student" && profile.affiliation.studentDetails) {
    profile.affiliation.studentDetails.isScholar =
      profile.affiliation.studentDetails.isScholar === true ||
      profile.affiliation.studentDetails.isScholar === "true";
  }
  if (newStatus === "Employee" && profile.affiliation.employeeDetails) {
  }

  if (newStatus === "Student") {
    const sd = profile.affiliation.studentDetails;
    if (!sd?.course || !sd?.yearLevel || sd?.isScholar == null) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Student details (course, yearLevel, isScholar) are required when status is Student",
        },
        { status: 400 }
      );
    }
  }

  if (newStatus === "Employee") {
    const ed = profile.affiliation.employeeDetails;
    if (!ed?.department || !ed?.position || !ed?.employmentType) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Employee details (department, position, employmentType) are required when status is Employee",
        },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await profile.save();

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
  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 }
    );

  await connectDB();
  const deleted = await Profile.findByIdAndDelete(id).lean();

  if (!deleted)
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 }
    );

  if (global.io) {
    global.io.emit("profile:deleted", { id });
    console.log("✅ Emitted profile:deleted", id);
  } else {
    console.warn("⚠️ Socket.IO server not initialized!");
  }

  return NextResponse.json({ status: "success", message: "Profile deleted" });
}
