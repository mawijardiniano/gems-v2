import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import { NextResponse } from "next/server";
import { getIO } from "@/app/api/socket/route";

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

    const io = getIO(req);
    io?.emit("profile:new", profile);

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}