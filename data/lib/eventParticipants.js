/* Who counts as a participant of an event. Pure: runs in routes, reports
   and React components alike.

   Attendance lives in two places: Event.attended_users (signed-in QR
   check-ins) and the guest sheet (EventGuest rows: public QR check-ins and
   organizer-encoded people). Report figures used to read only the first,
   so an event with 80 approved walk-ins showed 0 participants on the GAD-AR.

   Same rule as the event page (events-list/[id]/hooks/useEventAttendance):
   - an account check-in counts unless that account is on the guest sheet
     (the sheet row is the organizer's record and decides);
   - guest rows count when approved (rows older than validation count too).

   Server routes attach an event's sheet as `event.guest_rows`
   (data/lib/eventGuestRows.js). Without it, only account check-ins count. */

const asList = (value) => (Array.isArray(value) ? value : []);

export const isApprovedGuest = (g) =>
  !g?.validation_status || g.validation_status === "approved";

/* The account id of an attendance entry: a string, an ObjectId, or a
   populated user's `_id`. A populated object without `_id` has none. */
const accountIdOf = (entry) => {
  const ref = entry?.user_id;
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if (ref._id) return String(ref._id);
  if (typeof ref.toHexString === "function") return ref.toHexString();
  return null;
};

/**
 * @param {object} event  with `attended_users` and optional `guest_rows`
 * @returns {{ accounts: object[], approvedGuests: object[], total: number }}
 *   `accounts` are the attended_users entries not covered by the sheet;
 *   `approvedGuests` are the sheet rows that count.
 */
export function eventAttendanceParts(event) {
  const guests = asList(event?.guest_rows);
  const sheetAccounts = new Set(
    guests.map((g) => g?.user_id).filter(Boolean).map(String),
  );
  /* The check-in route never pushes an account twice ($ne guard), so the
     list is not deduplicated again here. An entry without an account id
     cannot be matched to the sheet; it still counts, as it always did. */
  const accounts = asList(event?.attended_users).filter((entry) => {
    if (!entry) return false;
    const id = accountIdOf(entry);
    return !id || !sheetAccounts.has(id);
  });
  const approvedGuests = guests.filter(isApprovedGuest);
  return {
    accounts,
    approvedGuests,
    total: accounts.length + approvedGuests.length,
  };
}

/** Number of participants of one event. */
export const participantCount = (event) => eventAttendanceParts(event).total;

/** "female" | "male" | null for an account entry's populated profile. */
export const accountSex = (entry) => {
  const user = entry?.user_id || entry;
  const sex = user?.personal_info_id?.gadData?.sexAtBirth;
  return normalizeSex(sex);
};

/** "female" | "male" | null for a guest row. */
export const guestSex = (row) => normalizeSex(row?.sex);

function normalizeSex(value) {
  const s = String(value || "").trim().toLowerCase();
  return s === "female" || s === "male" ? s : null;
}
