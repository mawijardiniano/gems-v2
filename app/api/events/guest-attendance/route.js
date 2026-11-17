import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/data/lib/activityLog";
import { cacheDelPrefix } from "@/data/lib/cache";
import { optionalAuth } from "@/data/lib/auth";
import { attendanceWindow } from "@/data/lib/eventStatus";
import { rateLimiters } from "@/data/lib/rateLimit";
import { guestDedupeKey } from "@/data/lib/guestIdentity";

const SEX = ["Male", "Female"];
const GENDER_IDENTITY = ["Male", "Female", "LGBTQIA+"];
const PTYPE = ["Student", "Employee", "Stakeholder"];

/* The open/close window comes from lib/eventStatus — this route used to carry
   its own copy, subtly different from the one in the signed-in attendance route
   and from the badge on the manage list. */

/* This form is public and its values end up on the printed attendance sheet,
   so every free-text field is bounded and whitespace is collapsed. */
const MAX_LEN = {
  full_name: 120,
  contact: 30,
  department_office_org: 200,
  position_designation: 200,
  program_year_section: 200,
};
const clean = (value, max) =>
  String(value ?? "")
    .replace(/s+/g, " ")
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
    const event = await Event.findById(event_id)
      .select("status start_date end_date start_dates end_dates date")
      .lean();
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    if (event.status === "cancelled")
      return NextResponse.json(
        { message: "This event has been cancelled.", code: "EVENT_CANCELLED" },
        { status: 400 },
      );
    const now = Date.now();
    const { earliestStart, latestEnd } = attendanceWindow(event);
    if (earliestStart !== null && now < earliestStart)
      return NextResponse.json(
        {
          message: "Attendance is not yet open. The event has not started yet.",
          code: "EVENT_NOT_STARTED",
        },
        { status: 400 },
      );
    if (latestEnd !== null && now > latestEnd)
      return NextResponse.json(
        {
          message: "The QR code has expired. This event has already ended.",
          code: "EVENT_EXPIRED",
        },
        { status: 400 },
      );
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
      return NextResponse.json({
        message:
          "You have already submitted a check-in for this event. Please wait for the organizer to validate it.",
        already_submitted: true,
        validation_status: "pending",
      });
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
        participant_type: b.participant_type,
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
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({
        message:
          "You have already submitted a check-in for this event. Please wait for the organizer to validate it.",
        already_submitted: true,
        validation_status: "pending",
      });
    }
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
