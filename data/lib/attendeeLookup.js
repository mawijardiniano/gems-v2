import GemsProfile from "@/models/profile";
import UserAuth from "@/models/user";
import { blindIndex } from "@/data/lib/identityVault";
import { loadDecryptedPii } from "@/data/lib/profileBroker";
import { appParts } from "@/data/lib/appTime";
import { attendanceWindow } from "@/data/lib/eventStatus";

/* Turning a GEMS profile into an attendance-sheet row. Shared by the
   organizer's manual encode (guests/manual) and the public QR form, where a
   student or employee types only their ID number or registered email and the
   rest of the row is filled from their profile. */

export const STUDENT = "Student";
export const EMPLOYEE = "Employee";

const GENDER_IDENTITY = ["Male", "Female", "LGBTQIA+"];

/* Guest sheets store the contact number under `contact`. */
export function contactOf(profile) {
  return String(
    profile?.contact?.mobileNumber || profile?.contact?.phoneNumber || "",
  ).trim();
}

/* QR rows keep "Program Year Section" in one string; mirror that shape. */
export function programYearSectionOf(profile) {
  const academic = profile?.affiliation?.academic_information || {};
  const program = String(academic.course || "").trim();
  const year = String(academic.year_level || "").trim();
  return [program, year].filter(Boolean).join(" ");
}

export function departmentOf(profile, participantType) {
  if (participantType === STUDENT) {
    return String(
      profile?.affiliation?.academic_information?.college || "",
    ).trim();
  }
  return String(
    profile?.affiliation?.employment_information?.office || "",
  ).trim();
}

export function positionOf(profile, participantType) {
  if (participantType === STUDENT) return "";
  const employment = profile?.affiliation?.employment_information || {};
  return String(
    employment.employment_status ||
      employment.employment_appointment_status ||
      "",
  ).trim();
}

/* Age on today's Manila date. Both dates as Manila days: the server's own
   calendar (UTC) made a birthday on the event day read one year young until
   08:00 Manila. Null when unknown or outside the sheet's 1-120 range. */
export function ageOnAppDay(birthday) {
  const date = birthday ? new Date(birthday) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const born = appParts(date);
  const today = appParts(Date.now());
  if (!born || !today) return null;
  let age = today.year - born.year;
  if (
    today.month < born.month ||
    (today.month === born.month && today.day < born.day)
  )
    age -= 1;
  return age < 1 || age > 120 ? null : age;
}

/**
 * Why the public QR form is closed for this event right now, or null when it
 * is open. Shared by the check-in and the ID lookup so both refuse the same
 * cancelled / not-started / ended events.
 * @returns {{ message: string, code: string }|null}
 */
export function checkInClosedReason(event, now = Date.now()) {
  if (event?.status === "cancelled")
    return { message: "This event has been cancelled.", code: "EVENT_CANCELLED" };
  const { earliestStart, latestEnd } = attendanceWindow(event);
  if (earliestStart !== null && now < earliestStart)
    return {
      message: "Attendance is not yet open. The event has not started yet.",
      code: "EVENT_NOT_STARTED",
    };
  if (latestEnd !== null && now > latestEnd)
    return {
      message: "The QR code has expired. This event has already ended.",
      code: "EVENT_EXPIRED",
    };
  return null;
}

/* Bounds what a public caller can push through the lookup. */
const MAX_IDENTIFIER = 120;

/**
 * Finds the one profile a QR scanner means by their ID number or registered
 * email, restricted to the participant type they picked. Returns null for no
 * match, more than one match, or a type mismatch: the public form must not be
 * able to tell those apart.
 *
 * @param {string} identifier student/employee ID, or an email
 * @param {"Student"|"Employee"} participantType
 * @returns {Promise<{ profile: object, pii: object|null }|null>}
 */
export async function resolveProfileByIdentifier(identifier, participantType) {
  const value = String(identifier ?? "").trim().slice(0, MAX_IDENTIFIER);
  if (!value) return null;
  if (participantType !== STUDENT && participantType !== EMPLOYEE) return null;

  let query;
  if (value.includes("@")) {
    /* Emails are encrypted; the profile carries an HMAC of the whole,
       lowercased address (identityVault.buildSearchIndex). */
    const digest = blindIndex(value.toLowerCase());
    if (!digest) return null;
    query = { profileSearchIndex: digest };
  } else if (participantType === STUDENT) {
    query = { "affiliation.academic_information.student_id": value };
  } else {
    query = { "affiliation.employment_information.employee_id": value };
  }

  const matches = await GemsProfile.find({
    ...query,
    "affiliation.person_type": participantType,
  })
    .limit(2)
    .lean();
  if (matches.length !== 1) return null;

  const [profile] = matches;
  const pii = profile.vaultRef ? await loadDecryptedPii(profile.vaultRef) : null;
  return { profile, pii };
}

/**
 * The attendance-sheet fields for a resolved profile. The contact number is
 * left empty: the QR form is anonymous, so nothing it saves may be read back
 * as somebody's phone number.
 */
export async function guestDetailsFromProfile(profile, pii, participantType) {
  const first = String(pii?.first_name || "").trim();
  const last = String(pii?.last_name || "").trim();
  const sex = String(pii?.sexAtBirth || "").trim();
  const gender = String(pii?.gender_preference || "").trim();
  const account = await UserAuth.findOne({ personal_info_id: profile._id })
    .select("_id username")
    .lean();

  return {
    user_id: account?._id || null,
    full_name:
      [first, last].filter(Boolean).join(" ") ||
      String(account?.username || "").trim(),
    sex: sex === "Male" || sex === "Female" ? sex : "",
    gender_identity: GENDER_IDENTITY.includes(gender) ? gender : undefined,
    age: ageOnAppDay(pii?.birthday),
    contact: "",
    participant_type: participantType,
    department_office_org: departmentOf(profile, participantType),
    position_designation: positionOf(profile, participantType),
    program_year_section:
      participantType === STUDENT ? programYearSectionOf(profile) : "",
  };
}

/* What the scanner sees to confirm "is this you?": full name, sex, and the
   college/office and program or position.

   Privacy trade-off, chosen deliberately: this is a public page, so anyone
   who types a valid ID or email during an open event sees that person's
   full name. It was initials only; the product owner asked for the full
   name so people recognise themselves. The only controls are the rate limit
   (rateLimiters.guestLookup*) and the open attendance window. Revisit with
   the DPO if the privacy notice does not cover it. */
export function confirmPreview(details) {
  return {
    displayName: details.full_name || "Record found",
    sex: details.sex || "",
    department: details.department_office_org || "",
    program:
      details.participant_type === STUDENT
        ? details.program_year_section
        : details.position_designation,
  };
}
