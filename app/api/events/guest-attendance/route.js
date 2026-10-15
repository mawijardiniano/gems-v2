import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { cacheDelPrefix } from "@/lib/cache";
import { optionalAuth } from "@/lib/auth";

const SEX = ["Male", "Female"];
const GENDER_IDENTITY = ["Male", "Female", "LGBTQIA+"];
const PTYPE = ["Student", "Employee", "Stakeholder"];

function windowOf(event) {
  // Date-only events: attendance is open for the whole calendar day(s).
  const dayStart = (d) => {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  };
  const dayEnd = (d) => {
    const t = new Date(d);
    t.setHours(23, 59, 59, 999);
    return t.getTime();
  };
  const s = [
    ...(event.start_date ? [dayStart(event.start_date)] : []),
    ...(event.start_dates || []).filter(Boolean).map(dayStart),
  ];
  const e = [
    ...(event.end_date ? [dayEnd(event.end_date)] : []),
    ...(event.end_dates || []).filter(Boolean).map(dayEnd),
  ];
  return {
    earliestStart: s.length ? Math.min(...s) : null,
    latestEnd: e.length ? Math.max(...e) : null,
  };
}

/* UI sends program / year / section separately; combine into one sheet value. */
function buildProgramYearSection(b) {
  if (b?.participant_type !== "Student") return "";
  const programPart = String(b?.program || b?.program_year_section || "").trim();
  const yearPart = String(b?.year || "").trim();
  const sectionPart = String(b?.section || "").trim();
  return [programPart, yearPart, sectionPart].filter(Boolean).join(" ").trim();
}

export async function POST(req) {
  try {
    await connectDB();
    /* Optional: a logged-in student scanning the same QR still goes through
       the pending flow — the identity is recorded for review only. */
    const { user: submittingUser } = await optionalAuth(req);
    const submittedBy = submittingUser?._id || null;
    const b = await req.json();
    const event_id = b?.event_id;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json({ message: "Valid event_id is required" }, { status: 400 });
    }
    const name = String(b?.full_name || "").trim();
    if (!name) return NextResponse.json({ message: "Full name is required" }, { status: 400 });
    if (!SEX.includes(b?.sex))
      return NextResponse.json({ message: "Sex must be Male or Female" }, { status: 400 });
    const genderIdentity = String(b?.gender_identity || "").trim();
    if (genderIdentity && !GENDER_IDENTITY.includes(genderIdentity))
      return NextResponse.json({ message: "Gender identity must be Male, Female, or LGBTQIA+" }, { status: 400 });
    if (!PTYPE.includes(b?.participant_type))
      return NextResponse.json({ message: "Participant type must be Student, Employee, or Stakeholder" }, { status: 400 });
    let ageNum = null;
    if (b?.age !== undefined && b?.age !== null && String(b.age).trim() !== "") {
      ageNum = Number(b.age);
      if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120)
        return NextResponse.json({ message: "Age must be between 1 and 120" }, { status: 400 });
    }
    const event = await Event.findById(event_id);
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });
    if (event.status === "cancelled")
      return NextResponse.json({ message: "This event has been cancelled.", code: "EVENT_CANCELLED" }, { status: 400 });
    const now = Date.now();
    const { earliestStart, latestEnd } = windowOf(event);
    if (earliestStart !== null && now < earliestStart)
      return NextResponse.json({ message: "Attendance is not yet open. The event has not started yet.", code: "EVENT_NOT_STARTED" }, { status: 400 });
    if (latestEnd !== null && now > latestEnd)
      return NextResponse.json({ message: "The QR code has expired. This event has already ended.", code: "EVENT_EXPIRED" }, { status: 400 });
    const existing = await EventGuest.findOne({ event_id, full_name: name });
    if (existing) {
      if (existing.validation_status === "approved") {
        return NextResponse.json({
          message:
            "You are already marked as attended for this event.",
          already_attended: true,
          validation_status: "approved",
          attended_at: existing.attended_at,
        });
      }
      if (existing.validation_status === "rejected") {
        /* Not approved last time — let the guest resubmit on the same row so
           the unique event_id + full_name index still holds. */
        existing.sex = b.sex;
        existing.gender_identity = genderIdentity || undefined;
        existing.age = ageNum;
        existing.contact = String(b?.contact || "").trim();
        existing.participant_type = b.participant_type;
        existing.department_office_org = String(
          b?.department_office_org || "",
        ).trim();
        existing.position_designation =
          b.participant_type === "Student"
            ? ""
            : String(b?.position_designation || "").trim();
        existing.program_year_section = buildProgramYearSection(b);
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
        submitted_at: existing.attended_at,
      });
    }
    const guest = await EventGuest.create({
      event_id,
      full_name: name,
      sex: b.sex,
      gender_identity: genderIdentity || undefined,
      age: ageNum,
      contact: String(b?.contact || "").trim(),
      participant_type: b.participant_type,
      department_office_org: String(b?.department_office_org || "").trim(),
      position_designation: b.participant_type === "Student" ? "" : String(b?.position_designation || "").trim(),
      program_year_section: buildProgramYearSection(b),
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
    return NextResponse.json({ message: "Internal server error", error: err.message }, { status: 500 });
  }
}