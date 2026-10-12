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
export function sortAcademicYearsDesc(years) {
  return [...new Set((years || []).map(normalizeAcademicYear).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a),
  );
}
