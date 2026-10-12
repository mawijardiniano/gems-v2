import { CATALOG, HEADERS } from "./universityOfficialsConstants.js";

/**
 * Joins the code-side catalog of seats with the database-side roster of
 * assignments. Pure function: no DB, no React — used by the page, the print
 * view and the tests alike.
 *
 * @param {Array} assignments Lean/populated UniversityOfficial documents
 *   shaped `{ header, title, unit, position, name }`.
 * @returns {{
 *   rows: Array,          // every seat with `official` (or null when vacant)
 *   byHeader: Array,      // [{ header, seats, filled, total }]
 *   unlisted: Array,      // assignments that match no seat (renamed units)
 *   stats: { seats, filled, vacant }
 * }}
 */
export function buildOrgChart(assignments) {
  const roster = Array.isArray(assignments) ? assignments.filter(Boolean) : [];
  const matched = new Set();

  const rows = CATALOG.map((seat) => {
    const official =
      roster.find(
        (a) =>
          a.header === seat.header &&
          a.title === seat.title &&
          (a.unit || "") === seat.unit,
      ) || null;

    if (official) matched.add(official);

    return { ...seat, official };
  });

  const byHeader = HEADERS.map((header) => {
    const seats = rows.filter((row) => row.header === header);
    return {
      header,
      seats,
      filled: seats.filter((seat) => seat.official).length,
      total: seats.length,
    };
  });

  const filled = rows.filter((row) => row.official).length;

  return {
    rows,
    byHeader,
    unlisted: roster.filter((a) => !matched.has(a)),
    stats: { seats: rows.length, filled, vacant: rows.length - filled },
  };
}

/** Finds the catalog seat for an assignment payload, or null. */
export function findSeat({ header, title, unit } = {}) {
  return (
    CATALOG.find(
      (seat) =>
        seat.header === header &&
        seat.title === title &&
        seat.unit === (unit || ""),
    ) || null
  );
}

/** Human-friendly name from a populated `name` (UserAuth) reference. */
export function getOfficialPersonName(user) {
  if (!user) return "";
  const personal = user.personal_info_id?.personal;
  if (personal?.first_name || personal?.last_name) {
    return `${personal.first_name || ""} ${personal.last_name || ""}`.trim();
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return user.username || "";
}

/** True when the given seat already has a matching assignment in the roster. */
export function isSeatFilled(assignments, seat) {
  const roster = Array.isArray(assignments) ? assignments : [];
  return roster.some(
    (a) =>
      a.header === seat.header && a.title === seat.title && (a.unit || "") === seat.unit,
  );
}

/**
 * Finds the GPB / GAD-AR "Prepared By" signatory: the GAD Focal Person seat.
 *
 * Must NOT use a loose `position.includes("focal")` match — the catalog also
 * contains `Focal Person, Human Resource Services & Records Keeping` under
 * MARSU SANTA CRUZ BRANCH, and the officials API sorts `MARSU SANTA CRUZ...`
 * before `OFFICE OF THE PRESIDENT`, so `find(...includes("focal"))` returns
 * the wrong person whenever both seats are filled.
 *
 * Preference order:
 *  1. exact `title === "GAD Focal Person"` (case-insensitive)
 *  2. exact `position === "GAD Focal Person"` (covers legacy/untagged docs)
 *  3. position containing both "gad" and "focal"
 *  4. legacy fallback: first position containing "focal"
 *
 * @param {Array} assignments Lean/populated UniversityOfficial documents.
 * @returns {Object|null} The matching assignment, or null when none matches.
 */
export function findGadFocalOfficial(assignments) {
  const roster = Array.isArray(assignments) ? assignments.filter(Boolean) : [];
  if (!roster.length) return null;

  const byTitle = roster.find(
    (a) => String(a.title || "").trim().toLowerCase() === "gad focal person",
  );
  if (byTitle) return byTitle;

  const byPosition = roster.find(
    (a) => String(a.position || "").trim().toLowerCase() === "gad focal person",
  );
  if (byPosition) return byPosition;

  const byGadFocal = roster.find((a) => {
    const position = String(a.position || "").toLowerCase();
    return position.includes("gad") && position.includes("focal");
  });
  if (byGadFocal) return byGadFocal;

  return (
    roster.find((a) =>
      String(a.position || "").toLowerCase().includes("focal"),
    ) || null
  );
}
