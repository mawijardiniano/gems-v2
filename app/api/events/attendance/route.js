import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheDelPrefix } from "@/lib/cache";

export async function POST(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { event_id, user_id, captured_at } = await req.json();

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

    const now = Date.now();
    const hasCapturedAt = captured_at && !isNaN(new Date(captured_at).getTime());
    const referenceTime = hasCapturedAt
      ? new Date(captured_at).getTime()
      : now;
    const startTimes = (event.start_dates || [])
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    const endTimes = (event.end_dates || [])
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    const earliestStart = startTimes.length > 0 ? Math.min(...startTimes) : null;
    const latestEnd = endTimes.length > 0 ? Math.max(...endTimes) : null;

    if (earliestStart !== null && referenceTime < earliestStart) {
      return NextResponse.json(
        {
          message: "Attendance is not yet open. The event has not started yet.",
          code: "EVENT_NOT_STARTED",
        },
        { status: 400 },
      );
    }

    if (latestEnd !== null && referenceTime > latestEnd) {
      return NextResponse.json(
        {
          message: "The QR code has expired. This event has already ended.",
          code: "EVENT_EXPIRED",
        },
        { status: 400 },
      );
    }

    // Atomically mark the user as attended — only if they are NOT already in
    // attended_users. This prevents duplicates when the modal POST and the
    // background-sync replay fire at the same time.
    const attendedAt = hasCapturedAt ? new Date(captured_at) : new Date();
    const updated = await Event.findOneAndUpdate(
      {
        _id: event_id,
        "attended_users.user_id": { $ne: user_id },
      },
      {
        $push: { attended_users: { user_id, attended_at: attendedAt } },
        $addToSet: { registered_users: user_id },
      },
      { new: true },
    );

    if (!updated) {
      // The user is already in attended_users — fetch the existing entry
      const existingEvent = await Event.findById(event_id);
      const existing = existingEvent?.attended_users?.find(
        (a) => a.user_id?.toString() === user_id.toString(),
      );
      return NextResponse.json({
        message: "Already marked as attended",
        already_attended: true,
        attended_at: existing?.attended_at,
      });
    }

    // Attendance recorded - invalidate cached event lists.
    cacheDelPrefix("events:list:");

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