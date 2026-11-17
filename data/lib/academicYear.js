/**
 * Academic-year helpers for University Officials + GFPS snapshots.
 *
 * Convention: academic year is a "YYYY-YYYY" string (e.g. "2025-2026"),
 * matching the existing `school_year` / `active_term.school_year` format
 * used across profiles, settings and reports. GPB uses a single Number
 * fiscal year, so `gpbYearToAY` bridges the two.
 */

export const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;

/** Normalizes "2025-2026" (trims); returns null when invalid. */
export function normalizeAcademicYear(value) {
  const v = String(value ?? "").trim();
  const match = v.match(ACADEMIC_YEAR_PATTERN);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (second !== first + 1) return null;
  return `${first}-${second}`;
}

/** True when the value is a valid "YYYY-YYYY" academic year. */
export function isAcademicYear(value) {
  return normalizeAcademicYear(value) !== null;
}

/**
 * Computes the academic year containing `date`.
 * PH convention: AY starts in August. Aug 2026–Jul 2027 => "2026-2027".
 */
export function currentAcademicYear(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const month = d.getMonth(); // 0-based; 7 = August
  const year = d.getFullYear();
  const start = month >= 7 ? year : year - 1;
  return `${start}-${start + 1}`;
}

/** Bridges GPB fiscal year Number -> AY string. 2025 => "2025-2026". */
export function gpbYearToAY(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  return `${y}-${y + 1}`;
}

/** Bridges AY string -> GPB fiscal year Number. "2025-2026" => 2025. */
export function ayToGpbYear(academicYear) {
  const normalized = normalizeAcademicYear(academicYear);
  if (!normalized) return null;
  return Number(normalized.slice(0, 4));
}

/**
 * Resolution order for API routes:
 *   1. explicit ?academic_year= query
 *   2. active_term.school_year from SystemSetting
 *   3. computed currentAcademicYear()
 */
export function resolveAcademicYear({ query, activeTerm } = {}) {
  return (
    normalizeAcademicYear(query) ||
    normalizeAcademicYear(activeTerm) ||
    currentAcademicYear()
  );
}

/** Sorts AY strings newest-first for dropdowns. */
/**
 * The date span an academic year covers, for querying date-based records.
 *
 * OfficialTerm expresses tenure as `startDate`/`endDate`, not as a per-year
 * snapshot, so "who held this seat in 2026-2027" is a range overlap rather than
 * an equality on a stored year. The span runs 1 June of the opening year to
 * 31 May of the closing year: the Philippine academic year opens around August
 * and the term of office turns over in June, so the window covers the whole
 * appointment cycle without overlapping the next one.
 *
 * Returns null for anything that is not a well-formed "YYYY-YYYY" year, so a
 * caller can fall back rather than silently matching nothing.
 */
export function academicYearRange(academicYear) {
  const match = ACADEMIC_YEAR_PATTERN.exec(String(academicYear || "").trim());
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) return null;
  return {
    start: new Date(Date.UTC(startYear, 5, 1)), // 1 June, opening year
    end: new Date(Date.UTC(endYear, 4, 31, 23, 59, 59, 999)), // 31 May, closing year
  };
}

export function sortAcademicYearsDesc(years) {
  return [...new Set((years || []).map(normalizeAcademicYear).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a),
  );
}

/**
 * The year to label counts with, given the years several responses resolved.
 *
 * Each list endpoint resolves the year independently (explicit query, else the
 * active term, else the current year) and reports which one it used. A host
 * page showing numbers from more than one endpoint should take the first year
 * any of them resolved rather than re-deriving it locally from row fields: the
 * office rows do not carry an `academic_year`, so a local derivation silently
 * yields `""` and mislabels the counts.
 *
 * Candidates are in preference order. Only well-formed years are returned, so a
 * pending/empty response is skipped rather than winning.
 *
 * @param {...(string|null|undefined)} candidates years, most authoritative first
 * @returns {string} a normalized "YYYY-YYYY" year, or "" if none is known
 */
export function pickResolvedAcademicYear(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeAcademicYear(candidate);
    if (normalized) return normalized;
  }
  return "";
}
