import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 },
      );
    }

    const ORGANIZER_ROLES = [
      "Admin",
      "GAD Focal Person",
      "GAD Coordinator",
      "Dean",
    ];
    if (
      user_id !== user._id.toString() &&
      !ORGANIZER_ROLES.includes(user.role)
    ) {
      return NextResponse.json(
        { message: "You can only view your own events." },
        { status: 403 },
      );
    }

    const limitParam = Number(url.searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 500)
        : 100;

    const sort = { "start_dates.0": -1 };

    const createdEvents = await Event.find({ created_by: user_id })
      .sort(sort)
      .limit(limit);

    const participatedEvents = await Event.find({
      registered_users: user_id,
    })
      .sort(sort)
      .limit(limit);

    const invitedEvents = await Event.find({
      created_by: { $ne: user_id },
      registered_users: { $ne: user_id },
    })
      .sort(sort)
      .limit(limit);

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
