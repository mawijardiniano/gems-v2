import { HEADERS } from "./universityOfficialsConstants.js";

/**
 * Pure helpers behind the "Office / Group" picker on the University Officials
 * page — no database, so they are unit-testable and shared by client + server.
 *
 * Offices live in the `universityoffices` collection as
 * `{ header, is_active, sort_order }`. The seeded list is the MarSU chart that
 * used to be hard-coded (lib/universityOfficialsConstants.js), kept here so a
 * fresh install has a usable roster and tests can assert against it.
 */

/** The seeded office list, in chart order. */
export const DEFAULT_OFFICES = HEADERS;

/** URL for the office list, with the optional per-office official counts. */
export const officesUrl = ({ includeCounts, includeInactive, academicYear } = {}) => {
  const params = new URLSearchParams();
  if (includeCounts) {
    params.set("include_counts", "true");
    if (academicYear) params.set("academic_year", academicYear);
  }
  // Inactive rows have to be requested explicitly; without this the list hides
  // them, which is what made a deactivated office look like it did not exist
  // while its name was still refused as a duplicate.
  if (includeInactive !== false) params.set("include_inactive", "true");
  return `/api/university-offices${params.toString() ? `?${params}` : ""}`;
};

/** Normalizes a typed office name: collapsed whitespace, trimmed. */
export const normalizeOfficeName = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

/** Case/space-insensitive identity for an office name. */
export const officeKey = (value) => normalizeOfficeName(value).toLowerCase();

/** True when the value is an office name we accept (non-empty after cleanup). */
export const isValidOfficeName = (value) =>
  normalizeOfficeName(value).length > 0;

/** True when the office already exists in the given list (any casing). */
export const officeExists = (offices, name) => {
  const key = officeKey(name);
  if (!key) return false;
  return (Array.isArray(offices) ? offices : []).some(
    (office) => officeKey(office?.header ?? office) === key,
  );
};

/**
 * Offices the picker may offer: active ones, plus the inactive ones when
 * `includeInactive` is on (shown greyed so they can be reactivated).
 */
export const selectableOffices = (offices, includeInactive = false) => {
  const list = Array.isArray(offices) ? offices.filter(Boolean) : [];
  const usable = includeInactive ? list : list.filter((o) => o.is_active !== false);
  return [...usable].sort((a, b) => {
    const order = (a.sort_order || 0) - (b.sort_order || 0);
    if (order !== 0) return order;
    return String(a.header).localeCompare(String(b.header));
  });
};

/** Looks an office up by name across active + inactive rows. */
export const findOffice = (offices, name) => {
  const key = officeKey(name);
  if (!key) return null;
  return (
    (Array.isArray(offices) ? offices : []).find(
      (office) => officeKey(office?.header) === key,
    ) || null
  );
};

/** True when the office exists and may take new assignments. */
export const isOfficeAssignable = (offices, name) => {
  const office = findOffice(offices, name);
  return Boolean(office && office.is_active !== false);
};

/**
 * Message for a refused add.
 *
 * The confusing case is an office that already exists but was deactivated: the
 * list hides inactive rows by default, so "already exists" reads as a lie. Name
 * the state and where to find the row instead.
 */
export const officeDuplicateMessage = (name, existing = null) => {
  // Prefer the stored header so the copy shows the office as it is actually
  // listed (`MARSU GASAN BRANCH`), not however the operator typed it.
  const label = normalizeOfficeName(existing?.header || name);
  if (existing && existing.is_active === false) {
    return `"${label}" already exists as an inactive office. Open the Inactive tab and reactivate it instead of adding it again.`;
  }
  return `"${label}" already exists in the office list.`;
};

/** True when a row is the inactive twin that blocks an add. */
export const needsReactivation = (office) =>
  Boolean(office) && office.is_active === false;

/** Builds the seed rows for a fresh install, in chart order. */
export const buildDefaultOfficeRows = () =>
  DEFAULT_OFFICES.map((header, index) => ({
    header,
    is_active: true,
    sort_order: index,
  }));

/**
 * Chart order for any office rows: `sort_order` first, name as the tie-break so
 * two rows added at the same position still land in a stable order.
 */
export const sortOffices = (offices) => {
  const list = Array.isArray(offices) ? offices.filter(Boolean) : [];
  return [...list].sort((a, b) => {
    const order = (a.sort_order || 0) - (b.sort_order || 0);
    if (order !== 0) return order;
    return String(a.header).localeCompare(String(b.header));
  });
};

/** True when a row may take new assignments (a row without the flag counts as active). */
export const isActiveOffice = (office) => office?.is_active !== false;

/**
 * Counts rows by state — drives the All / Active / Inactive tabs.
 *
 * `all` is the row count under the "All" tab, which the tabs read as
 * `summary[t.key]` with `t.key === "all"`. Without it that tab rendered
 * `All ()` — an empty pair of brackets — because the key was simply absent
 * and every other key (`total`) is used by the card's own badge instead.
 */
export const officeCounts = (offices) => {
  const list = Array.isArray(offices) ? offices.filter(Boolean) : [];
  const inactive = list.filter((o) => !isActiveOffice(o)).length;
  return {
    total: list.length,
    all: list.length,
    active: list.length - inactive,
    inactive,
  };
};

/**
 * Assigned-official count per office header, plus the All / Active / Inactive
 * tab numbers — one object so a card can render both without a second pass.
 *
 * `map` is keyed by header and holds the count the API reported
 * (`assigned_count`, already scoped to the roster being viewed). Rows that were
 * loaded without counts simply read 0, so a surface that only needs the picker
 * can pass its list through this without paying for a second request.
 */
export const officeCountsWithAssigned = (offices) => {
  const list = Array.isArray(offices) ? offices.filter(Boolean) : [];
  const summary = officeCounts(list);
  const map = {};
  list.forEach((office) => {
    if (office.header) map[office.header] = Number(office.assigned_count || 0);
  });
  return { ...summary, map };
};

/**
 * Offices for one tab: "all" | "active" | "inactive".
 *
 * The "all" tab is filtered by `options.includeInactive`, so the "Show inactive"
 * checkbox can hide deactivated rows without changing which rows were loaded —
 * the inactive tab still shows them, because that selection is explicit.
 */
export const filterOfficesByTab = (offices, tab = "all", options = {}) => {
  const includeInactive = options.includeInactive !== false;
  return sortOffices(offices).filter((office) =>
    tab === "active"
      ? isActiveOffice(office)
      : tab === "inactive"
        ? !isActiveOffice(office)
        : includeInactive || isActiveOffice(office),
  );
};

/** Explicit name so the shared imports read the same everywhere. */
export const normalizeOfficeInput = normalizeOfficeName;

/**
 * Copy for the deactivation confirm. There are two steps: the first call (no
 * `occupied` yet) warns that the office disappears from the picker, the second
 * one reports the seats the API refused to hide.
 */
export const officeDeactivateWarning = (name, occupied = 0, year = "") =>
  `Deactivate "${name}"?${
    occupied
      ? ` ${occupied} assigned official(s)${year ? ` in AY ${year}` : ""} will be hidden from the chart.`
      : " It will be hidden from the office picker."
  }`;

/** Second-step confirm shown when the API refuses to hide assigned seats. */
export const officeDeactivateForcePrompt = (name, occupied = 0) =>
  `${occupied} official(s) are still assigned to "${name}". Deactivate anyway? Assignments stay in the record for past years.`;
