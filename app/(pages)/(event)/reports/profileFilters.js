/* Gender Profile Report filters. Model: { [fieldValue]: string[] } holding the
   values to INCLUDE. Flag fields use ["Yes"] or ["No"]. Pure, node-testable.
   Only small-list fields are filterable; College/Program/Department and the
   identifying fields (name, IDs, email, birthday) are deliberately excluded. */
import { FIELD_BY_VALUE, FIELD_DEFS, UNSPECIFIED } from "./profileFieldDefs.js";
import { isAvailable } from "./profileReportFields.js";

export const PROFILE_FILTER_KINDS = {
  sex: "values",
  age: "values",
  yearLevel: "values",
  positionLevel: "values",
  personnelType: "values",
  academicRank: "values",
  appointmentStatus: "values",
  campus: "values",
  civilStatus: "values",
  religion: "values",
  genderIdentity: "values",
  income: "values",
  scholar: "flag",
  pwd: "flag",
  indigenous: "flag",
  soloParent: "flag",
};

export const FLAG_OPTIONS = ["Yes", "No"];

export const isFilterable = (population, value) =>
  Boolean(PROFILE_FILTER_KINDS[value]) &&
  Boolean(FIELD_BY_VALUE[value]) &&
  isAvailable(FIELD_BY_VALUE[value], population);

/** The value a record contributes to a field's filter. */
export function filterValueOf(def, record) {
  if (def.group) return def.group(record);
  const v = def.get(record);
  return v === "—" || v == null || v === "" ? UNSPECIFIED : String(v);
}

function sortOptions(def, values) {
  return values.sort((a, b) => {
    if ((a === UNSPECIFIED) !== (b === UNSPECIFIED)) {
      return a === UNSPECIFIED ? 1 : -1;
    }
    if (def.rank) {
      const diff = def.rank(a) - def.rank(b);
      if (diff !== 0) return diff;
    }
    return a.localeCompare(b);
  });
}

/** { [field]: [{ value, count }] } for every filterable field of the
    population. Value fields list only values present in the records. */
export function profileFilterOptions(population, records = []) {
  const options = {};
  FIELD_DEFS.forEach((def) => {
    if (!isFilterable(population, def.value)) return;
    const counts = new Map();
    if (PROFILE_FILTER_KINDS[def.value] === "flag") {
      FLAG_OPTIONS.forEach((o) => counts.set(o, 0));
    }
    records.forEach((r) => {
      const v = filterValueOf(def, r);
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    options[def.value] = sortOptions(def, [...counts.keys()]).map((value) => ({
      value,
      count: counts.get(value),
    }));
  });
  return options;
}

/** Drops filters for unknown, ineligible or empty selections. */
export function normalizeProfileFilters(population, filters = {}) {
  const clean = {};
  FIELD_DEFS.forEach((def) => {
    const selected = filters[def.value];
    if (Array.isArray(selected) && selected.length && isFilterable(population, def.value)) {
      clean[def.value] = [...selected];
    }
  });
  return clean;
}

/** Keeps records matching every filter (OR within a field, AND across). */
export function applyProfileFilters(population, records, filters = {}) {
  const active = Object.entries(normalizeProfileFilters(population, filters));
  if (!active.length) return records;
  return records.filter((record) =>
    active.every(([value, allowed]) =>
      allowed.includes(filterValueOf(FIELD_BY_VALUE[value], record)),
    ),
  );
}

/** e.g. "Scholar = Yes; Campus: Boac, Gasan" (empty string when none). */
export function profileFilterSummary(population, filters = {}) {
  const clean = normalizeProfileFilters(population, filters);
  return FIELD_DEFS.filter((d) => clean[d.value])
    .map((d) =>
      PROFILE_FILTER_KINDS[d.value] === "flag"
        ? `${d.label} = ${clean[d.value][0]}`
        : `${d.label}: ${clean[d.value].join(", ")}`,
    )
    .join("; ");
}
