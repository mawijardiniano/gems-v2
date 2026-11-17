/* The university's calendar day, independent of where the code runs.
 *
 * Event dates are whole days in Philippine time. Day boundaries used to be
 * computed with the *machine's* local zone, so on a UTC server attendance
 * opened at 08:00 Manila time and stayed open until 07:59 the next day, and a
 * browser outside the Philippines saved a different day than the one picked.
 * The Philippines has no daylight saving, so a fixed UTC+8 offset is exact
 * and needs no time-zone database.
 */

export const APP_TIME_ZONE = "Asia/Manila";
export const APP_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toMs = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** Epoch ms of 00:00:00.000 Manila time on the day `value` falls on. */
export function appStartOfDay(value) {
  const ms = toMs(value);
  if (ms === null) return null;
  return (
    Math.floor((ms + APP_UTC_OFFSET_MS) / DAY_MS) * DAY_MS - APP_UTC_OFFSET_MS
  );
}

/** Epoch ms of 23:59:59.999 Manila time on the day `value` falls on. */
export function appEndOfDay(value) {
  const start = appStartOfDay(value);
  return start === null ? null : start + DAY_MS - 1;
}

/** Manila calendar fields of an instant: { year, month (1-12), day, hours, minutes }. */
export function appParts(value) {
  const ms = toMs(value);
  if (ms === null) return null;
  const d = new Date(ms + APP_UTC_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

/** "YYYY-MM-DD" of the Manila day an instant falls on (for <input type="date">). */
export function appDateInput(value) {
  const p = appParts(value);
  if (!p) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * The stored range for a date-only event picked as "YYYY-MM-DD": Manila
 * 00:00 to 23:59, as ISO strings. Null when the input is not a date.
 */
export function appDayRange(dateInput) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateInput || ""));
  if (!match) return null;
  const start = Date.parse(`${match[0]}T00:00:00+08:00`);
  if (Number.isNaN(start)) return null;
  return {
    start_date: new Date(start).toISOString(),
    end_date: new Date(start + DAY_MS - 60 * 1000).toISOString(),
  };
}
