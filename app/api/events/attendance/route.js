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

    // Check if attendance is within the event's scheduled date/time window
    const now = Date.now();
    const startTimes = (event.start_dates || [])
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    const endTimes = (event.end_dates || [])
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    const earliestStart = startTimes.length > 0 ? Math.min(...startTimes) : null;
    const latestEnd = endTimes.length > 0 ? Math.max(...endTimes) : null;

    if (earliestStart !== null && now < earliestStart) {
      return NextResponse.json(
        {
          message: "Attendance is not yet open. The event has not started yet.",
          code: "EVENT_NOT_STARTED",
        },
        { status: 400 },
      );
    }

    if (latestEnd !== null && now > latestEnd) {
      return NextResponse.json(
        {
          message: "The QR code has expired. This event has already ended.",
          code: "EVENT_EXPIRED",
        },
        { status: 400 },
      );
    }

    // Check if user is already marked as attended
    const alreadyAttended = event.attended_users?.some(
      (a) => a.user_id?.toString() === user_id.toString(),
    );

    if (alreadyAttended) {
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