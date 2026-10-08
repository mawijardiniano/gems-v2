/* Gender Profile Report: population/field helpers and the pure table builder.
   Name selected   -> masterlist (one row per person).
   Name unselected -> aggregated counts grouped by the selected fields.
   No browser or PDF dependencies, so it is testable under node --test. */
import { fmtPct, pctOf } from "../gender-statistics/components/quickReports.js";
import {
  FIELD_BY_VALUE,
  FIELD_DEFS,
  UNSPECIFIED,
} from "./profileFieldDefs.js";

export { UNSPECIFIED };

export const PROFILE_POPULATIONS = [
  { value: "both", label: "Students + Employees" },
  { value: "students", label: "Students only" },
  { value: "employees", label: "Employees only" },
];

/* Defaults give an aggregated breakdown; tick Name for the masterlist. */
export const DEFAULT_PROFILE_FIELDS = {
  students: [],
  employees: [],
  both: ["type"],
};

export const isProfilePopulation = (population) =>
  PROFILE_POPULATIONS.some((p) => p.value === population);

export function isAvailable(def, population) {
  if (def.bothOnly) return population === "both";
  if (population === "both") {
    return def.sources.includes("students") && def.sources.includes("employees");
  }
  return def.sources.includes(population);
}

function unavailableNote(def, population) {
  if (population !== "both" || def.bothOnly) return "";
  return def.sources.includes("students") ? "Students only" : "Employees only";
}

/** Registry fields for the picker, in fixed column order. Fields the chosen
    population cannot supply stay listed but flagged unavailable. */
export function profileFieldsFor(population) {
  return FIELD_DEFS.filter((d) => !d.bothOnly || population === "both").map(
    (d) => ({
      value: d.value,
      label: d.label,
      available: isAvailable(d, population),
      note: unavailableNote(d, population),
      listOnly: Boolean(d.listOnly),
    }),
  );
}

export const defaultProfileFields = (population) => [
  ...(DEFAULT_PROFILE_FIELDS[population] || DEFAULT_PROFILE_FIELDS.both),
];

/** Selected values in registry order, without unknown or unavailable ones. */
export function normalizeProfileFields(population, selected = []) {
  const wanted = new Set(selected);
  return FIELD_DEFS.filter(
    (d) => wanted.has(d.value) && isAvailable(d, population),
  ).map((d) => d.value);
}

export const profileMode = (fields) =>
  fields.includes("name") ? "masterlist" : "aggregated";

/** Wide masterlists need landscape; aggregated tables only when many
    grouping keys sit beside the count columns. */
export function profileOrientation(mode, columnCount) {
  const limit = mode === "masterlist" ? 4 : 6;
  return columnCount > limit ? "landscape" : "portrait";
}

const POPULATION_NOUN = {
  students: "Student",
  employees: "Employee",
  both: "Student and Employee",
};

export function profileReportTitle(population, mode) {
  const noun = POPULATION_NOUN[population] || POPULATION_NOUN.both;
  return `${noun} Gender Profile ${
    mode === "masterlist" ? "Masterlist" : "Breakdown"
  }`;
}

export function profileReportFilename(population, mode) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `gender-profile-${mode}-${population}-sample-${stamp}.pdf`;
}

const ALL_LABEL = {
  students: "All students",
  employees: "All personnel",
  both: "All students and employees",
};

const NUM = (value) => value.toLocaleString("en-US");
const orUnspecified = (value) =>
  value == null || value === "" ? UNSPECIFIED : String(value);

function compareValues(def, a, b) {
  const aMissing = a === UNSPECIFIED;
  const bMissing = b === UNSPECIFIED;
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (def.rank) {
    const diff = def.rank(a) - def.rank(b);
    if (diff !== 0) return diff;
  }
  return String(a).localeCompare(String(b));
}

function masterlistTable(defs, records, selected) {
  const nameDef = FIELD_BY_VALUE.name;
  const sorted = [...records].sort((a, b) =>
    String(nameDef.get(a)).localeCompare(String(nameDef.get(b))),
  );
  return {
    mode: "masterlist",
    head: defs.map((d) => d.header || d.label),
    body: sorted.map((r) => defs.map((d) => d.get(r))),
    statColumns: 0,
    totalRowIndex: null,
    fields: selected,
    groupedBy: [],
    ignored: [],
    recordCount: records.length,
  };
}

function groupRecords(records, keyDefs) {
  const groups = new Map();
  records.forEach((record) => {
    const values = keyDefs.map((d) =>
      orUnspecified(d.group ? d.group(record) : d.get(record)),
    );
    const key = JSON.stringify(values);
    if (!groups.has(key)) groups.set(key, { values, Female: 0, Male: 0, total: 0 });
    const entry = groups.get(key);
    entry.total += 1;
    if (record.sex === "Female") entry.Female += 1;
    if (record.sex === "Male") entry.Male += 1;
  });
  const entries = [...groups.values()].sort((a, b) => {
    for (let i = 0; i < keyDefs.length; i += 1) {
      const diff = compareValues(keyDefs[i], a.values[i], b.values[i]);
      if (diff !== 0) return diff;
    }
    return 0;
  });
  if (!keyDefs.length && !entries.length) {
    entries.push({ values: [], Female: 0, Male: 0, total: 0 });
  }
  return entries;
}

function aggregatedTable({ population, defs, records, selected }) {
  const keyDefs = defs.filter(
    (d) => !d.listOnly && d.value !== "sex" && d.value !== "name",
  );
  const ignored = defs.filter((d) => d.listOnly).map((d) => d.label);
  const includeSex = selected.includes("sex");
  const entries = groupRecords(records, keyDefs);

  const statCells = (e) =>
    includeSex
      ? [NUM(e.Female), NUM(e.Male), NUM(e.total), fmtPct(pctOf(e.Female, e.total))]
      : [NUM(e.total)];
  const statHead = includeSex ? ["Female", "Male", "Total", "% Female"] : ["Total"];
  const keyHead = keyDefs.length
    ? keyDefs.map((d) => d.groupHeader || d.header || d.label)
    : ["Category"];

  const body = entries.map((e) => [
    ...(keyDefs.length ? e.values : [ALL_LABEL[population] || ALL_LABEL.both]),
    ...statCells(e),
  ]);

  let totalRowIndex = null;
  if (keyDefs.length) {
    const sum = entries.reduce(
      (acc, e) => ({
        Female: acc.Female + e.Female,
        Male: acc.Male + e.Male,
        total: acc.total + e.total,
      }),
      { Female: 0, Male: 0, total: 0 },
    );
    body.push(["Total", ...Array(keyDefs.length - 1).fill(""), ...statCells(sum)]);
    totalRowIndex = body.length - 1;
  }

  return {
    mode: "aggregated",
    head: [...keyHead, ...statHead],
    body,
    statColumns: statHead.length,
    totalRowIndex,
    fields: selected,
    groupedBy: keyDefs.map((d) => d.label),
    ignored,
    recordCount: records.length,
  };
}

/**
 * Build the table for a population, selected fields and record list.
 * Records carry `__type` ("Student" / "Employee") in "both" mode.
 */
export function buildProfileTable({ population, fields = [], records = [] }) {
  const selected = normalizeProfileFields(population, fields);
  if (!selected.length) {
    throw new Error("Select at least one field for the report.");
  }
  const defs = selected.map((value) => FIELD_BY_VALUE[value]);
  return profileMode(selected) === "masterlist"
    ? masterlistTable(defs, records, selected)
    : aggregatedTable({ population, defs, records, selected });
}
