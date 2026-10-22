import { academicYearRange } from "./academicYear.js";

/**
 * Reads the org chart from the TERM model (Official + OfficialTerm + Position)
 * and presents it in the row shape the University Officials page already
 * consumes: `{ _id, academic_year, header, name, official, official_text }`.
 *
 * WHY THIS EXISTS
 * The snapshot model stored "who holds a seat" as a new document every August
 * (`universityofficials`, keyed on `academic_year`). That collection has been
 * migrated into OfficialTerm and emptied, so it now returns 0 rows — which is
 * exactly why the page rendered "No roster yet" and 0 assigned while the data
 * was sitting in `officialterms` all along.
 *
 * The row shape is deliberately the legacy one. Every consumer
 * (lib/universityOfficialsMerge.js, the reports, the GPB signatory lookup)
 * reads `{ header, name, official }`, so projecting back to that shape moves
 * the whole surface onto the term model without touching any of them.
 *
 * TENURE IS A RANGE, NOT A TAG
 * A term says "held this seat from 2024-08-01 until …", so "who held it in
 * 2026-2027" is an AS-OF test at the year's opening (1 August of its first
 * year), not an equality on a stored year. That is the point of the migration:
 * a term spanning three years is stored once and appears in all three.
 */

/** AY string -> the term `startDate` a brand-new appointment gets (1 August). */
export function termStartForAcademicYear(academicYear) {
  // Appointments open with the academic year, which begins in August.
  return academicYearAsOf(academicYear);
}

/**
 * The instant to read the roster AT, for an academic year.
 *
 * This is the crux of reading dated terms as a per-year chart. The source data
 * tags an appointment that opens in August of year Y to academic year
 * "Y–(Y+1)": `startDate` 2025-08-01 carries `academic_year: "2025-2026"`, and
 * 2026-08-01 carries "2026-2027". So the roster for a year is "who held the
 * seat when the academic year opened", and the academic year opens in AUGUST.
 *
 * `academicYearRange` deliberately starts 1 June instead, because it describes
 * the whole appointment cycle including the June–July handover. Anchoring the
 * roster at 1 June would ask who held each seat during the turnover gap — the
 * predecessor has already gone and the successor has not started — and would
 * report an empty chart for the year, or last year's holders beside this
 * year's. August is the month the appointments themselves use.
 *
 * @returns {Date|null} 1 August of the opening year, or null if malformed
 */
export function academicYearAsOf(academicYear) {
  const range = academicYearRange(academicYear);
  if (!range) return null;
  const openingYear = range.start.getUTCFullYear();
  return new Date(Date.UTC(openingYear, 7, 1)); // 1 August
}

/**
 * The filter that puts a term on an academic year's roster.
 *
 * The chart shows ONE instant: who held the seat when the year opened. A term
 * that ended before that instant is the predecessor, and one that begins after
 * it is the successor, so only the appointment actually running belongs on the
 * page.
 *
 * Anchoring at the year's own opening (1 August — see academicYearAsOf) rather
 * than at `academicYearRange`'s 1-June start is what keeps the years clean: the
 * 146 appointments that ended 2026-07-31 would otherwise fall inside
 * 2026-2027's June-to-May window and appear beside that year's own holders.
 *
 * `endDate: null` means still in office, so it satisfies the test for every
 * year after its start — the case the snapshot model could not express.
 *
 * @returns {Object|null} a Mongo filter, or null when the year is malformed
 */
export function termOverlapFilter(academicYear) {
  return termAsOfFilter(academicYearAsOf(academicYear));
}

/**
 * The seat holder as of an arbitrary date — the same test, exposed for
 * callers that need a different instant (e.g. "who held this on 1 Jan 2026").
 */
export function termAsOfFilter(asOfDate) {
  // `new Date(null)` is the epoch, a valid date, so nullish input must be
  // rejected here rather than by an isNaN check — otherwise a malformed year
  // produced a filter matching everything up to 1970 instead of no filter.
  if (asOfDate === null || asOfDate === undefined || asOfDate === "") return null;
  const at = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  if (Number.isNaN(at.getTime())) return null;
  return {
    startDate: { $lte: at },
    $or: [{ endDate: null }, { endDate: { $gte: at } }],
  };
}

/**
 * Whether a resolved term row belongs to the academic year being viewed.
 *
 * The same as-of test the aggregation applies, in plain JavaScript, so callers
 * holding already-fetched rows (history, movement reports) reach the same
 * verdict as the database without a second query.
 *
 * @param {{ startDate?: Date|string|null, endDate?: Date|string|null }} row
 * @param {string} academicYear "YYYY-YYYY"
 */
export function isTermInAcademicYear(row, academicYear) {
  const asOf = academicYearAsOf(academicYear);
  if (!asOf || !row) return false;
  const start = row.startDate ? new Date(row.startDate) : null;
  const end = row.endDate ? new Date(row.endDate) : null;
  if (!start || Number.isNaN(start.getTime())) return false;
  // Must have begun by the moment the year opened...
  if (start > asOf) return false;
  // ...and not already have ended by then.
  if (end && end < asOf) return false;
  return true;
}

/**
 * The aggregation that produces roster rows for one academic year.
 *
 * Positions are joined by `_id` (OfficialTerm.position is a ref), then flattened
 * so `header`/`name` sit at the top level like the old documents did. An
 * unpivoted `official` keeps the field present-but-null when the person was
 * never linked to a UserAuth account, matching the legacy contract where the
 * field was `null` and `official_text` carried a typed name.
 *
 * @param {string} academicYear e.g. "2026-2027"
 * @returns {Array|null} pipeline, or null when the year is malformed
 */
export function rosterPipeline(academicYear) {
  const filter = termOverlapFilter(academicYear);
  if (!filter) return null;
  return [
    { $match: filter },
    {
      $lookup: {
        from: "positions",
        localField: "position",
        foreignField: "_id",
        as: "__position",
      },
    },
    // A term whose position was hard-deleted has no header to file it under.
    // Positions are soft-retired precisely so this cannot happen; dropping the
    // row rather than emitting a headerless one keeps the chart well-formed.
    { $unwind: "$__position" },
    {
      $lookup: {
        from: "officials",
        localField: "official",
        foreignField: "_id",
        as: "__official",
      },
    },
    { $unwind: { path: "$__official", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        academic_year: { $literal: academicYear },
        header: "$__position.header",
        name: "$__position.name",
        official: "$__official._id",
        official_text: { $ifNull: ["$__official.name", ""] },
        status: 1,
        startDate: 1,
        endDate: 1,
      },
    },
    { $sort: { header: 1, name: 1 } },
  ];
}

/**
 * Maps one aggregation row onto the legacy document shape, renaming the seat
 * holder fields so consumers that read `official_text` keep working.
 *
 * The aggregation already emits the right names; this exists as the single
 * place the shape is asserted, and as the pure function the unit tests target.
 */
export function toRosterRow(row) {
  if (!row) return null;
  return {
    _id: row._id,
    academic_year: row.academic_year,
    header: row.header,
    name: row.name,
    official: row.official ?? null,
    official_text: String(row.official_text || "").trim(),
    // Carried through for callers that want to render tenure; the legacy
    // documents had no dates, so anything reading only the old fields is
    // unaffected by their presence.
    status: row.status || "substantive",
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
  };
}

/**
 * The academic years the term model can answer for, newest first.
 *
 * Derived from term dates rather than a stored `academic_year` field, because
 * terms no longer carry one — a term is a span. Each distinct start date is
 * converted to the academic year it opened in.
 *
 * @param {Date[]} startDates distinct `startDate` values from officialterms
 * @returns {string[]} "YYYY-YYYY" strings, newest first
 */
export function academicYearsFromTermStarts(startDates) {
  const years = new Set();
  (Array.isArray(startDates) ? startDates : []).forEach((value) => {
    const date = toUtcDate(value);
    if (!date) return;
    // A term opening in June/July belongs to the year that is about to start;
    // the AY boundary is August, matching currentAcademicYear().
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    const start = month >= 7 ? year : year - 1;
    years.add(`${start}-${start + 1}`);
  });
  return [...years].sort((a, b) => b.localeCompare(a));
}

/**
 * The aggregation behind one seat's tenure trail.
 *
 * The same joins as `rosterPipeline`, but for a single `{ header, name }` seat
 * and across ALL time: no year filter, because the question this answers is
 * "everyone who ever held this seat, earliest first" rather than "who holds it
 * now". Rows carry their own dates so the caller can render the spans.
 *
 * A seat is identified by its Position, not by an id on the term — the caller
 * knows the seat by name (that is what the chart shows), so the position is
 * matched on `{ header, name }` and the terms are then gathered by ref.
 *
 * Positions are looked up with `$match` before `$lookup` rather than filtered
 * after, so a seat that was renamed or removed yields an empty trail instead of
 * an unpivoted duplicate.
 *
 * @param {{ header?: string, name?: string }} seat
 * @returns {Array|null} pipeline, or null when the seat is not fully specified
 */
export function seatHistoryPipeline({ header, name } = {}) {
  const headerText = String(header || "").trim();
  const nameText = String(name || "").trim();
  if (!headerText || !nameText) return null;
  return [
    { $match: { header: headerText, name: nameText } },
    {
      $lookup: {
        from: "officialterms",
        localField: "_id",
        foreignField: "position",
        as: "__terms",
      },
    },
    { $unwind: "$__terms" },
    {
      $lookup: {
        from: "officials",
        localField: "__terms.official",
        foreignField: "_id",
        as: "__official",
      },
    },
    { $unwind: { path: "$__official", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: "$__terms._id",
        header: 1,
        name: 1,
        official: "$__official._id",
        official_text: { $ifNull: ["$__official.name", ""] },
        status: { $ifNull: ["$__terms.status", "substantive"] },
        startDate: "$__terms.startDate",
        endDate: "$__terms.endDate",
        isOpen: { $ifNull: ["$__terms.isOpen", false] },
      },
    },
    // Earliest first: a tenure trail reads forwards in time.
    { $sort: { startDate: 1 } },
  ];
}

/**
 * Maps a term row onto the shape the timeline renders.
 *
 * `academic_year` is derived from the term's own start date rather than read
 * from a stored field, so a span that crosses years still reports the year it
 * opened in — the same convention `academicYearsFromTermStarts` uses.
 */
export function toHistoryEntry(row) {
  if (!row) return null;
  const start = toUtcDate(row.startDate);
  const end = toUtcDate(row.endDate);
  return {
    _id: row._id,
    header: row.header,
    name: row.name,
    official: row.official ?? null,
    official_text: String(row.official_text || "").trim(),
    status: row.status || "substantive",
    startDate: start ? start.toISOString() : null,
    endDate: end ? end.toISOString() : null,
    /* An open term has no end date; the trail shows it as "present" instead of
       an ever-growing span. A row whose dates are both missing is NOT open —
       nothing declares it current, and a dateless term would otherwise render a
       phantom "Current" badge next to an empty name. */
    isOpen: Boolean(row.isOpen) || Boolean(start && !end),
    academic_year: start ? academicYearForStart(start) : null,
  };
}

/**
 * The academic year a term opened in, from its start date.
 * August is the boundary, matching `academicYearsFromTermStarts`.
 */
export function academicYearForStart(value) {
  const date = toUtcDate(value);
  if (!date) return null;
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 7 ? year : year - 1;
  return `${start}-${start + 1}`;
}

/**
 * Coerces a value to a Date read in UTC, or null when it is not a date.
 *
 * Two traps this closes, both of which silently produced wrong years:
 *   - `new Date(null)` is the epoch (a VALID date), so a nullish input has to be
 *     rejected before the constructor rather than by an isNaN check after it.
 *   - A bare "YYYY-MM-DD" string is parsed as LOCAL midnight, so read back with
 *     getUTCMonth() in a timezone behind UTC it reports the previous day and
 *     lands the appointment in the wrong academic year. Term dates are stored as
 *     UTC midnight, so strings are normalized to UTC midnight to match.
 */
function toUtcDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (dateOnly) {
      return new Date(
        Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])),
      );
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
