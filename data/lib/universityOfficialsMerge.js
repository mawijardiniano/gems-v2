import { HEADERS } from "./universityOfficialsConstants.js";

/**
 * Values for Official.sex (models/official.js reads this list). Lowercase in
 * storage; OFFICIAL_SEX_LABELS is what screens show. Kept here, not in the
 * model, because this module is safe to import in the browser.
 */
export const OFFICIAL_SEX_VALUES = ["female", "male", "unspecified"];

export const OFFICIAL_SEX_LABELS = {
  female: "Female",
  male: "Male",
  unspecified: "Not set",
};

/** Any input to a stored sex value; unknown or empty is "unspecified". */
export function normalizeOfficialSex(value) {
  const v = String(value || "").trim().toLowerCase();
  return OFFICIAL_SEX_VALUES.includes(v) ? v : "unspecified";
}

/**
 * Counts filled seats by the holder's sex. Counted per seat, not per person:
 * someone holding two seats counts twice, matching "seats held by women".
 *
 * @param {Array} rows chart rows (`{ official }`) or roster rows (`{ sex }`)
 * @returns {{ female: number, male: number, unspecified: number, total: number }}
 */
export function countOfficialsBySex(rows) {
  const out = { female: 0, male: 0, unspecified: 0, total: 0 };
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row) continue;
    /* Roster rows carry `sex` themselves (their `official` is an id); chart
       rows nest the roster row under `official`. */
    const sex = normalizeOfficialSex(
      row.sex !== undefined ? row.sex : row.official?.sex,
    );
    out[sex] += 1;
    out.total += 1;
  }
  return out;
}

/**
 * Assigned-only roster join (temporary mode).
 *
 * Offices (header) are saved; positions are manually encoded and
 * inconsistent, so there is no fixed seat catalog here. Every assignment
 * is shown grouped by header; vacant tracking is disabled.
 *
 * @param {Array} assignments Lean/populated UniversityOfficial documents
 *   shaped `{ header, name, official, official_text }`.
 * @returns {{
 *   rows: Array,          // one row per assignment, each with `official`
 *   byHeader: Array,      // [{ header, seats, filled, total }]
 *   unlisted: Array,      // always [] in assigned-only mode
 *   stats: { seats, filled, vacant }
 * }}
 */
export function buildOrgChart(assignments) {
  const roster = Array.isArray(assignments) ? assignments.filter(Boolean) : [];

  const rows = roster.map((a, i) => ({
    header: a.header,
    name: a.name,
    key: String(a._id || `${a.header}::${a.name}::${i}`),
    official: a,
  }));

  const headers = [...new Set(rows.map((r) => r.header))];
  const byHeader = headers.map((header) => {
    const seats = rows.filter((row) => row.header === header);
    return { header, seats, filled: seats.length, total: seats.length };
  });

  return {
    rows,
    byHeader,
    unlisted: [],
    stats: { seats: 0, filled: rows.length, vacant: 0 },
  };
}

/** Finds an assigned row by header + seat name (assigned-only mode). */
export function findSeat({ header, name, position, title } = {}) {
  void HEADERS;
  const wanted = String(name || position || title || "").trim().toLowerCase();
  if (!header || !wanted) return null;
  return { header, name: name || position || title };
}

/** Human-friendly name: typed name first, then the populated `official` reference. */
export function getOfficialPersonName(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  if (user.official_text) return user.official_text;
  if (user.name_text) return user.name_text;
  const personal = user.personal_info_id?.personal;
  if (personal?.first_name || personal?.last_name) {
    return `${personal.first_name || ""} ${personal.last_name || ""}`.trim();
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return user.username || "";
}

/** True when the roster already has this header + seat name. */
export function isSeatFilled(assignments, seat) {
  const roster = Array.isArray(assignments) ? assignments : [];
  const wanted = String(seat?.name || seat?.position || seat?.title || "")
    .trim()
    .toLowerCase();
  if (!seat?.header || !wanted) return false;
  return roster.some(
    (a) =>
      a.header === seat.header &&
      String(a.name || a.position || a.title || "").trim().toLowerCase() === wanted,
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
 *  1. exact `name === "GAD Focal Person"` (case-insensitive)
 *  2. exact legacy `title`/`position` === "GAD Focal Person"
 *  3. name containing both "gad" and "focal"
 *  4. legacy fallback: first name containing "focal"
 *
 * @param {Array} assignments Lean/populated UniversityOfficial documents.
 * @returns {Object|null} The matching assignment, or null when none matches.
 */
export function findGadFocalOfficial(assignments) {
  const roster = Array.isArray(assignments) ? assignments.filter(Boolean) : [];
  if (!roster.length) return null;

  const seatText = (a) => String(a.name || a.position || a.title || "");

  const byName = roster.find((a) => seatText(a).trim().toLowerCase() === "gad focal person");
  if (byName) return byName;

  const byGadFocal = roster.find((a) => {
    const seat = seatText(a).toLowerCase();
    return seat.includes("gad") && seat.includes("focal");
  });
  if (byGadFocal) return byGadFocal;

  return roster.find((a) => seatText(a).toLowerCase().includes("focal")) || null;
}
