/**
 * GPB project reference numbers.
 *
 * Format: `GPB-<year>-<sequence>`, e.g. `GPB-2025-001`.
 *
 * The number is stored on the project document (`reference_number`) so it stays
 * stable even after other projects are deleted. The API assigns it when a
 * project is created; `scripts/backfill-reference-numbers.mjs` fills in the
 * projects that were created before this feature existed.
 */

export const REF_NUMBER_PREFIX = "GPB";

export const REF_NUMBER_PATTERN = /^GPB-(\d{4})-(\d+)$/i;

/** Builds a reference number from a fiscal year and a 1-based sequence. */
export const formatRefNumber = (year, sequence) => {
  const yearNumber = Number(year);
  const sequenceNumber = Number(sequence);

  if (!Number.isFinite(yearNumber) || !Number.isInteger(yearNumber)) return "";
  if (!Number.isFinite(sequenceNumber) || sequenceNumber < 1) return "";

  return `${REF_NUMBER_PREFIX}-${yearNumber}-${String(
    Math.floor(sequenceNumber),
  ).padStart(3, "0")}`;
};

/** Parses `GPB-2025-001` into `{ year, sequence }`; null when malformed. */
export const parseRefNumber = (value) => {
  const match = String(value ?? "").trim().match(REF_NUMBER_PATTERN);
  if (!match) return null;

  return { year: Number(match[1]), sequence: Number(match[2]) };
};

/** Trims a user-supplied reference number ("" when empty). */
export const normalizeRefNumber = (value) => String(value ?? "").trim();

/**
 * Highest sequence already used for `year`; 0 when the year has no numbers yet.
 * Numbers for other years are ignored.
 */
export const highestSequenceForYear = (refs, year) => {
  const yearNumber = Number(year);
  let highest = 0;

  for (const ref of Array.isArray(refs) ? refs : []) {
    const parsed = parseRefNumber(ref);
    if (!parsed || parsed.year !== yearNumber) continue;
    if (parsed.sequence > highest) highest = parsed.sequence;
  }

  return highest;
};

/** Next free reference number for `year`, given the numbers already in use. */
export const nextRefNumber = (year, refs) =>
  formatRefNumber(year, highestSequenceForYear(refs, year) + 1);

/**
 * Event reference numbers.
 *
 * Format: `<TYPE PREFIX>-<year>-<sequence>`, e.g. `GAD-2025-001` for a GAD
 * event. Each pair of (type of activity, year) has its own sequence.
 *
 * The number is stored on the event document (`reference_number`) so it stays
 * stable; `scripts/backfill-event-reference-numbers.mjs` fills in events that
 * were created before this feature existed.
 */

/** Short prefix per type of activity — keep in sync with models/event.js. */
export const EVENT_TYPE_PREFIXES = {
  Academic: "ACA",
  Administrative: "ADM",
  GAD: "GAD",
  Extension: "EXT",
  Research: "RES",
  Students: "STU",
  Others: "OTH",
};

export const EVENT_REF_NUMBER_PATTERN = /^([A-Z]{2,4})-(\d{4})-(\d+)$/;

/** Fiscal year an event belongs to — taken from its start date. */
export const eventYearFromDate = (date) => {
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
};

/** Builds an event reference number, e.g. `formatEventRefNumber("GAD", 2025, 1)`. */
export const formatEventRefNumber = (type, year, sequence) => {
  const prefix = EVENT_TYPE_PREFIXES[String(type ?? "").trim()];
  const yearNumber = Number(year);
  const sequenceNumber = Number(sequence);

  if (!prefix) return "";
  if (!Number.isFinite(yearNumber) || !Number.isInteger(yearNumber)) return "";
  if (!Number.isFinite(sequenceNumber) || sequenceNumber < 1) return "";

  return `${prefix}-${yearNumber}-${String(
    Math.floor(sequenceNumber),
  ).padStart(3, "0")}`;
};

/** Parses `GAD-2025-001` into `{ prefix, year, sequence }`; null when malformed. */
export const parseEventRefNumber = (value) => {
  const match = String(value ?? "").trim().match(EVENT_REF_NUMBER_PATTERN);
  if (!match) return null;

  /* Only accept prefixes that belong to a type of activity, so project
     numbers (`GPB-...`) can never be mistaken for event numbers. */
  const prefix = match[1];
  if (!Object.values(EVENT_TYPE_PREFIXES).includes(prefix)) return null;

  return {
    prefix,
    year: Number(match[2]),
    sequence: Number(match[3]),
  };
};

/** Highest sequence used for this type of activity in `year`; 0 when none. */
export const highestEventSequence = (refs, type, year) => {
  const prefix = EVENT_TYPE_PREFIXES[String(type ?? "").trim()];
  const yearNumber = Number(year);
  let highest = 0;

  if (!prefix) return 0;

  for (const ref of Array.isArray(refs) ? refs : []) {
    const parsed = parseEventRefNumber(ref);
    if (!parsed || parsed.prefix !== prefix || parsed.year !== yearNumber) {
      continue;
    }
    if (parsed.sequence > highest) highest = parsed.sequence;
  }

  return highest;
};

/** Next free event reference number for `(type, year)`. */
export const nextEventRefNumber = (type, year, refs) =>
  formatEventRefNumber(type, year, highestEventSequence(refs, type, year) + 1);

/**
 * Project-module reference numbers.
 *
 * Format: `<PREFIX>-<year>-<sequence>`, e.g. `RNE-2025-001` for a Research &
 * Extension project and `ACD-2025-001` for an Academic project. The GPB
 * helpers above keep their original behaviour; these generalise the same
 * scheme so every project module gets its own independent sequence per year.
 */

/** Reserved prefix per project module — GPB stays the GAD plan & budget one. */
export const PROJECT_TYPE_PREFIXES = {
  GPB: "GPB",
  RNE: "RNE",
  ACD: "ACD",
};

export const PROJECT_REF_NUMBER_PATTERN = /^([A-Z]{2,4})-(\d{4})-(\d+)$/;

/** Resolves a prefix key (case-insensitive) to its canonical value, "" if unknown. */
const resolveProjectPrefix = (value) =>
  PROJECT_TYPE_PREFIXES[String(value ?? "").trim().toUpperCase()] || "";

/** Builds `formatProjectRefNumber("RNE", 2025, 1)` → `"RNE-2025-001"`. */
export const formatProjectRefNumber = (prefix, year, sequence) => {
  const resolved = resolveProjectPrefix(prefix);
  const yearNumber = Number(year);
  const sequenceNumber = Number(sequence);

  if (!resolved) return "";
  if (!Number.isFinite(yearNumber) || !Number.isInteger(yearNumber)) return "";
  if (!Number.isFinite(sequenceNumber) || sequenceNumber < 1) return "";

  return `${resolved}-${yearNumber}-${String(
    Math.floor(sequenceNumber),
  ).padStart(3, "0")}`;
};

/** Parses `RNE-2025-001` into `{ prefix, year, sequence }`; null when malformed. */
export const parseProjectRefNumber = (value) => {
  const match = String(value ?? "").trim().match(PROJECT_REF_NUMBER_PATTERN);
  if (!match) return null;

  /* Only accept prefixes that belong to a project module, so event numbers
     (`GAD-...`, `ACA-...`) can never be mistaken for project numbers. */
  const prefix = match[1];
  if (!Object.values(PROJECT_TYPE_PREFIXES).includes(prefix)) return null;

  return {
    prefix,
    year: Number(match[2]),
    sequence: Number(match[3]),
  };
};

/** Highest sequence used for this project prefix in `year`; 0 when none. */
export const highestProjectSequence = (refs, prefix, year) => {
  const resolved = resolveProjectPrefix(prefix);
  const yearNumber = Number(year);
  let highest = 0;

  if (!resolved) return 0;

  for (const ref of Array.isArray(refs) ? refs : []) {
    const parsed = parseProjectRefNumber(ref);
    if (!parsed || parsed.prefix !== resolved || parsed.year !== yearNumber) {
      continue;
    }
    if (parsed.sequence > highest) highest = parsed.sequence;
  }

  return highest;
};

/** Next free project reference number for `(prefix, year)`. */
export const nextProjectRefNumber = (prefix, year, refs) =>
  formatProjectRefNumber(
    prefix,
    year,
    highestProjectSequence(refs, prefix, year) + 1,
  );
