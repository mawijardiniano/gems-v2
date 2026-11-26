import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/data/lib/activityLog";
import { cacheDelPrefix } from "@/data/lib/cache";
import { optionalAuth } from "@/data/lib/auth";
import { rateLimiters } from "@/data/lib/rateLimit";
import { guestDedupeKey } from "@/data/lib/guestIdentity";
import {
  STUDENT,
  EMPLOYEE,
  checkInClosedReason,
  guestDetailsFromProfile,
  resolveProfileByIdentifier,
} from "@/data/lib/attendeeLookup";

const SEX = ["Male", "Female"];
const GENDER_IDENTITY = ["Male", "Female", "LGBTQIA+"];
const PTYPE = ["Student", "Employee", "Stakeholder"];

/* The open/close window comes from lib/eventStatus (through
   attendeeLookup.checkInClosedReason) — this route used to carry its own copy,
   subtly different from the one in the signed-in attendance route and from the
   badge on the manage list. */

/* This form is public and its values end up on the printed attendance sheet,
   so every free-text field is bounded and whitespace is collapsed. */
const MAX_LEN = {
  full_name: 120,
  contact: 30,
  department_office_org: 200,
  position_designation: 200,
  program_year_section: 200,
};
/* Collapses whitespace. The pattern was `/s+/` (no backslash), which
   replaced every letter "s" with a space: "Jessica Santos" was stored as
   "Je ica Santo". */
const clean = (value, max) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/* Only used for rows saved before dedupe_key existed: their names are
   compared case-insensitively ("juan dela cruz" = "Juan  Dela Cruz"). */
const NAME_COLLATION = { locale: "en", strength: 2 };

/* UI sends program / year / section separately; combine into one sheet value. */
function buildProgramYearSection(b) {
  if (b?.participant_type !== "Student") return "";
  const programPart = clean(b?.program || b?.program_year_section, 120);
  const yearPart = clean(b?.year, 20);
  const sectionPart = clean(b?.section, 40);
  return clean(
    [programPart, yearPart, sectionPart].filter(Boolean).join(" "),
    MAX_LEN.program_year_section,
  );
}

const tooMany = (limited) =>
  NextResponse.json(
    { message: "Too many check-ins right now. Please try again in a minute." },
    { status: 429, headers: limited.headers },
  );

const ALREADY_SUBMITTED = {
  message:
    "You have already submitted a check-in for this event. Please wait for the organizer to validate it.",
  already_submitted: true,
  validation_status: "pending",
};

/* The event, or the response to send when it is missing or its attendance
   window is not open. */
async function loadOpenEvent(event_id) {
  const event = await Event.findById(event_id)
    .select(
      "status start_date end_date start_dates end_dates date attended_users.user_id",
    )
    .lean();
  if (!event)
    return {
      error: NextResponse.json({ message: "Event not found" }, { status: 404 }),
    };
  const closed = checkInClosedReason(event);
  if (closed) return { error: NextResponse.json(closed, { status: 400 }) };
  return { event };
}

export async function POST(req) {
  try {
    const ipLimited = await rateLimiters.guestCheckinIp(req);
    if (ipLimited.error) return tooMany(ipLimited);

    await connectDB();
    /* Optional: a logged-in student scanning the same QR still goes through
       the pending flow — the identity is recorded for review only. */
    const { user: submittingUser } = await optionalAuth(req);
    const submittedBy = submittingUser?._id || null;
    const b = await req.json();
    const event_id = b?.event_id;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );
    }
    const eventLimited = await rateLimiters.guestCheckinEvent(req, event_id);
    if (eventLimited.error) return tooMany(eventLimited);

    /* Students and employees may check in with just their ID number or
       registered email; the sheet row is then filled from their profile and
       every detail field the client sent is ignored. */
    const identifier = String(b?.identifier ?? "").trim();
    if (identifier) {
      return await checkInByIdentifier({
        req,
        event_id,
        participantType: b?.participant_type,
        identifier,
        submittedBy,
      });
    }

    const name = clean(b?.full_name, MAX_LEN.full_name);
    if (!name)
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 },
      );
    if (!SEX.includes(b?.sex))
      return NextResponse.json(
        { message: "Sex must be Male or Female" },
        { status: 400 },
      );
    const genderIdentity = String(b?.gender_identity || "").trim();
    if (genderIdentity && !GENDER_IDENTITY.includes(genderIdentity))
      return NextResponse.json(
        { message: "Gender identity must be Male, Female, or LGBTQIA+" },
        { status: 400 },
      );
    if (!PTYPE.includes(b?.participant_type))
      return NextResponse.json(
        {
          message: "Participant type must be Student, Employee, or Stakeholder",
        },
        { status: 400 },
      );
    let ageNum = null;
    if (
      b?.age !== undefined &&
      b?.age !== null &&
      String(b.age).trim() !== ""
    ) {
      ageNum = Number(b.age);
      if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120)
        return NextResponse.json(
          { message: "Age must be between 1 and 120" },
          { status: 400 },
        );
    }
    const { error: eventError } = await loadOpenEvent(event_id);
    if (eventError) return eventError;
    /* Everything the guest typed that ends up on the sheet. */
    const details = {
      full_name: name,
      sex: b.sex,
      gender_identity: genderIdentity || undefined,
      age: ageNum,
      contact: clean(b?.contact, MAX_LEN.contact),
      participant_type: b.participant_type,
      department_office_org: clean(
        b?.department_office_org,
        MAX_LEN.department_office_org,
      ),
      position_designation:
        b.participant_type === "Student"
          ? ""
          : clean(b?.position_designation, MAX_LEN.position_designation),
      program_year_section: buildProgramYearSection(b),
    };

    /* The same check-in is the same name *and* contact, participant type and
       department (data/lib/guestIdentity.js). Matching on the name alone
       stopped the second of two people who share a name from checking in.
       Rows saved before dedupe_key existed have none and are still matched by
       name until scripts/migrate-guest-dedupe-key.mjs backfills them. */
    const dedupeKey = guestDedupeKey(details);
    const existing = await EventGuest.findOne({
      event_id,
      $or: [
        { dedupe_key: dedupeKey },
        { dedupe_key: null, full_name: name },
      ],
    }).collation(NAME_COLLATION);
    return await saveCheckIn({ req, event_id, details, existing, submittedBy });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(ALREADY_SUBMITTED);
    }
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* Check-in by student/employee ID or registered email. The row is built from
   the profile, linked to the account, and still waits for organizer approval
   like every QR check-in: the scanner is anonymous and could have typed
   somebody else's ID. */
async function checkInByIdentifier({
  req,
  event_id,
  participantType,
  identifier,
  submittedBy,
}) {
  if (participantType !== STUDENT && participantType !== EMPLOYEE)
    return NextResponse.json(
      { message: "Participant type must be Student or Employee" },
      { status: 400 },
    );
  const { event, error: eventError } = await loadOpenEvent(event_id);
  if (eventError) return eventError;

  const match = await resolveProfileByIdentifier(identifier, participantType);
  if (!match)
    return NextResponse.json(
      {
        message:
          "We couldn't find a record with that ID or email. Fill in your details instead.",
        code: "NOT_FOUND",
      },
      { status: 404 },
    );

  const details = await guestDetailsFromProfile(
    match.profile,
    match.pii,
    participantType,
  );
  /* The sheet's name and Sex columns are required (Sex only takes Male /
     Female); a profile without them goes through the typed form. */
  if (!details.full_name || !details.sex)
    return NextResponse.json(
      {
        message:
          "Your record is missing some details. Please fill in the form instead.",
        code: "INCOMPLETE_PROFILE",
      },
      { status: 422 },
    );

  /* Signed-in self check-in writes Event.attended_users, which attendance
     already counts. A second (guest) row would count the person twice. */
  if (
    details.user_id &&
    (event.attended_users || []).some(
      (entry) => String(entry?.user_id) === String(details.user_id),
    )
  )
    return NextResponse.json({
      message: "You are already marked as attended for this event.",
      already_attended: true,
      validation_status: "approved",
    });

  /* Profile holders are deduped by account (unique event_id + user_id). */
  const existing = await EventGuest.findOne(
    details.user_id
      ? { event_id, user_id: details.user_id }
      : { event_id, dedupe_key: guestDedupeKey(details) },
  );
  return saveCheckIn({ req, event_id, details, existing, submittedBy });
}

/* Saves a check-in that passed validation: answers "already attended" for an
   approved row, reopens a rejected row as pending, refuses a second pending
   submission, otherwise creates a pending row. Shared by the typed form and
   the ID / email lookup. */
async function saveCheckIn({ req, event_id, details, existing, submittedBy }) {
  if (existing) {
    if (existing.validation_status === "approved") {
      return NextResponse.json({
        message: "You are already marked as attended for this event.",
        already_attended: true,
        validation_status: "approved",
        /* No timestamp: this endpoint is anonymous, and echoing when a
           named person checked in let anyone look that up. */
      });
    }
    if (existing.validation_status === "rejected") {
      /* Not approved last time — the guest resubmits on the same row, which
         keeps the rejection in its history. The save hook refreshes the
         row's dedupe_key from the new details. */
      existing.set(details);
      existing.attended_at = new Date();
      existing.source = "qr-scan";
      existing.validation_status = "pending";
      existing.validated_by = null;
      existing.validated_at = null;
      existing.validation_note = "";
      await existing.save();
      cacheDelPrefix("events:list:");
      await logActivity({
        req,
        action: "EVENT_GUEST_RESUBMIT",
        description: "Guest resubmitted a rejected QR check-in",
        resource_type: "event",
        resource_id: event_id,
        severity: "info",
        metadata: { guest_id: existing._id },
      });
      return NextResponse.json({
        message: "Your check-in was submitted for validation.",
        pending: true,
        validation_status: "pending",
        submitted_at: existing.attended_at.toISOString(),
        guest_id: existing._id,
      });
    }
    return NextResponse.json(ALREADY_SUBMITTED);
  }
  const guest = await EventGuest.create({
    event_id,
    ...details,
    attended_at: new Date(),
    source: "qr-scan",
    validation_status: "pending",
  });
  cacheDelPrefix("events:list:");
  await logActivity({
    req,
    action: "EVENT_GUEST_CHECKIN",
    description: "Guest submitted a QR check-in pending validation",
    resource_type: "event",
    resource_id: event_id,
    severity: "info",
    metadata: {
      guest_id: guest._id,
      participant_type: details.participant_type,
      matched_profile: !!details.user_id,
      validation_status: "pending",
      submitted_by: submittedBy,
    },
  });
  return NextResponse.json({
    message: "Your check-in was submitted for validation.",
    pending: true,
    validation_status: "pending",
    submitted_at: guest.attended_at.toISOString(),
    guest_id: guest._id,
  });
}
