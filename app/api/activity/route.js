import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/activity_log";

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 }
      );
    }

    const activities = await ActivityLog.find({ user_id })
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({ activities }, { status: 200 });
  } catch (err) {
    console.error("Activity fetch error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
