import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 },
      );
    }

    const createdEvents = await Event.find({
      created_by: user_id,
    }).sort({ start_date: -1 });

    const participatedEvents = await Event.find({
      registered_users: user_id,
    }).sort({ start_date: -1 });

    const allOtherEvents = await Event.find({
      created_by: { $ne: user_id },
      registered_users: { $ne: user_id },
    }).sort({ start_date: -1 });

    const invitedEvents = allOtherEvents;

    return NextResponse.json(
      {
        message: "User events fetched successfully",
        createdEvents,
        participatedEvents,
        invitedEvents,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
