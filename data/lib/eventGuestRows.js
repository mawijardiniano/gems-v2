import EventGuest from "@/models/eventGuest";

/* The guest-sheet fields the participant math reads (see
   data/lib/eventParticipants.js). Names and contacts stay out. */
const GUEST_ROW_FIELDS = "event_id user_id sex participant_type validation_status";

/**
 * Loads the guest sheets of `events` in one query and attaches each event's
 * rows as `guest_rows`. Works on lean objects and on Mongoose documents
 * (where a plain assignment to a field outside the schema is dropped from
 * the JSON). Mutates and returns `events`.
 */
export async function attachGuestRows(events) {
  /* Populated events only: a bare ObjectId also answers to `_id`. */
  const list = (Array.isArray(events) ? events : []).filter(
    (ev) =>
      ev &&
      typeof ev === "object" &&
      ev._id &&
      (ev.title !== undefined || ev.attended_users !== undefined),
  );
  if (!list.length) return events;

  const rows = await EventGuest.find({
    event_id: { $in: list.map((ev) => ev._id) },
  })
    .select(GUEST_ROW_FIELDS)
    .lean();

  const byEvent = new Map();
  for (const row of rows) {
    const key = String(row.event_id);
    if (!byEvent.has(key)) byEvent.set(key, []);
    byEvent.get(key).push({
      user_id: row.user_id ? String(row.user_id) : null,
      sex: row.sex || null,
      participant_type: row.participant_type || null,
      validation_status: row.validation_status ?? null,
    });
  }

  for (const ev of list) {
    const guestRows = byEvent.get(String(ev._id)) || [];
    if (typeof ev.set === "function") {
      ev.set("guest_rows", guestRows, { strict: false });
    } else {
      ev.guest_rows = guestRows;
    }
  }
  return events;
}
