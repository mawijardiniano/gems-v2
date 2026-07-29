import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";

export async function POST(req) {
  try {
    await connectDB();

    const { event_id, user_id } = await req.json();

    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );
    }

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 },
      );
    }

    const event = await Event.findById(event_id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Check if user is already marked as attended
    const alreadyAttended = event.attended_users?.some(
      (a) => a.user_id?.toString() === user_id.toString(),
    );

    if (alreadyAttended) {
      // Return existing attendance record
      const existing = event.attended_users.find(
        (a) => a.user_id?.toString() === user_id.toString(),
      );
      return NextResponse.json({
        message: "Already marked as attended",
        already_attended: true,
        attended_at: existing.attended_at,
      });
    }

    // Mark user as attended
    event.attended_users = event.attended_users || [];
    event.attended_users.push({
      user_id: user_id,
      attended_at: new Date(),
    });

    // Also ensure user is in registered_users if not already
    if (!event.registered_users?.some((id) => id.toString() === user_id.toString())) {
      event.registered_users.push(user_id);
    }

    await event.save();

    await logActivity({
      req,
      action: "EVENT_ATTENDANCE",
      description: `User marked as attended for event`,
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: { user_id },
    });

    return NextResponse.json({
      message: "Attendance recorded successfully",
      attended_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 },
    );
  }
}