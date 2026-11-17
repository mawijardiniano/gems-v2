/**
 * Shared seat/person identity helpers for the 2026-2027 roster rebuild.
 *
 * Imported by both scripts/seed-positions.mjs and
 * scripts/migrate-officials-to-terms.mjs, so the seed and the migration can
 * never disagree about what a seat is called or when two people are the same
 * person.
 *
 * Two jobs:
 *   1. Seat wording — RENAMES / NEW_SEATS encode the 2026-2027 org chart,
 *      which is authoritative.
 *   2. Person identity — Official.name is unique, so the migration must fold
 *      "Dr. Maria Morena V. Santos" and "Maria Morena V. Santos" into one
 *      document (stripHonorifics / personKeyOf).
 *
 * NOTES — the 2026-2027 sheet is a *partial* chart. It lists 45 rows covering
 * only 5 of the 10 columns; EXECUTIVE OFFICIALS, PROGRAM CHAIRPERSONS and the
 * three MARSU branches do not appear in it at all (67 seats). Those columns
 * keep their existing wording. RENAMES therefore only renames seats the sheet
 * actually mentions, and missingUncoveredColumns() guards against a future
 * edit silently dropping them.
 *
 * The three Vice President rows that the sheet files under the column they
 * lead (rather than under EXECUTIVE OFFICIALS) are renamed IN PLACE — their
 * header stays EXECUTIVE OFFICIALS, so no tenure has to be re-pointed.
 */

/** Case/whitespace/punctuation-insensitive key for comparing seat names. */
export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Columns absent from the 2026-2027 sheet (67 seats) — wording is untouched. */
export const UNCOVERED_COLUMNS = [
  "EXECUTIVE OFFICIALS",
  "PROGRAM CHAIRPERSONS",
  "MARSU TORRIJOS BRANCH",
  "MARSU SANTA CRUZ BRANCH",
  "MARSU GASAN BRANCH",
];


/**
 * Honorifics and academic rank prefixes that appear on hand-typed rows but not
 * on vault rows ("Dr. Alfredo M. Ofrecio III" vs "Alfredo Mañas Ofrecio").
 *
 * Without stripping these the same person becomes two Official documents, which
 * silently splits their tenure across two timeline rows. The list is
 * longest-first so "Assoc. Prof. Dr." is consumed before "Dr.".
 */
const HONORIFICS = [
  "assoc. prof. dr.",
  "asst. prof. dr.",
  "assoc. prof.",
  "asst. prof.",
  "prof. dr.",
  "instr. dr.",
  "atty.",
  "prof.",
  "dr.",
  "engr.",
  "instr.",
  "mr.",
  "ms.",
  "mrs.",
  "arch.",
  "ar.",
];

/** Collapses runs of whitespace and trims. */
export const cleanName = (s) => String(s || "").trim().replace(/\s+/g, " ");

/** Strips leading honorifics: "Assoc. Prof. Dr. Susan B. Pineda" -> "Susan B. Pineda". */
export const stripHonorifics = (name) => {
  let out = cleanName(name);
  let changed = true;
  while (changed) {
    changed = false;
    const lower = out.toLowerCase();
    for (const h of HONORIFICS) {
      if (lower.startsWith(h)) {
        out = out.slice(h.length).trim();
        changed = true;
        break;
      }
    }
  }
  return out.replace(/^,\s*/, "").trim();
};

/**
 * Canonical person key that also collapses an abbreviated middle name onto its
 * full form, which is how the two data sources disagree:
 *
 *   vault (147 rows)  "Susan Barbosa Pineda"      full middle name
 *   typed (44 rows)   "Susan B. Pineda"           middle initial only
 *
 * Every observed pair keeps the SAME first and last token and agrees on the
 * middle initial, so the rule is positional, not fuzzy: first + last + initial.
 * Verified against all 35 near-miss pairs — no two distinct people collide.
 *
 * Suffixes (Jr/III) are dropped: "Leodegario M. Jalos, Jr." is the same person
 * as "Leodegario Magdalita Jalos".
 */
export const personKeyOf = (name) => {
  const tokens = stripHonorifics(name)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(iii|iv|jr|sr|ii)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!tokens.length) return "";
  /* Single token ("Madonna") — key on it alone rather than inventing structure. */
  if (tokens.length === 1) return tokens[0];
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const middle = tokens.slice(1, -1);
  /* First letter of the first middle token: "barbosa" -> "b" / "b" -> "b". */
  const initial = middle.length ? middle[0][0] : "";
  return `${first}|${initial}|${last}`;
};

/**
 * Guard: the columns the 2026-2027 sheet does not cover must still be present
 * after RENAMES/NEW_SEATS are applied. Returns the missing headers (empty =
 * ok) so a caller can abort rather than silently drop the President, the VPs,
 * the 43 Program Chairpersons or the three branch columns.
 */
export const missingUncoveredColumns = (headers) => {
  const present = new Set((headers || []).map(norm));
  return UNCOVERED_COLUMNS.filter((header) => !present.has(norm(header)));
};

/**
 * Seats the 2026-2027 sheet re-issues under new wording: "catalog wording"
 * -> "2026-2027 wording". Applied in place, so the seat keeps its header and
 * its tenure history stays continuous.
 */
export const RENAMES = {
  // OFFICE OF THE PRESIDENT
  "Executive Assistant": "Acting Executive Assistant",
  "Director, Quality Assurance Office": "Director, University Quality Assurance",
  "Head, Legal Services Unit": "Director, Legal Risk and Governance",
  "Head, Information Unit": "Director, External Relations and Partnerships",
  "Head, Planning and Development Unit": "Director, Policy Strategy and Performance",
  "Head, Internal Audit Service Unit": "Director, Internal Audit Services",

  // OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS
  "Dean, Graduate School": "Dean, Graduate Studies",
  "Dean, College of Education": "Dean, College of Teacher Education",
  "Dean, College of Arts and Social Sciences": "Dean, College of Arts and Sciences",
  "Dean, College of Allied Health Sciences":
    "Dean, College of Allied Health and Social Sciences",
  "Dean, College of Agriculture": "Dean, College of Agri-Ecosystem Solution",
  "Director, Curriculum and Instruction":
    "Director, Curriculum and Instructions Systems",

  // OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE
  "Director, Financial Services": "Director, Financial Management Services",
  "Head, Human Resource Management Unit":
    "Director, Human Resource Management and Development",
  "Head, Information, Communication & Technology Services Center":
    "Director, Information and Digital Systems",
  "Head, Physical Facilities & Project Management Unit": "Director, Project Management",
  "Head, General Services": "Director, Administrative and Gen. Services",

  // OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION
  "Director, Research": "Director, Research and Publication",
  "Director, Knowledge and Technology Transfer Office":
    "Director, Intellectual Property and Technology Transfer",
  "Director, Extension": "Director, Extension Services",

  // OFFICE OF THE VICE PRESIDENT FOR STUDENT AFFAIRS AND SERVICES
  "Head, Health Services Office": "Director, Health and Wellness",
  "Head, Admission and Registration Office": "Director, Admission and Transition Services",
  "Director, Student Welfare Office": "Director, Student Welfare and Well-being",
  "Director, Student Development Office":
    "Director, Student Development, Engagement and Governance",
  "Head, Career & Job Placement Services Office":
    "Director, Student Success and Career Services",

  // EXECUTIVE OFFICIALS — renamed in place, the header does NOT change even
  // though the 2026-2027 sheet files these rows under the column each leads.
  "Vice President for Student Affairs and Services": "Vice President for Student Services",
  "Vice President for Administration and Finance":
    "Vice President for Administration, Finance and Economic Enterprise",
  "Vice President for Research Development and Extension":
    "Vice President for Research, Innovation and Extension",
};

/**
 * Seats the 2026-2027 sheet introduces with no 2025-2026 predecessor. Added
 * as new active seats in their sheet column.
 */
export const NEW_SEATS = [
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS",
    name: "Director, Academic Support and Student Academic Records",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS",
    name: "Director, Institute of Physical Education",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE",
    name: "Director, Campus Operations and Systems Coordination, MarSU Sta. Cruz",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE",
    name: "Director, Campus Operations and Systems Coordination, MarSU Torrijos",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE",
    name: "Director, Campus Operations and Systems Coordination, MarSU Gasan",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE",
    name: "Administrator, Mogpog Extramural Study Center",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR ADMINISTRATION AND FINANCE",
    name: "Director, Economic Enterprise and Resource Generation",
  },
  {
    header: "OFFICE OF THE VICE PRESIDENT FOR RESEARCH AND EXTENSION",
    name: "Director, Campus RET Coordination",
  },
];

/**
 * The 2026-2027 wording for a seat, or the input unchanged when it is already
 * canonical. Matching is exact first, then punctuation/case-insensitive so a
 * stray comma in the source sheet still resolves.
 */
export const canonicalName = (name) => {
  const raw = String(name || "").trim();
  const direct = RENAMES[raw];
  if (direct) return direct;

  const key = norm(raw);
  const hit = Object.entries(RENAMES).find(([from]) => norm(from) === key);
  return hit ? hit[1] : raw;
};
