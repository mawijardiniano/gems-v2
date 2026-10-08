/*
 * Pure helpers for the project Gantt chart workspace: duration math,
 * milestone generation and Jan–Dec timeline layout. No framework imports so
 * it also runs in plain-Node tests. Parsing/validation lives in ganttParse.js.
 */

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
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

const buildMilestone = (title, targetDate, sourceActivity) => ({
  title,
  target_date: targetDate,
  actual_date: "",
  status: "pending",
  proofs: [],
  source_activity: sourceActivity,
});

/**
 * Builds milestones from activities:
 *  - first activity start     -> "Project Start-Up"
 *  - each activity end        -> "<Activity> Completed"
 *  - last activity end        -> "Project Completed"
 * Rows without a name and both dates are skipped. Users can rename or delete
 * generated milestones before saving.
 */
export const generateMilestonesFromGantt = (activities) => {
  const rows = (Array.isArray(activities) ? activities : [])
    .map(normalizeGanttRow)
    .filter((row) => row.activity && row.start_date && row.end_date);

  if (rows.length === 0) return [];

  const milestones = [
    buildMilestone("Project Start-Up", rows[0].start_date, rows[0].activity),
  ];

  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    if (index === 0 && !isLast) return;
    milestones.push(
      buildMilestone(
        isLast ? "Project Completed" : `${row.activity} Completed`,
        row.end_date,
        row.activity,
      ),
    );
  });

  return milestones.slice(0, MAX_GANTT_ACTIVITIES);
};

/**
 * Merges freshly generated milestones with the existing rows so Gantt edits
 * flow into milestones without losing progress. A generated milestone takes
 * the status / actual date / proofs of a previous row matched by:
 *   1. same title, 2. same source activity, 3. same position among the
 *   previously generated rows (survives activity renames).
 * Title, target date and source activity always come from the Gantt.
 * Rows without a source activity are custom and always kept (appended).
 * Returns { milestones, removed } where `removed` lists generated rows that
 * no longer exist in the Gantt.
 */
export const mergeMilestones = (generated, previous) => {
  const prev = Array.isArray(previous) ? previous : [];
  const custom = prev.filter((row) => !row.source_activity);
  const linked = prev.filter((row) => row.source_activity);
  const used = new Set();

  const take = (predicate) => {
    const found = linked.find((row) => !used.has(row) && predicate(row));
    if (found) used.add(found);
    return found;
  };

  const milestones = (Array.isArray(generated) ? generated : []).map(
    (item, index) => {
      const old =
        take((row) => row.title === item.title) ||
        take((row) => row.source_activity === item.source_activity) ||
        (linked[index] && !used.has(linked[index])
          ? take((row) => row === linked[index])
          : undefined);
      if (!old) return item;
      return {
        ...item,
        actual_date: old.actual_date || "",
        status: old.status || "pending",
        proofs: Array.isArray(old.proofs) ? old.proofs : [],
      };
    },
  );

  const removed = linked.filter((row) => !used.has(row));
  return { milestones: [...milestones, ...custom], removed };
};

/** True when `rows` no longer match what the Gantt would generate. */
export const isMilestonesOutdated = (activities, rows) => {
  const generated = generateMilestonesFromGantt(activities);
  const linked = (Array.isArray(rows) ? rows : []).filter(
    (row) => row.source_activity,
  );
  if (generated.length === 0 && linked.length === 0) return false;
  if (generated.length !== linked.length) return true;
  const sig = (m) => `${m.title}|${toInputDate(m.target_date)}|${m.source_activity}`;
  return generated.some((m, i) => sig(m) !== sig(linked[i]));
};

/**
 * Left/width percentages of each activity inside a Jan–Dec year.
 * Activities are clamped to the year; undated/out-of-year rows give null.
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
    return { left: (offset / total) * 100, width: (length / total) * 100 };
  });
};
