import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { cacheDelPrefix } from "@/data/lib/cache";
import { attendanceWindow } from "@/data/lib/eventStatus";
import { isEventOrganizer } from "@/data/lib/eventAccess";
import UserAuth from "@/models/user";
import EventGuest from "@/models/eventGuest";

/* How old an offline-queued scan may be when it is replayed. The scan time
   comes from the device, so this is also how far back a check-in can be
   dated: it was 24 hours, which let a student "check in" the day after an
   event ended. Two hours still covers a scan queued at the venue. */
const OFFLINE_REPLAY_WINDOW_MS = 2 * 60 * 60 * 1000;
/* Tolerance for a device clock running slightly ahead of the server. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_IDS_PER_REQUEST = 200;

export async function POST(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { event_id, user_id, captured_at, manual_add } = await req.json();

    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );
    }

    const rawIds = Array.isArray(user_id) ? user_id : [user_id];
    /* Each id is its own update query, so one request cannot carry thousands. */
    if (rawIds.length > MAX_IDS_PER_REQUEST) {
      return NextResponse.json(
        {
          message: `At most ${MAX_IDS_PER_REQUEST} people can be recorded per request.`,
        },
        { status: 400 },
      );
    }
    if (
      rawIds.length === 0 ||
      rawIds.some((uid) => !uid || !mongoose.Types.ObjectId.isValid(uid))
    ) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 },
      );
    }
    const targetIds = [...new Set(rawIds.map((uid) => uid.toString()))];

    /* Only what the permission, status and time-window checks read. */
    const event = await Event.findById(event_id)
      .select("created_by status start_date end_date start_dates end_dates date")
      .lean();
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    /* Recording someone else, or bypassing the time window, is for this
       event's organizers: its creator or an oversight role. */
    const isOrganizer = isEventOrganizer(user, event);
    const selfId = user._id.toString();
    const otherIds = targetIds.filter((uid) => uid !== selfId);
    if (otherIds.length && !isOrganizer) {
      return NextResponse.json(
        { message: "You can only record your own attendance." },
        { status: 403 },
      );
    }

    /* Ids sent by an organizer must be real accounts: any well-formed id was
       pushed into the attendee list and counted as a participant. */
    if (otherIds.length) {
      const found = await UserAuth.countDocuments({ _id: { $in: otherIds } });
      if (found !== otherIds.length) {
        return NextResponse.json(
          { message: "Some of the selected accounts no longer exist." },
          { status: 400 },
        );
      }
    }

    if (event.status === "cancelled") {
      return NextResponse.json(
        { message: "This event has been cancelled.", code: "EVENT_CANCELLED" },
        { status: 400 },
      );
    }

    /* `captured_at` exists for the offline PWA queue (public/sw.js), which
       replays scans taken without a connection. It is client-supplied, so it
       is only trusted within a short replay window; otherwise a student could
       back-date a check-in to any past event. */
    const now = Date.now();
    const capturedMs = captured_at ? new Date(captured_at).getTime() : NaN;
    const hasCapturedAt =
      Number.isFinite(capturedMs) &&
      capturedMs <= now + CLOCK_SKEW_MS &&
      capturedMs >= now - OFFLINE_REPLAY_WINDOW_MS;
    const referenceTime = hasCapturedAt ? Math.min(capturedMs, now) : now;

    /* Same day-bounded window the guest QR route and the manage-list badge use,
       from lib/eventStatus. This used to be a third hand-built copy that did not
       even day-bound the times, so a guest and a signed-in user could get
       different answers at the same moment. */
    const { earliestStart, latestEnd } = attendanceWindow(event);

    // Organizer manual adds (Manual Add Attendee button) bypass the QR
    // time-window checks so staff can mark attendance before/after the event.
    const bypassTimeWindow = manual_add === true && isOrganizer;

    if (
      earliestStart !== null &&
      referenceTime < earliestStart &&
      !bypassTimeWindow
    ) {
      return NextResponse.json(
        {
          message: "Attendance is not yet open. The event has not started yet.",
          code: "EVENT_NOT_STARTED",
        },
        { status: 400 },
      );
    }

    if (latestEnd !== null && referenceTime > latestEnd && !bypassTimeWindow) {
      return NextResponse.json(
        {
          message: "The QR code has expired. This event has already ended.",
          code: "EVENT_EXPIRED",
        },
        { status: 400 },
      );
    }

    const attendedAt = new Date(referenceTime);

    /* People already on the guest sheet as approved (a manual encode, or an
       approved check-in by ID / email). Pushing them into attended_users too
       replied "Attendance recorded successfully" for someone already counted;
       the table hid the second entry, so it looked like a duplicate save. */
    const onSheet = await EventGuest.find({
      event_id,
      user_id: { $in: targetIds },
      $or: [
        { validation_status: "approved" },
        { validation_status: { $exists: false } },
        { validation_status: null },
      ],
    })
      .select("user_id attended_at")
      .lean();
    const onSheetAt = new Map(
      onSheet.map((g) => [String(g.user_id), g.attended_at]),
    );

    const results = [];
    let anyAdded = false;
    for (const uid of targetIds) {
      if (onSheetAt.has(uid)) {
        results.push({
          user_id: uid,
          added: false,
          already_attended: true,
          attended_at: onSheetAt.get(uid),
        });
        continue;
      }
      /* updateOne, not findOneAndUpdate with new:true: the whole event (and
         its full attendee list) was being returned and discarded per id. */
      const { modifiedCount } = await Event.updateOne(
        {
          _id: event_id,
          "attended_users.user_id": { $ne: uid },
        },
        {
          $push: { attended_users: { user_id: uid, attended_at: attendedAt } },
        },
      );
      if (modifiedCount) anyAdded = true;
      results.push({ user_id: uid, added: Boolean(modifiedCount) });
    }

    /* One read for everyone who was already on the list, instead of one
       full event load per already-attended id. */
    const already = results.filter((r) => !r.added && !r.already_attended);
    if (already.length) {
      const fresh = await Event.findById(event_id)
        .select("attended_users")
        .lean();
      const byId = new Map(
        (fresh?.attended_users || []).map((a) => [
          String(a.user_id),
          a.attended_at,
        ]),
      );
      for (const r of already) {
        r.already_attended = true;
        r.attended_at = byId.get(r.user_id);
      }
    }

    if (anyAdded) {
      cacheDelPrefix("events:list:");
    }

    await logActivity({
      req,
      action: "EVENT_ATTENDANCE",
      description: bypassTimeWindow
        ? `Organizer manually marked users as attended for event`
        : `User marked as attended for event`,
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: { user_id: targetIds, manual_add: bypassTimeWindow || false },
    });

    if (targetIds.length === 1) {
      const result = results[0];
      if (!result.added) {
        return NextResponse.json({
          message: "Already marked as attended",
          already_attended: true,
          attended_at: result.attended_at,
        });
      }
      return NextResponse.json({
        message: "Attendance recorded successfully",
        attended_at: attendedAt.toISOString(),
      });
    }

    return NextResponse.json({
      message: "Attendance processed",
      results,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
