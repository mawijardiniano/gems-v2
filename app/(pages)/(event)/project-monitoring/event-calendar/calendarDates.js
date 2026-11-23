import { APP_TIME_ZONE, appDateInput } from "@/data/lib/appTime";
import { effectiveStatus, eventSpan } from "@/data/lib/eventStatus";
import { isWholeDayRange } from "@/data/lib/eventDates";

/* Date and status rules for the event calendar, in Manila time like the rest
   of the events module. The calendar and its day panel each had a copy that
   used the browser's local time: every whole-day event (stored as Manila
   00:00–23:59) read "12:00 AM – 11:59 PM", and a viewer outside UTC+8 saw
   one-day events spread over two cells. */

export const getEventStart = (e) =>
  e?.start_date ||
  (Array.isArray(e?.start_dates) ? e.start_dates[0] : null) ||
  e?.date ||
  null;

export const getEventEnd = (e) =>
  e?.end_date ||
  (Array.isArray(e?.end_dates) ? e.end_dates[e.end_dates.length - 1] : null) ||
  getEventStart(e);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "YYYY-MM-DD" keys of every Manila day the event covers (at most `maxDays`).
 */
export function eventDayKeys(event, maxDays = 62) {
  const startKey = appDateInput(getEventStart(event));
  if (!startKey) return [];
  const endKey = appDateInput(getEventEnd(event)) || startKey;
  const toUtc = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const first = toUtc(startKey);
  const last = Math.max(first, toUtc(endKey));
  const keys = [];
  for (let t = first; t <= last && keys.length < maxDays; t += DAY_MS) {
    keys.push(new Date(t).toISOString().slice(0, 10));
  }
  return keys;
}

const STATUS_STYLES = {
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-500",
    chip: "bg-danger-subtle text-danger hover:bg-red-100",
    cls: "bg-danger-subtle text-danger border-danger-border",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    chip: "bg-success-subtle text-success hover:bg-emerald-100",
    cls: "bg-success-subtle text-success border-success-border",
  },
  past: {
    label: "Past",
    dot: "bg-gray-400",
    chip: "bg-gray-50 text-gray-600 hover:bg-gray-100",
    cls: "bg-gray-50 text-gray-600 border-gray-200",
  },
  ongoing: {
    label: "Ongoing",
    dot: "bg-green-500",
    chip: "bg-success-subtle text-success hover:bg-green-100",
    cls: "bg-success-subtle text-success border-success-border",
  },
  upcoming: {
    label: "Upcoming",
    dot: "bg-secondary-500",
    chip: "bg-secondary-50 text-secondary-700 hover:bg-secondary-100",
    cls: "bg-secondary-50 text-secondary-700 border-secondary-200",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-gray-400",
    chip: "bg-gray-50 text-gray-600 hover:bg-gray-100",
    cls: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

/** Badge/chip styling from the shared lifecycle rules (eventStatus.js). A
    stored "completed" reads Completed; one whose dates have passed, Past. */
export function calendarStatus(event) {
  const phase = effectiveStatus(event);
  if (phase === "completed") {
    return event?.status === "completed"
      ? STATUS_STYLES.completed
      : STATUS_STYLES.past;
  }
  return STATUS_STYLES[phase] || STATUS_STYLES.unknown;
}

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: APP_TIME_ZONE,
});
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
});

/** "All day" for whole-day events, otherwise the Manila start – end time. */
export function eventTimeLabel(event) {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  if (!start) return "";
  if (isWholeDayRange(start, end)) return "All day";
  return `${timeFmt.format(new Date(start))} – ${timeFmt.format(new Date(end))}`;
}

/** "Nov 17, 2026" or "Nov 17, 2026 – Nov 19, 2026" (Manila days). */
export function eventDateRangeLabel(event) {
  const { start, end } = eventSpan(event);
  if (start === null) return "";
  const startStr = dateFmt.format(new Date(start));
  if (end === null) return startStr;
  const endStr = dateFmt.format(new Date(end));
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

/** Today's Manila day as { year, month (0-11), key }. */
export function manilaToday() {
  const key = appDateInput(new Date());
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m - 1, key };
}
