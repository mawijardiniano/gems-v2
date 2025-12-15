import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const profile = await Profile.find({}).populate("userId").lean();

    return Response.json({ status: "success", data: profile }, { status: 200 });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return Response.json(
      { status: "error", message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const profile = await Profile.create(body);

    if (global.io) {
      global.io.emit("profile:new", profile);
      console.log("✅ Emitted profile:new", profile._id);
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await connectDB();

    const result = await Profile.deleteMany({});

    if (global.io) {
      global.io.emit("profile:delete");
      console.log("✅ Emitted profile:deleted");
    }

    return NextResponse.json({
      status: "success",
      message: `Deleted ${result.deletedCount} profiles.`,
    });
  } catch (error) {
    console.error("Error deleting all profiles:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
