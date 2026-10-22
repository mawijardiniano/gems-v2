/**
 * Pure helpers for the Manageable Positions UI.
 *
 * Kept separate from lib/universityPositions.js on purpose: that module owns
 * the *migration* vocabulary (renames, honorific stripping, the 2026-2027
 * sheet) and is imported by scripts. This one only holds the list-view
 * behaviour — URL building, ordering and tab filtering — so it can be unit
 * tested with no DB, no bundler and no React.
 */

/** Case/whitespace/punctuation-insensitive key for comparing seat names. */
export const positionSearchKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Chart order: office column first, then the seat's own `sort_order`, then
 * name as a stable tie-breaker.
 *
 * `header` leads because the manager renders grouped columns; without it the
 * list would interleave seats from different offices. Seats missing
 * `sort_order` sort last inside their column rather than at position 0, which
 * is where a bare `a.sort_order - b.sort_order` would put them.
 */
export const sortPositions = (positions) =>
  [...(positions || [])].sort((a, b) => {
    const header = String(a?.header || "").localeCompare(String(b?.header || ""));
    if (header !== 0) return header;
    const ao = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : Infinity;
    const bo = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : Infinity;
    if (ao !== bo) return ao - bo;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });

/** Rows for one tab. "all" returns everything, inactive included. */
export const filterPositionsByTab = (positions, tab) => {
  const rows = sortPositions(positions);
  if (tab === "active") return rows.filter((p) => p.is_active !== false);
  if (tab === "inactive") return rows.filter((p) => p.is_active === false);
  return rows;
};

/** Query string for GET /api/positions. */
export const positionsUrl = ({
  includeCounts = false,
  includeInactive = false,
  academicYear = "",
} = {}) => {
  const params = new URLSearchParams();
  if (includeInactive) params.set("include_inactive", "true");
  if (includeCounts) params.set("include_counts", "true");
  if (academicYear) params.set("academic_year", academicYear);
  const qs = params.toString();
  return `/api/positions${qs ? `?${qs}` : ""}`;
};

/**
 * True when the seat name is ambiguous without its office column.
 *
 * "Head, Student Affairs and Services" exists in all three MARSU branches, so
 * a row that showed only the name would be indistinguishable from its
 * siblings. The manager always prints the header, and this drives the extra
 * emphasis when duplicates are actually present.
 */
export const hasAmbiguousName = (positions, seat) => {
  const key = positionSearchKey(seat?.name);
  if (!key) return false;
  return (positions || []).filter((p) => positionSearchKey(p?.name) === key).length > 1;
};

/** "3 assigned" / "vacant" — the per-seat occupancy label. */
export const assignedLabel = (seat) => {
  const n = Number(seat?.assigned_count || 0);
  if (!n) return "vacant";
  return `${n} assigned`;
};

/** "12 seats" / "1 seat" */
export const seatCountLabel = (n) => `${n} ${n === 1 ? "seat" : "seats"}`;
