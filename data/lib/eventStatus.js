/**
 * Event lifecycle rules.
 *
 * An event stores one of three values (`active`, `cancelled`, `completed`), but
 * what the organiser and the public need to see is a *phase*: has it started,
 * is it running, is it over, was it called off. That phase used to be worked
 * out separately in five places — the manage list badge, the discover page, the
 * `/api/events/upcoming` filter and the two attendance windows — and they did
 * not agree. In particular the manage list ignored `status` entirely, so a
 * cancelled event with a future date still read "Upcoming" there while the
 * discover page showed a red "Cancelled" banner for the same record.
 *
 * Everything that needs to know "where is this event in time" now asks this
 * module, the same way `lib/gpbStatus.js` is the single place GPB status rules
 * live.
 *
 * `completed` is *derived*, never required: an event whose end date has passed
 * reads as completed whether or not anything wrote the value back to Mongo.
 * That keeps reports and `/api/events/upcoming` honest without a scheduler
 * (this app has none — `next.config.mjs` declares no crons and
 * `instrumentation.js` starts no background job).
 */

/** Stored statuses, in the order the status menu offers them. */
export const EVENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

/** Derived display phases. Not stored — always computed from status + dates. */
export const EVENT_PHASES = ["cancelled", "completed", "ongoing", "upcoming", "unknown"];

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

/** Midnight at the start of the day `date` falls on, or null when unparseable. */
const startOfDay = (date) => {
  /* `new Date(null)` is the 1970 epoch, not an invalid date, so an absent field
     has to be rejected before the conversion. */
  if (date === null || date === undefined || date === "") return null;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
};

/** 23:59:59.999 on the day `date` falls on, or null when unparseable. */
const endOfDay = (date) => {
  if (date === null || date === undefined || date === "") return null;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
};

/**
 * First and last timestamp an event occupies.
 *
 * Dates are stored as whole days (the create form sends `YYYY-MM-DD`), so an
 * event spans from the *start* of its first day to the *end* of its last day.
 * That is what makes an event ending today still read as ongoing at 11 p.m.
 * The scalar `start_date`/`end_date` fields win; the legacy `start_dates`/
 * `end_dates` arrays are the fallback for rows written before they existed.
 */
export const eventSpan = (event) => {
  if (!event) return { start: null, end: null };

  const starts = [
    event.start_date,
    ...(Array.isArray(event.start_dates) ? event.start_dates : []),
    event.date,
  ]
    .map(startOfDay)
    .filter((value) => value !== null);

  const ends = [
    event.end_date,
    ...(Array.isArray(event.end_dates) ? event.end_dates : []),
    event.date,
  ]
    .map(endOfDay)
    .filter((value) => value !== null);

  return {
    start: starts.length ? Math.min(...starts) : null,
    end: ends.length ? Math.max(...ends) : null,
  };
};


/**
 * Where the event sits in time, for display.
 *
 * A stored `cancelled` or `completed` is sticky and wins over the dates: an
 * event called off three weeks early must never drift back to "Upcoming" once
 * its start date arrives.
 *
 * @returns {"cancelled"|"completed"|"ongoing"|"upcoming"|"unknown"}
 */
export function effectiveStatus(event, now = new Date()) {
  const stored = normalizeStatus(event?.status);
  if (stored === "cancelled") return "cancelled";
  if (stored === "completed") return "completed";

  const { start, end } = eventSpan(event);
  if (start === null && end === null) return "unknown";

  const current = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (Number.isNaN(current)) return "unknown";

  /* An end date alone is enough to say the event is over. */
  if (end !== null && current > end) return "completed";
  if (start !== null && current < start) return "upcoming";
  return "ongoing";
}

/**
 * Whether an event may still be discovered, checked into and reported as live.
 * Cancelled events are never open, whatever their dates say.
 */
export const isEventOpen = (event, now = new Date()) =>
  effectiveStatus(event, now) !== "cancelled";

/**
 * The moment attendance opens and closes, in epoch milliseconds.
 *
 * Replaces the two hand-written day-window helpers that used to live in
 * `app/api/events/attendance/route.js` and
 * `app/api/events/guest-attendance/route.js`. A null bound means "no bound".
 */
export function attendanceWindow(event) {
  const { start, end } = eventSpan(event);
  return { earliestStart: start, latestEnd: end };
}

/* ── Status transitions ─────────────────────────────────────────── */

/**
 * Allowed status moves.
 *
 * Cancelling is reversible (an event gets called off and then reinstated) and so
 * is completing (a report needs correcting after the fact, so the event is
 * reopened). A cancelled event is never silently marked completed — the
 * organiser has to reinstate it first — because "cancelled" and "completed"
 * mean opposite things on an accomplishment report.
 */
const TRANSITIONS = {
  active: ["cancelled", "completed"],
  cancelled: ["active"],
  completed: ["active"],
};

/** The status values the status menu may offer for an event in `current`. */
export const eventStatusOptions = (current) => {
  const from = normalizeStatus(current);
  const allowed = TRANSITIONS[from];

  /* An unknown or missing status degrades to every option, so a legacy row is
     never locked out of being fixed. */
  if (!allowed) return EVENT_STATUSES;

  return EVENT_STATUSES.filter(
    (status) => status.value === from || allowed.includes(status.value),
  );
};

/** Whether `next` may be applied to an event currently in `current`. */
export const canTransition = (current, next) => {
  const from = normalizeStatus(current) || "active";
  const to = normalizeStatus(next);

  if (!EVENT_STATUSES.some((status) => status.value === to)) return false;
  /* Re-applying the current value is a harmless no-op, not an error. */
  if (from === to) return true;

  const allowed = TRANSITIONS[from];
  if (!allowed) return true;
  return allowed.includes(to);
};

/** Cancelling an event needs a reason before the change may be recorded. */
export const requiresCancelReason = (current, next) =>
  normalizeStatus(current) !== "cancelled" &&
  normalizeStatus(next) === "cancelled";

/* ── Presentation ───────────────────────────────────────────────── */

/**
 * Badge styling per phase.
 *
 * "Past" and "Cancelled" used to both render red, which made a finished event
 * look like a called-off one. A finished event is neutral here; red is reserved
 * for cancelled.
 */
export const EVENT_PHASE_STYLES = {
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-600 border border-red-200",
    accent: "bg-red-500",
    dot: "bg-red-500",
  },
  completed: {
    label: "Completed",
    classes: "bg-gray-50 text-gray-600 border border-gray-200",
    accent: "bg-gray-400",
    dot: "bg-gray-400",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-green-50 text-green-600 border border-green-200",
    accent: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  upcoming: {
    label: "Upcoming",
    classes: "bg-secondary-50 text-secondary-600 border border-secondary-200",
    accent: "bg-secondary-500",
    dot: "bg-secondary-500",
  },
  unknown: {
    label: "No date set",
    classes: "bg-gray-100 text-gray-600",
    accent: "bg-gray-300",
    dot: "bg-gray-400",
  },
};

/** Badge label + classes for an event, from its derived phase. */
export const eventPhaseStyle = (event, now = new Date()) =>
  EVENT_PHASE_STYLES[effectiveStatus(event, now)] || EVENT_PHASE_STYLES.unknown;
