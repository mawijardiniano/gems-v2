import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { cacheDelPrefix } from "@/lib/cache";

const SEX = ["Male", "Female"];
const PTYPE = ["Student", "Employee"];

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

export async function POST(req) {
  try {
    await connectDB();
    const b = await req.json();
    const event_id = b?.event_id;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json({ message: "Valid event_id is required" }, { status: 400 });
    }
    const name = String(b?.full_name || "").trim();
    if (!name) return NextResponse.json({ message: "Full name is required" }, { status: 400 });
    if (!SEX.includes(b?.sex))
      return NextResponse.json({ message: "Sex must be Male or Female" }, { status: 400 });
    if (!PTYPE.includes(b?.participant_type))
      return NextResponse.json({ message: "Participant type must be Student or Employee" }, { status: 400 });
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
      return NextResponse.json({
        message: "You have already been marked as attended for this event.",
        already_attended: true,
        attended_at: existing.attended_at,
      });
    }
    const guest = await EventGuest.create({
      event_id,
      full_name: name,
      sex: b.sex,
      age: ageNum,
      participant_type: b.participant_type,
      department_office_org: String(b?.department_office_org || "").trim(),
      position_designation: b.participant_type === "Student" ? "" : String(b?.position_designation || "").trim(),
      program_year_section: b.participant_type === "Student" ? String(b?.program_year_section || "").trim() : "",
      attended_at: new Date(),
      source: "qr-scan",
    });
    cacheDelPrefix("events:list:");
    await logActivity({
      req,
      action: "EVENT_ATTENDANCE",
      description: "Guest checked in to event via QR",
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: { guest_id: guest._id, participant_type: b.participant_type },
    });
    return NextResponse.json({
      message: "Attendance recorded successfully",
      attended_at: guest.attended_at.toISOString(),
      guest_id: guest._id,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({
        message: "You have already been marked as attended for this event.",
        already_attended: true,
      });
    }
    console.error(err);
    return NextResponse.json({ message: "Internal server error", error: err.message }, { status: 500 });
  }
}
