/*
 * Parsing (spreadsheet / CSV rows) and server-side validation for the
 * project Gantt chart. Pure functions, no framework imports.
 */
import { MAX_GANTT_ACTIVITIES, normalizeGanttRow } from "./gantt.js";

const HEADER_ALIASES = {
  activity: ["activity", "activitydeliverable", "deliverable", "task", "name"],
  start_date: ["startdate", "start", "from", "datestart"],
  end_date: ["enddate", "end", "to", "finish", "dateend"],
  person_responsible: [
    "personresponsible",
    "responsible",
    "owner",
    "assignedto",
    "person",
  ],
};

const headerKey = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z]/g, "");

/**
 * Maps a 2D array (header row first, from a spreadsheet or CSV) to Gantt
 * rows. Returns { rows } or { rows: [], error }.
 */
export const parseGanttTable = (table) => {
  if (!Array.isArray(table) || table.length < 2) {
    return { rows: [], error: "The file has no activity rows." };
  }

  const headerIndex = table.findIndex(
    (line) =>
      Array.isArray(line) &&
      line.some((cell) => HEADER_ALIASES.activity.includes(headerKey(cell))),
  );
  if (headerIndex === -1) {
    return {
      rows: [],
      error: 'Could not find an "Activity" column. Please use the template.',
    };
  }

  const columns = {};
  table[headerIndex].forEach((cell, col) => {
    const key = headerKey(cell);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (columns[field] === undefined && aliases.includes(key)) {
        columns[field] = col;
      }
    }
  });

  const rows = [];
  for (const line of table.slice(headerIndex + 1)) {
    if (!Array.isArray(line)) continue;
    const row = normalizeGanttRow({
      activity: line[columns.activity],
      start_date: line[columns.start_date],
      end_date: line[columns.end_date],
      person_responsible: line[columns.person_responsible],
    });
    if (row.activity) rows.push(row);
  }

  if (rows.length === 0) {
    return { rows: [], error: "No activities were found in the file." };
  }
  return { rows: rows.slice(0, MAX_GANTT_ACTIVITIES) };
};

/** Splits CSV text into a 2D array (handles quoted cells). */
export const parseCsvTable = (text) => {
  const table = [];
  let cell = "";
  let line = [];
  let quoted = false;
  const source = String(text ?? "").replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      line.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      line.push(cell);
      table.push(line);
      line = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || line.length > 0) {
    line.push(cell);
    table.push(line);
  }
  return table;
};

export const GANTT_TEMPLATE_CSV =
  "Activity / Deliverable,Start Date,End Date,Person Responsible\r\n" +
  "Project Preparation and Coordination,2025-01-06,2025-01-31,GAD Office\r\n" +
  "Develop Training Materials,2025-03-03,2025-03-31,Training Team\r\n";

/**
 * Server-side validation. `parseDate` is the route's parseDateInput
 * (returns Date | null, or undefined when invalid).
 */
export const parseGanttActivities = (input, parseDate) => {
  if (!Array.isArray(input)) {
    return { error: "Invalid Gantt activities payload" };
  }
  if (input.length > MAX_GANTT_ACTIVITIES) {
    return {
      error: `Too many Gantt activities (max ${MAX_GANTT_ACTIVITIES})`,
    };
  }

  const activities = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { error: "Invalid Gantt activity entry" };
    }
    const activity = String(raw.activity ?? "").trim();
    if (!activity) return { error: "Each Gantt activity needs a name" };
    if (activity.length > 300) {
      return { error: "Gantt activity name is too long (max 300 characters)" };
    }
    const start = parseDate(raw.start_date);
    const end = parseDate(raw.end_date);
    if (start === undefined || end === undefined) {
      return { error: `Invalid dates for activity "${activity}"` };
    }
    if (start && end && end.getTime() < start.getTime()) {
      return {
        error: `End date must be on or after the start date for "${activity}"`,
      };
    }
    const person = String(raw.person_responsible ?? "").trim();
    if (person.length > 200) {
      return { error: "Person responsible is too long (max 200 characters)" };
    }
    activities.push({
      activity,
      start_date: start,
      end_date: end,
      person_responsible: person,
    });
  }
  return { activities };
};
