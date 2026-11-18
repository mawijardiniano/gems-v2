import { eventSpan } from "./eventStatus.js";
import { APP_TIME_ZONE, appParts } from "./appTime.js";

/* Display text for when an event happens.
 *
 * Events are scheduled by date only and stored as local midnight to 23:59, so
 * printing their times showed "12:00 AM – 11:59 PM" on every card. A range
 * that covers whole days is shown as dates alone; a range with real times
 * (legacy rows) keeps them. Always read in Manila time (data/lib/appTime.js),
 * the zone event days are defined in, whatever the viewer's device says.
 */

const DATE_OPTS = {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
};
const TIME_OPTS = { hour: "numeric", minute: "2-digit", timeZone: APP_TIME_ZONE };

const toDate = (value) => {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "November 17, 2026" for the Manila day of `value`, or `fallback`. */
export function formatLongDay(value, fallback = "Invalid date") {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: APP_TIME_ZONE,
      })
    : fallback;
}

/** True when start is Manila midnight and end (if any) is Manila 23:59. */
export function isWholeDayRange(start, end) {
  const s = appParts(toDate(start));
  if (!s || s.hours !== 0 || s.minutes !== 0) return false;
  const e = appParts(toDate(end));
  if (!e) return true;
  return e.hours === 23 && e.minutes === 59;
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
