/*
 * Pure helpers for the project Gantt chart workspace: duration math,
 * activity/milestone rows and Jan–Dec timeline layout. No framework imports so
 * it also runs in plain-Node tests. Parsing/validation lives in ganttParse.js.
 */

import { appParts } from "./appTime.js";

export const MAX_GANTT_ACTIVITIES = 50;

export const TIMELINE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses "YYYY-MM-DD" (or a Date/ISO string) to a UTC-midnight timestamp. */
const toUtcDay = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  }
  /* The Manila day the instant falls on — not the viewer's local day, which
     put a Manila-midnight date on the previous day west of UTC+8. */
  const parts = appParts(value);
  if (!parts) return null;
  return Date.UTC(parts.year, parts.month - 1, parts.day);
};

/** Formats a value as "YYYY-MM-DD" for date inputs ("" when invalid). */
export const toInputDate = (value) => {
  const day = toUtcDay(value);
  if (day === null) return "";
  return new Date(day).toISOString().slice(0, 10);
};

/** Inclusive number of days between start and end (0 when not computable). */
export const calcDurationDays = (start, end) => {
  const s = toUtcDay(start);
  const e = toUtcDay(end);
  if (s === null || e === null || e < s) return 0;
  return Math.round((e - s) / DAY_MS) + 1;
};

/** Accepts ISO strings, "Jan 06, 2025", Date objects and Excel serials. */
export const normalizeDateCell = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" && value > 20000 && value < 80000) {
    return new Date(Math.round((value - 25569) * DAY_MS))
      .toISOString()
      .slice(0, 10);
  }
  if (value instanceof Date) return toInputDate(value);
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${m}-${d}`;
};

export const emptyActivity = () => ({
  activity: "",
  start_date: "",
  end_date: "",
  person_responsible: "",
});

/** Trims text and normalizes dates of one Gantt row. */
export const normalizeGanttRow = (row = {}) => ({
  activity: String(row.activity ?? "").trim(),
  start_date: normalizeDateCell(row.start_date),
  end_date: normalizeDateCell(row.end_date),
  person_responsible: String(row.person_responsible ?? "").trim(),
});

const MILESTONE_STATUSES = ["pending", "ongoing", "completed"];

const hasProgress = (m) =>
  (m.status && m.status !== "pending") ||
  Boolean(m.actual_date) ||
  (Array.isArray(m.proofs) && m.proofs.length > 0);

const progressOf = (m) => ({
  actual_date: m ? toInputDate(m.actual_date) : "",
  status: m && MILESTONE_STATUSES.includes(m.status) ? m.status : "pending",
  proofs: (m && Array.isArray(m.proofs) ? m.proofs : []).filter(
    (file) => file && (file.url || file.key),
  ),
});

/**
 * Builds the single activity+milestone table: one row per activity, carrying
 * the progress (actual date, status, proofs) of its saved milestone. A
 * milestone belongs to an activity by source activity, by the same title, or
 * by the old generated "<Activity> Completed" title; when several match, the
 * one with progress wins. Milestones left over are kept as their own rows when
 * they are custom (no source activity) or carry progress, so no proof or status
 * is lost; leftover generated rows without progress ("Project Start-Up") drop.
 */
export const buildUnifiedRows = (activities, milestones) => {
  const pool = (Array.isArray(milestones) ? milestones : []).filter(
    (m) => m && String(m.title || "").trim(),
  );
  const used = new Set();

  const rows = (Array.isArray(activities) ? activities : [])
    .filter((a) => a && String(a.activity || "").trim())
    .map((a) => {
      const name = String(a.activity).trim();
      const matches = pool.filter(
        (m) =>
          !used.has(m) &&
          (m.source_activity === name ||
            m.title === name ||
            m.title === `${name} Completed`),
      );
      const match = matches.find(hasProgress) || matches[0];
      matches.forEach((m) => used.add(m));
      /* Other matches with progress stay visible as their own rows below. */
      if (match) {
        matches
          .filter((m) => m !== match && hasProgress(m))
          .forEach((m) => used.delete(m));
      }
      return {
        activity: a.activity,
        start_date: toInputDate(a.start_date),
        end_date: toInputDate(a.end_date),
        person_responsible: a.person_responsible || "",
        ...progressOf(match),
      };
    });

  pool
    .filter((m) => !used.has(m) && (!m.source_activity || hasProgress(m)))
    .forEach((m) => {
      rows.push({
        activity: String(m.title).trim(),
        start_date: "",
        end_date: toInputDate(m.target_date),
        person_responsible: "",
        ...progressOf(m),
      });
    });

  return rows.slice(0, MAX_GANTT_ACTIVITIES);
};

/**
 * Left/width percentages of each activity inside a Jan–Dec year.
 * Activities are clamped to the year; undated/out-of-year rows give null.
 * Each entry also reports which side spills past the year so the caller can
 * mark a bar as "continues" instead of silently cutting it at Dec 31.
 */
export const timelineLayout = (activities, year) => {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const total = Math.round((yearEnd - yearStart) / DAY_MS) + 1;

  return (Array.isArray(activities) ? activities : []).map((row) => {
    const s = toUtcDay(row.start_date);
    const e = toUtcDay(row.end_date);
    if (s === null || e === null || e < s || e < yearStart || s > yearEnd) {
      return null;
    }
    const from = Math.max(s, yearStart);
    const to = Math.min(e, yearEnd);
    const offset = Math.round((from - yearStart) / DAY_MS);
    const length = Math.round((to - from) / DAY_MS) + 1;
    return {
      left: (offset / total) * 100,
      width: (length / total) * 100,
      continuesBefore: s < yearStart,
      continuesAfter: e > yearEnd,
    };
  });
};

/**
 * The inclusive [firstYear, lastYear] an activity set touches, so a project
 * that starts in Q3 and ends the following year is charted across both.
 * Undated rows are ignored; returns null when nothing is dated.
 */
export const activityYears = (activities) => {
  const days = (Array.isArray(activities) ? activities : [])
    .flatMap((row) => [toUtcDay(row?.start_date), toUtcDay(row?.end_date)])
    .filter((day) => day !== null);
  if (days.length === 0) return null;
  return {
    start: new Date(Math.min(...days)).getUTCFullYear(),
    end: new Date(Math.max(...days)).getUTCFullYear(),
  };
};

/**
 * Every calendar year to draw, derived from the activity span (so a Jan 2025
 * to Feb 2026 project yields [2025, 2026]) and always including `fallbackYear`
 * - the project year - so an undated project still shows one empty chart.
 */
export const timelineYears = (activities, fallbackYear) => {
  const span = activityYears(activities);
  const fallback = Number(fallbackYear);
  if (!span) {
    return Number.isFinite(fallback)
      ? [fallback]
      : [appParts(new Date()).year];
  }
  const years = [];
  for (let y = span.start; y <= span.end; y++) years.push(y);
  if (Number.isFinite(fallback) && !years.includes(fallback)) {
    years.push(fallback);
    years.sort((a, b) => a - b);
  }
  return years;
};
