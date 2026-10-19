import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { cacheDelPrefix } from "@/lib/cache";
import { loadDecryptedPii, revealProfilePii } from "@/lib/profileBroker";
import { isEventOrganizer } from "../route";

/* Organizers record a profile holder's attendance without a QR scan. The row
   is written straight to EventGuest as APPROVED so it lands in the same table,
   counters, prints and reports as QR check-ins — the Attendance tab only ever
   reads EventGuest. Detail fields are copied from the profile so the person's
   name, sex, age and office match every other attendance view. */

const STUDENT = "Student";
const EMPLOYEE = "Employee";

/* Note stamped on every row an organizer records by hand. A constant so the
   adopt/encode paths and the payload's pre-filled fields can never drift. */
const VALIDATION_NOTE = "Recorded manually by organizer";

/* Guest sheets store the contact number under `contact`. */
function contactOf(profile) {
  return String(
    profile?.contact?.mobileNumber || profile?.contact?.phoneNumber || "",
  ).trim();
}

/* QR rows keep "Program Year Section" in one string; mirror that shape. */
function programYearSectionOf(profile) {
  const academic = profile?.affiliation?.academic_information || {};
  const program = String(academic.course || "").trim();
  const year = String(academic.year_level || "").trim();
  return [program, year].filter(Boolean).join(" ");
}

function departmentOf(profile, participantType) {
  if (participantType === STUDENT) {
    return String(
      profile?.affiliation?.academic_information?.college || "",
    ).trim();
  }
  return String(
    profile?.affiliation?.employment_information?.office || "",
  ).trim();
}

function positionOf(profile, participantType) {
  if (participantType === STUDENT) return "";
  const employment = profile?.affiliation?.employment_information || {};
  return String(
    employment.employment_status ||
      employment.employment_appointment_status ||
      "",
  ).trim();
}

/* A person who already scanned the QR lives only in Event.attended_users, which
   the Attendance table never renders. When an organizer re-records them we copy
   their profile into an approved EventGuest row so they finally appear in the
   table, prints and reports. Returns null when the write is impossible, and
   never throws: the QR check-in already counted them, so a failure here must not
   turn a valid state into an error. */
async function adoptCheckedInGuest({
  event_id,
  user_id,
  payload,
  fullName,
  organizerId,
  noteOverride,
}) {
  /* The organizer is recording this person right now, so the row must end up
     approved whether it already existed or is created here. Returning an
     existing pending / rejected row untouched was the bug that left the
     attendance table looking empty while Insights had already counted the
     check-in in Event.attended_users. */
  const note = noteOverride || VALIDATION_NOTE;
  const approve = (doc) =>
    EventGuest.findByIdAndUpdate(
      doc._id,
      {
        $set: {
          ...payload,
          user_id,
          source: "manual-encode",
          validation_status: "approved",
          validated_by: organizerId,
          validated_at: new Date(),
          validation_note: note,
        },
      },
      { new: true },
    );

  try {
    const byAccount = await EventGuest.findOne({ event_id, user_id });
    if (byAccount) return await approve(byAccount);
    if (fullName) {
      const byName = await EventGuest.findOne({ event_id, full_name: fullName });
      if (byName) return await approve(byName);
    }
    return await EventGuest.create({
      ...payload,
      user_id,
      attended_at: new Date(),
      source: "manual-encode",
      validation_status: "approved",
      validated_by: organizerId,
      validated_at: new Date(),
      validation_note: "Adopted from QR check-in by organizer",
    });
  } catch (err) {
    /* A row already holds this name or this account. Either unique index can
       raise 11000 — the account index when the organizer records the same
       person twice, the name index when a QR walk-in shares the name. Fetch
       whichever row exists and promote it, so the caller can report it as
       already attended *and* the row is visible in the attendance table. */
    if (err?.code === 11000) {
      const byAccount = await EventGuest.findOne({ event_id, user_id });
      if (byAccount) return await approve(byAccount);
      if (fullName) {
        const byName = await EventGuest.findOne({ event_id, full_name: fullName });
        if (byName) return await approve(byName);
      }
      return null;
    }
    console.error("adoptCheckedInGuest error:", err);
    return null;
  }
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
    const pii = profile.vaultRef ? await loadDecryptedPii(profile.vaultRef) : null;
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

    /* Identity fields may arrive in the body: when the picked person shares a
       name with a QR walk-in, the API adopts that row and these values complete
       it instead of leaving the row half-blank. The profile record stays the
       source of truth for whatever it holds, and the body only fills its gaps. */
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
    const participantType =
      String(personal.currentStatus || "").trim() === STUDENT
        ? STUDENT
        : EMPLOYEE;

    const birthday = personal.birthday ? new Date(personal.birthday) : null;
    let age = null;
    if (birthday && !Number.isNaN(birthday.getTime())) {
      const now = new Date();
      age = now.getFullYear() - birthday.getFullYear();
      const m = now.getMonth() - birthday.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age -= 1;
      if (age < 1 || age > 120) age = null;
    }

    const payload = {
      event_id,
      full_name: fullName,
      sex: sexAtBirth,
      age,
      contact: contactOf(identity) || bodyContact,
      participant_type: participantType,
      department_office_org: departmentOf(identity, participantType),
      position_designation: positionOf(identity, participantType),
      program_year_section:
        participantType === STUDENT ? programYearSectionOf(identity) : "",
      /* Set for an adopted / created row so the Attendance table can say where
         the row came from and who signed it off. */
      validation_status: "approved",
      validated_by: organizerId,
      validated_at: new Date(),
      validation_note: VALIDATION_NOTE,
    };
    const note = VALIDATION_NOTE;


    /* The person may already have checked in through the QR flow, which writes
       Event.attended_users. Attendance counts that list plus approved guests,
       so we must NOT add a second row here — but returning a bare "already
       attended" leaves the organizer staring at a table with no such row,
       because the table only renders EventGuest. Instead, adopt the check-in
       into the guest sheet so the person becomes visible and printable, then
       tell the caller it was already attended. */
    const checkedInById = (event.attended_users || []).some(
      (entry) => String(entry?.user_id) === String(user_id),
    );
    if (checkedInById) {
      const adopted = await adoptCheckedInGuest({
        event_id,
        user_id,
        payload,
        fullName,
        organizerId: user._id,
        noteOverride: "Adopted from QR check-in by organizer",
      });
      if (adopted) {
        cacheDelPrefix("events:list:");
        await logActivity({
          req,
          action: "EVENT_ATTENDANCE_MANUAL",
          description:
            "Organizer adopted an existing QR check-in into the attendance sheet",
          resource_type: "event",
          resource_id: event_id,
          severity: "info",
          metadata: { guest_id: adopted._id, user_id, adopted_from: "qr-check-in" },
        });
        return NextResponse.json({
          message: "Already checked in — added to the attendance sheet",
          already_attended: true,
          source: "checked-in",
          guest_id: adopted._id,
          adopted: true,
          validation_status: adopted.validation_status,
        });
      }
      /* Adopting is best-effort: if the guest sheet can't take the row the
         write still happened once (in attended_users), so report it plainly. */
      return NextResponse.json({
        message: "Already marked as attended",
        already_attended: true,
        source: "checked-in",
      });
    }

    /* Profile holders are deduped by account; QR rows by name. An existing row
       may still be pending / rejected from an earlier QR submission, so it is
       promoted to approved here — otherwise the organizer records the person
       and the attendance table (approved queue) keeps hiding them. */
    const existing = await EventGuest.findOne({ event_id, user_id });
    if (existing) {
      const promoted = await EventGuest.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            ...payload,
            user_id,
            source: "manual-encode",
            /* Forced, not inherited: a pending / rejected row must become
               approved, otherwise the organizer's own write stays hidden. */
            validation_status: "approved",
            validated_by: user._id,
            validated_at: new Date(),
            validation_note: note,
          },
        },
        { new: true },
      );
      return NextResponse.json({
        message: "Attendance recorded successfully",
        already_attended: promoted.validation_status === "approved",
        adopted: true,
        guest_id: promoted._id,
        validation_status: promoted.validation_status,
        attended_at: promoted.attended_at,
      });
    }

    /* A QR walk-in may already hold this name. Attach the account to that row
       and approve it so the person the organizer picked is the one the table
       shows, rather than creating a duplicate the name index would reject. */
    const nameRow = fullName
      ? await EventGuest.findOne({ event_id, full_name: fullName })
      : null;
    if (nameRow) {
      /* The adopted row is still a manual record: it keeps the provenance the
         table reads, not the QR row's original note. */
      const promoted = await EventGuest.findByIdAndUpdate(
        nameRow._id,
        {
          $set: {
            ...payload,
            user_id,
            attended_at: nameRow.attended_at || new Date(),
            source: "manual-encode",
            validated_by: user._id,
            validated_at: new Date(),
            validation_note: "Linked to a profile by organizer",
          },
        },
        { new: true },
      );
      if (promoted) {
        cacheDelPrefix("events:list:");
        await logActivity({
          req,
          action: "EVENT_ATTENDANCE_MANUAL",
          description:
            "Organizer linked a QR guest row to a profile and approved it",
          resource_type: "event",
          resource_id: event_id,
          severity: "info",
          metadata: { guest_id: promoted._id, user_id, linked_existing: true },
        });
        return NextResponse.json({
          message: "Attendance recorded successfully",
          already_attended: true,
          adopted: true,
          guest_id: promoted._id,
          validation_status: "approved",
          attended_at: promoted.attended_at,
        });
      }
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
      /* A QR walk-in with the same name already covers this event. */
      if (err?.code === 11000) {
        const clash = await EventGuest.findOne({
          event_id,
          full_name: fullName,
        });
        if (clash?.validation_status === "approved") {
          return NextResponse.json({
            message: "Already marked as attended",
            already_attended: true,
            adopted: true,
            guest_id: clash._id,
            validation_status: clash.validation_status,
            attended_at: clash.attended_at,
          });
        }
        const promoted = clash
          ? await EventGuest.findByIdAndUpdate(
              clash._id,
              {
                $set: {
                  ...payload,
                  user_id,
                  attended_at: new Date(),
                  source: "manual-encode",
                },
              },
              { new: true },
            )
          : null;
        if (promoted) {
          cacheDelPrefix("events:list:");
          await logActivity({
            req,
            action: "EVENT_ATTENDANCE_MANUAL",
            description: "Organizer manually approved an existing guest row",
            resource_type: "event",
            resource_id: event_id,
            severity: "info",
            metadata: { guest_id: promoted._id, user_id },
          });
          return NextResponse.json({
            message: "Attendance recorded successfully",
            adopted: true,
            guest_id: promoted._id,
            validation_status: "approved",
            attended_at: promoted.attended_at,
          });
        }
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
      { message: "Unable to record attendance.", error: err.message },
      { status: 500 },
    );
  }
}
