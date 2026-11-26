import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { rateLimiters } from "@/data/lib/rateLimit";
import {
  STUDENT,
  EMPLOYEE,
  checkInClosedReason,
  guestDetailsFromProfile,
  confirmPreview,
  resolveProfileByIdentifier,
} from "@/data/lib/attendeeLookup";

/* Public QR form, step 2 for students and employees: "Student ID or email".
   Answers with a preview (full name, sex, college/office, program) so the
   scanner can confirm it is them before checking in. See confirmPreview for
   the privacy trade-off of showing the full name on a public page.

   No audit record, for the reason given in api/profile/check-id: the caller
   is anonymous, and the only thing a log entry could carry is the ID or email
   somebody typed, which is PII. The control that fits is the rate limit, plus
   only answering while the event's attendance window is open. A miss, a
   duplicate and a wrong participant type all return the same `found: false`. */

const tooMany = (limited) =>
  NextResponse.json(
    { message: "Too many lookups right now. Please try again in a minute." },
    { status: 429, headers: limited.headers },
  );

export async function POST(req) {
  try {
    const ipLimited = await rateLimiters.guestLookupIp(req);
    if (ipLimited.error) return tooMany(ipLimited);

    const body = await req.json().catch(() => ({}));
    const event_id = body?.event_id;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id))
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );
    const participantType = body?.participant_type;
    if (participantType !== STUDENT && participantType !== EMPLOYEE)
      return NextResponse.json(
        { message: "Participant type must be Student or Employee" },
        { status: 400 },
      );
    const identifier = String(body?.identifier ?? "").trim();
    if (!identifier)
      return NextResponse.json(
        { message: "Enter your ID number or email." },
        { status: 400 },
      );

    const eventLimited = await rateLimiters.guestLookupEvent(req, event_id);
    if (eventLimited.error) return tooMany(eventLimited);

    await connectDB();
    const event = await Event.findById(event_id)
      .select("status start_date end_date start_dates end_dates date")
      .lean();
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    const closed = checkInClosedReason(event);
    if (closed) return NextResponse.json(closed, { status: 400 });

    const match = await resolveProfileByIdentifier(identifier, participantType);
    if (!match) return NextResponse.json({ found: false });

    const details = await guestDetailsFromProfile(
      match.profile,
      match.pii,
      participantType,
    );
    return NextResponse.json({
      found: true,
      ...confirmPreview(details),
    });
  } catch (err) {
    console.error("POST /api/events/guest-attendance/lookup failed:", err);
    return NextResponse.json(
      { message: "Unable to look up your record." },
      { status: 500 },
    );
  }
}
