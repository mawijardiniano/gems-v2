import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/data/lib/auth";
import { hasEventOversight } from "@/data/lib/eventAccess";
import EventGuest from "@/models/eventGuest";
import { isApprovedGuest } from "@/data/lib/eventParticipants";

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

    /* Another user's created/attended events: oversight roles only. */
    if (user_id !== user._id.toString() && !hasEventOversight(user.role)) {
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

    const sort = { start_date: -1, createdAt: -1 };

    /* The attendee list is left out: callers only need the events, and it
       would hand every other attendee's id to whoever asks. */
    const createdEvents = await Event.find({ created_by: user_id })
      .select("-attended_users")
      .sort(sort)
      .limit(limit)
      .lean();

    /* Participated = the same rule the reports count by
       (data/lib/eventParticipants.js): an account check-in, unless the
       organizer's guest sheet has a row for this person (that row decides),
       plus approved sheet rows. People recorded by manual encode only have a
       sheet row, so they never saw those events here. */
    const [checkIns, sheetRows] = await Promise.all([
      Event.find({ "attended_users.user_id": user_id }).distinct("_id"),
      EventGuest.find({ user_id }).select("event_id validation_status").lean(),
    ]);
    const onSheet = new Set(sheetRows.map((r) => String(r.event_id)));
    const participatedIds = new Set([
      ...checkIns.map(String).filter((id) => !onSheet.has(id)),
      ...sheetRows.filter(isApprovedGuest).map((r) => String(r.event_id)),
    ]);

    const attendedEvents = await Event.find({
      _id: { $in: [...participatedIds] },
    })
      .select("-attended_users")
      .sort(sort)
      .limit(limit)
      .lean();

    /* `invitedEvents` was removed: it matched every event the user had not
       created and had not attended — a scan of the whole collection returning
       events nobody invited them to, and no component ever rendered it. There is
       no invitation concept in models/event.js to back such a list. */

    return NextResponse.json(
      {
        message: "User events fetched successfully",
        createdEvents,
        participatedEvents: attendedEvents,
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
