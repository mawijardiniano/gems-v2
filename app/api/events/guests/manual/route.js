import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/data/lib/auth";
import { logActivity } from "@/data/lib/activityLog";
import { cacheDelPrefix } from "@/data/lib/cache";
import {
  canViewPII,
  loadDecryptedPii,
  revealProfilePii,
} from "@/data/lib/profileBroker";
import { isEventOrganizer } from "@/data/lib/eventAccess";
import {
  STUDENT,
  EMPLOYEE,
  ageOnAppDay,
  contactOf,
  departmentOf,
  positionOf,
  programYearSectionOf,
} from "@/data/lib/attendeeLookup";
import { sameNameRows } from "@/data/lib/guestIdentity";

/* Organizers record a profile holder's attendance without a QR scan. The row
   is written straight to EventGuest as APPROVED so it lands in the same table,
   counters, prints and reports as QR check-ins — the Attendance tab only ever
   reads EventGuest. Detail fields are copied from the profile so the person's
   name, sex, age and office match every other attendance view. */

/* Note stamped on every row an organizer records by hand. A constant so the
   adopt/encode paths and the payload's pre-filled fields can never drift. */
const VALIDATION_NOTE = "Recorded manually by organizer";

/* contactOf / programYearSectionOf / departmentOf / positionOf live in
   data/lib/attendeeLookup, shared with the public QR form's ID lookup. */

/* How the existing row got onto the sheet, for the organizer's message. */
function viaText(row) {
  if (row?.source === "account-check-in") return " through the QR code (signed in)";
  if (row?.source === "manual-encode") return " by manual encode";
  return " through the QR code";
}

/* The answer when the person is already on the sheet. Manual encode used to
   save over the existing row instead: it re-approved a pending or rejected QR
   check-in (silently undoing the organizer's rejection), relabelled it as a
   manual record and replied "Attendance recorded successfully", which read as
   a second entry. Now nothing is written; a pending or rejected row is decided
   with the Approve button on that row. */
function alreadyOnList(name, row, code = "ALREADY_ON_LIST") {
  const status = row?.validation_status || "approved";
  const via = viaText(row);
  const statusText =
    status === "approved"
      ? "approved"
      : status === "pending"
        ? "pending"
        : "not approved";
  const message =
    code === "SAME_NAME_ON_LIST"
      ? `A QR check-in named ${name} is already on the list (${statusText}). If that is a different person with the same name, choose "Record as a different person".`
      : status === "approved"
      ? `${name} is already on the attendance list${via}.`
      : status === "pending"
        ? `${name} already checked in${via} and is waiting for approval. Approve their row in the Pending tab instead.`
        : `${name} already has a check-in${via} that was not approved. If they did attend, approve it in the Not approved tab.`;
  return NextResponse.json(
    {
      message,
      code,
      already_attended: status === "approved",
      guest_id: row?._id || null,
      validation_status: status,
    },
    { status: 409 },
  );
}

/* QR walk-in rows (no account) that look like this person: same name with
   case and spacing ignored, and a sex at birth that agrees. The old check
   compared the exact name, so "Juan  Dela Cruz" or a different capital let a
   second row through. */
async function findSameNameWalkIns(event_id, fullName, sex) {
  if (!fullName) return [];
  const rows = await EventGuest.find({ event_id, user_id: null })
    .select("full_name sex validation_status source")
    .lean();
  return sameNameRows(rows, { full_name: fullName, sex });
}

export async function POST(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const body = await req.json();
    const event_id = body?.event_id;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id))
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );

    const user_id = body?.user_id;
    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id))
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 },
      );

    const event = await Event.findById(event_id)
      .select("created_by status attended_users.user_id")
      .lean();
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });

    if (!isEventOrganizer(user, event))
      return NextResponse.json(
        { message: "You are not allowed to record attendance for this event." },
        { status: 403 },
      );

    if (event.status === "cancelled")
      return NextResponse.json(
        {
          message: "This event has been cancelled, so attendance is closed.",
          code: "EVENT_CANCELLED",
        },
        { status: 400 },
      );

    const account = await UserAuth.findById(user_id)
      .select("username personal_info_id")
      .lean();
    if (!account)
      return NextResponse.json(
        { message: "The selected account no longer exists." },
        { status: 404 },
      );

    const profile = account.personal_info_id
      ? await Profile.findById(account.personal_info_id).lean()
      : null;
    if (!profile)
      return NextResponse.json(
        {
          message:
            "That account has no profile record, so attendance cannot be recorded.",
        },
        { status: 400 },
      );

    /* The name, sex-at-birth, birthday and contact below live in the vault, not
       on the GEMS document: reading the legacy columns would come back empty
       once they are stripped and every manual record would be rejected for
       "no sex at birth on record". The organizer recording the row is acting
       in an official capacity, so the identity is revealed through the broker
       rather than masked, and the values are overlaid onto the profile so the
       helpers below read the same shape they always did. `affiliation` and
       `personal.currentStatus` are GEMS-owned and stay as they are. */
    const pii = profile.vaultRef
      ? await loadDecryptedPii(profile.vaultRef)
      : null;
    const revealed = pii ? revealProfilePii(pii) : null;
    /* Only non-null vault values overlay the legacy ones, so a partially filled
       vault row cannot erase a value that is still present mid-migration. */
    const overlay = (base, resolved) => {
      const out = { ...(base || {}) };
      for (const [key, value] of Object.entries(resolved || {})) {
        if (value !== null && value !== undefined) out[key] = value;
      }
      return out;
    };
    const identity = {
      ...profile,
      personal: overlay(profile.personal, revealed?.personal),
      gadData: overlay(profile.gadData, revealed?.gadData),
      contact: overlay(profile.contact, revealed?.contact),
    };

    /* Identity fields may arrive in the body, looked up by the organizer's
       client. The profile record stays the source of truth for whatever it
       holds, and the body only fills its gaps. */
    const bodyFullName = String(body?.full_name || "").trim();
    const bodySex = String(body?.sex || "").trim();
    const bodyContact = String(body?.contact || "").trim();

    const personal = identity.personal || {};
    const fullName =
      `${personal.first_name || ""} ${personal.last_name || ""}`.trim() ||
      String(account.username || "").trim() ||
      bodyFullName;

    /* The sheet's Sex column only accepts Male / Female. A profile without one
       still has a last resort: the sex the organizer's client looked up, so a
       pick whose record is not covered by the manual-encode search payload can
       still be recorded. */
    const sexAtBirth = String(
      identity?.gadData?.sexAtBirth || bodySex || "",
    ).trim();
    if (sexAtBirth !== "Male" && sexAtBirth !== "Female")
      return NextResponse.json(
        {
          message: `${
            fullName || "This person"
          } has no sex at birth on record, so the attendance sheet cannot include them.`,
        },
        { status: 400 },
      );

    /* Manual encoding covers students and employees; stakeholders have no
       profile record. */
    /* `affiliation.person_type` first: the profile schema no longer has a
       `personal` block, so `currentStatus` is empty on stripped profiles and
       every student was recorded as an employee with no college. */
    const participantType =
      String(
        identity?.affiliation?.person_type || personal.currentStatus || "",
      ).trim() === STUDENT
        ? STUDENT
        : EMPLOYEE;

    /* The sheet needs the name and sex. The contact number and birthday
       are only copied from the person's record for organizers cleared to
       read personal data; any event organizer could pick any account and
       read both back from the guest sheet. Others type the contact
       themselves (or leave it blank) and the age stays empty. */
    const mayCopyPersonalData = canViewPII(user.role);

    /* Age on today's Manila date (attendeeLookup.ageOnAppDay); empty for
       organizers not cleared to read the birthday. */
    const age =
      mayCopyPersonalData && personal.birthday
        ? ageOnAppDay(personal.birthday)
        : null;

    const payload = {
      event_id,
      full_name: fullName,
      sex: sexAtBirth,
      age,
      contact: (mayCopyPersonalData && contactOf(identity)) || bodyContact,
      participant_type: participantType,
      department_office_org: departmentOf(identity, participantType),
      position_designation: positionOf(identity, participantType),
      program_year_section:
        participantType === STUDENT ? programYearSectionOf(identity) : "",
      /* Set on the created row so the Attendance table can say where the row
         came from and who signed it off. */
      validation_status: "approved",
      validated_by: user._id,
      validated_at: new Date(),
      validation_note: VALIDATION_NOTE,
    };

    const name = fullName || "This person";

    /* Signed in and scanned the QR: Event.attended_users. The Attendance tab
       already shows that check-in as a row (useEventAttendance), so a manual
       record would be the same person twice. */
    const checkedInById = (event.attended_users || []).some(
      (entry) => String(entry?.user_id) === String(user_id),
    );
    if (checkedInById)
      return alreadyOnList(name, {
        source: "account-check-in",
        validation_status: "approved",
      });

    /* A row already linked to this account: an earlier manual encode, or a QR
       check-in by ID number / email. Any status counts. */
    const existing = await EventGuest.findOne({ event_id, user_id })
      .select("validation_status source")
      .lean();
    if (existing) return alreadyOnList(name, existing);

    /* A QR walk-in typed with this person's name. The organizer may confirm
       it is a different person who shares the name (`confirm_different_person`),
       the one case a same-name row is not this person. */
    if (body?.confirm_different_person !== true) {
      const [walkIn] = await findSameNameWalkIns(event_id, fullName, sexAtBirth);
      if (walkIn) return alreadyOnList(name, walkIn, "SAME_NAME_ON_LIST");
    }

    let guest;
    try {
      guest = await EventGuest.create({
        ...payload,
        user_id,
        attended_at: new Date(),
        source: "manual-encode",
      });
    } catch (err) {
      /* Two requests for the same account raced (unique event_id + user_id). */
      if (err?.code === 11000) {
        const clash = await EventGuest.findOne({ event_id, user_id })
          .select("validation_status source")
          .lean();
        if (clash) return alreadyOnList(name, clash);
      }
      throw err;
    }

    cacheDelPrefix("events:list:");
    await logActivity({
      req,
      action: "EVENT_ATTENDANCE_MANUAL",
      description: "Organizer manually recorded attendance",
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: {
        guest_id: guest._id,
        user_id,
        participant_type: participantType,
      },
    });

    return NextResponse.json({
      message: "Attendance recorded successfully",
      guest_id: guest._id,
      validation_status: "approved",
      attended_at: guest.attended_at,
    });
  } catch (err) {
    console.error("POST /api/events/guests/manual failed:", err);
    return NextResponse.json(
      { message: "Unable to record attendance." },
      { status: 500 },
    );
  }
}
