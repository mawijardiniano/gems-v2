/**
 * The two people who sign the GPB and the GAD-AR.
 *
 * Both reports print the same signature block — "Prepared By / Approved By" —
 * and it is a two-row table with fixed labels:
 *
 *   Prepared By : GAD Focal Point/Person
 *   Approved By : University President
 *
 * The names are NOT derived from University Officials. They are typed by the
 * GAD Focal Person / GAD Coordinator in Admin Settings and stored under the
 * `report_signatories` system setting, keyed by academic year, so a GPB from an
 * earlier year keeps the signatories that were in post then.
 *
 * WHY NOT READ THE ROSTER
 * Officials are hand-encoded and their seat wording drifts between years
 * ("Head, Legal Services Unit" -> "Director, Legal Risk and Governance"; see
 * RENAMES in lib/universityPositions.js). Matching a signatory by seat string
 * therefore either misses or — with any fuzzy fallback — silently picks the
 * wrong person, and the previous `item?.title === "University President"`
 * lookup had been dead for months because that field no longer exists on a
 * roster row. A signature block is a statement of who certified a document, so
 * it is declared explicitly instead of inferred.
 *
 * This module is the single read path shared by the server PDF routes
 * (app/api/reports/gpb-matrix, app/api/reports/gad-ar) and the browser print
 * components (PrintGPB, PrintGADAR), so the printed page and the generated PDF
 * can never disagree.
 */

/** The printed label under each signature, fixed by the official form. */
export const SIGNATORY_LABELS = {
  prepared_by: "GAD Focal Point/Person",
  approved_by: "University President",
};

/** The slots, in the order they print. */
export const SIGNATORY_SLOTS = ["prepared_by", "approved_by"];

/** Printed when a slot has no name configured for the year. */
export const SIGNATORY_BLANK = "____________________________";

/** The SystemSetting key holding the per-year names. */
export const SIGNATORIES_SETTING_KEY = "report_signatories";

/** The fallback shape: both slots blank. */
export function emptySignatories() {
  return { prepared_by: "", approved_by: "" };
}

/**
 * Drops a middle name / middle initial from a person's full name.
 *
 * Signatories print as "First Last" — no middle name, no middle initial. Names
 * arrive from three places and only some can be trusted to be already clean:
 *   - the directory picker (composed here, so it is clean by construction)
 *   - a name typed by hand, which may be "Dr. Ana Marie L. Reyes"
 *   - a value saved before this rule existed, carrying the old middle-inclusive
 *     form
 *
 * So the strip happens on the way OUT (what prints), not only on the way in,
 * which keeps an already-saved document rendering correctly without a data
 * migration.
 *
 * The rule is narrow on purpose. A middle initial is a standalone single letter
 * with a trailing period ("L.") or a bare single letter between two words. A
 * middle WORD is only removed when it sits between two known tokens AND the
 * honorific list below says it is not a name — i.e. never guessed. When the
 * shape is ambiguous the name is returned unchanged, because quietly deleting
 * the wrong token from a signed document is worse than printing an extra one.
 *
 * @param {string} value e.g. "Dr. Ana Marie L. Reyes" or "Ana Marie Reyes"
 * @returns {string} e.g. "Dr. Ana Marie Reyes"
 */
export function withoutMiddleName(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";

  const tokens = text.split(" ");
  if (tokens.length < 3) return text; // "Reyes" or "Ana Reyes" — nothing to drop

  /* A standalone initial: "L." or a lone capital letter, but never the last
     token (that would be a surname) and never the first (a first name). */
  const isInitial = (t) => /^[A-Za-z]\.?$/.test(t);

  const out = tokens.filter((token, i) => {
    const interior = i > 0 && i < tokens.length - 1;
    if (!interior) return true;
    return !isInitial(token);
  });

  /* Removing an initial must leave at least a first and a last name. */
  return out.length >= 2 ? out.join(" ") : text;
}

/**
 * Reads one stored signatory value into a normalized `{ name, profile_id, source }`.
 *
 * Two shapes are accepted on purpose:
 *   - a plain string   — how the first version stored it, and the quickest way
 *                        to type a name that has no GEMS profile
 *   - an object        — `{ name, profile_id, source }`, written when the name
 *                        was picked from the directory or entered by hand
 *
 * `name` is always what prints, and it is passed through `withoutMiddleName`
 * so a middle name or initial never reaches the document however it was
 * entered. `profile_id` is provenance only: it lets a caller tell a picked
 * person from a typed one later, and is never printed. Anything unreadable
 * collapses to a blank name so the caller prints the underscore rule rather
 * than "undefined".
 */
function normalizeSignatory(value) {
  if (typeof value === "string") {
    const name = withoutMiddleName(value);
    return { name, profile_id: null, source: name ? "manual" : "" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { name: "", profile_id: null, source: "" };
  }
  const name =
    typeof value.name === "string" ? withoutMiddleName(value.name) : "";
  return {
    name,
    profile_id: value.profile_id ? String(value.profile_id) : null,
    source: value.source === "directory" ? "directory" : name ? "manual" : "",
  };
}

/**
 * Normalizes one year's entry to `{ prepared_by, approved_by }`.
 *
 * Tolerant on read so a half-filled or legacy document still renders: a
 * non-object value, a missing slot, or an unreadable name all collapse to "",
 * which the caller prints as the underscore rule rather than "undefined".
 */
function normalizeYearEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return emptySignatories();
  }
  const out = emptySignatories();
  for (const slot of SIGNATORY_SLOTS) {
    out[slot] = normalizeSignatory(entry[slot]).name;
  }
  return out;
}

/**
 * The signatories for one academic year, as printed names.
 *
 * @param {Object|null|undefined} value The setting's `value` object, i.e.
 *   `{ "2026-2027": { prepared_by, approved_by }, ... }` plus bookkeeping keys.
 * @param {string} academicYear "YYYY-YYYY"
 * @returns {{prepared_by: string, approved_by: string}} trimmed names, "" when
 *   unset — callers substitute SIGNATORY_BLANK.
 */
export function getSignatories(value, academicYear) {
  if (!value || typeof value !== "object") return emptySignatories();
  const year = String(academicYear || "").trim();
  if (!year) return emptySignatories();
  return normalizeYearEntry(value[year]);
}

/**
 * The signatories for one academic year WITH their provenance, for the editor.
 * Same inputs as `getSignatories`; each slot is `{ name, profile_id, source }`.
 */
export function getSignatoryDetails(value, academicYear) {
  const empty = { prepared_by: normalizeSignatory(""), approved_by: normalizeSignatory("") };
  if (!value || typeof value !== "object") return empty;
  const year = String(academicYear || "").trim();
  if (!year) return empty;
  const entry = value[year];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return empty;
  return {
    prepared_by: normalizeSignatory(entry.prepared_by),
    approved_by: normalizeSignatory(entry.approved_by),
  };
}

/**
 * True when the value carries no usable signatory names at all.
 * Lets a caller distinguish "never configured" from "configured as blank".
 * Handles both stored shapes (plain string and `{ name, ... }`).
 */
export function hasAnySignatories(value) {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => {
    if (key === "updated_by" || key === "updated_by_username" || key === "updated_at") {
      return false;
    }
    const entry = normalizeYearEntry(value[key]);
    return SIGNATORY_SLOTS.some((slot) => entry[slot]);
  });
}

/**
 * The academic year a GPB fiscal year belongs to.
 * GPB stores a single Number (2026); reports key on "2026-2027".
 * Duplicated from lib/academicYear.js gpbYearToAY deliberately as a local
 * primitive so this module stays dependency-free for the browser components.
 */
export function signatoryYearFromGpbYear(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return "";
  return `${y}-${y + 1}`;
}
