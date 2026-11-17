import { eventSpan } from "./eventStatus.js";

/* Display text for when an event happens.
 *
 * Events are scheduled by date only and stored as local midnight to 23:59, so
 * printing their times showed "12:00 AM – 11:59 PM" on every card. A range
 * that covers whole days is shown as dates alone; a range with real times
 * (legacy rows) keeps them. Runs in the viewer's local time zone, the same
 * zone the create form used to build the range.
 */

const DATE_OPTS = { month: "short", day: "numeric", year: "numeric" };
const TIME_OPTS = { hour: "numeric", minute: "2-digit" };

const toDate = (value) => {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** True when start is local midnight and end (if any) is local 23:59. */
export function isWholeDayRange(start, end) {
  const s = toDate(start);
  if (!s || s.getHours() !== 0 || s.getMinutes() !== 0) return false;
  const e = toDate(end);
  if (!e) return true;
  return e.getHours() === 23 && e.getMinutes() === 59;
}

/**
 * Formats a start/end pair, e.g. "Nov 17, 2026", "Nov 17, 2026 – Nov 19, 2026"
 * or "Nov 17, 2026, 1:00 PM – 3:00 PM". Returns null when there is no start.
 */
export function formatDateRange(start, end, locale = "en-US") {
  const s = toDate(start);
  if (!s) return null;
  const e = toDate(end);

  const day = (d) => d.toLocaleDateString(locale, DATE_OPTS);
  const time = (d) => d.toLocaleTimeString(locale, TIME_OPTS);
  const sameDay = !e || day(s) === day(e);

  if (isWholeDayRange(s, e)) {
    return sameDay ? day(s) : `${day(s)} – ${day(e)}`;
  }
  if (!e || e.getTime() === s.getTime()) return `${day(s)}, ${time(s)}`;
  return sameDay
    ? `${day(s)}, ${time(s)} – ${time(e)}`
    : `${day(s)}, ${time(s)} – ${day(e)}, ${time(e)}`;
}

/** formatDateRange for an event record (scalar or legacy array dates). */
export function formatEventWhen(evt, locale) {
  if (!evt) return null;
  const { start, end } = eventSpan(evt);
  return formatDateRange(start, end, locale);
}
