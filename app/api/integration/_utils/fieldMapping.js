/* Column names an admin has mapped to fields, for sources whose column
   names the built-in list does not know. One mapping for every source
   (uploads and the HRMIS feed); stored apart from the HRMIS config so
   saving one never overwrites the other. */
import SystemSetting from "@/models/systemSetting";
import { HEADER_FIELDS, looseHeader } from "@/app/api/integration/_utils/headerMap";

export const FIELD_MAPPING_KEY = "integration_field_mapping";
export const MAX_MAPPED_COLUMNS = 100;
const MAX_COLUMN_LENGTH = 100;
const FIELD_KEYS = new Set(HEADER_FIELDS.map((f) => f.key));

/** { "Source column": "field_key" } saved by an admin; {} when none. */
export async function loadFieldMapping() {
  const setting = await SystemSetting.findOne({ key: FIELD_MAPPING_KEY }).lean();
  const columns = setting?.value?.columns;
  return columns && typeof columns === "object" && !Array.isArray(columns)
    ? columns
    : {};
}

/**
 * Checks a mapping sent by the page: a list of { column, field }.
 * Returns { columns } (trimmed, as an object) or { error }.
 */
export function parseFieldMapping(entries) {
  if (!Array.isArray(entries)) {
    return { error: "The mapping must be a list of column and field pairs." };
  }
  if (entries.length > MAX_MAPPED_COLUMNS) {
    return { error: `At most ${MAX_MAPPED_COLUMNS} columns can be mapped.` };
  }
  const columns = {};
  const seen = new Map();
  for (const entry of entries) {
    const column = String(entry?.column ?? "").trim();
    const field = String(entry?.field ?? "").trim();
    if (!column && !field) continue;
    if (!column) return { error: "Every mapped field needs a column name." };
    if (column.length > MAX_COLUMN_LENGTH) {
      return { error: `Column names can be at most ${MAX_COLUMN_LENGTH} characters.` };
    }
    if (!looseHeader(column)) {
      return { error: `"${column}" needs at least one letter or digit.` };
    }
    if (!FIELD_KEYS.has(field)) {
      return { error: `Pick a field for the column "${column}".` };
    }
    /* Matching ignores case, spaces and punctuation, so "Emp No" and
       "EMP-NO" are the same column. */
    const loose = looseHeader(column);
    if (seen.has(loose)) {
      return {
        error: `"${column}" and "${seen.get(loose)}" are the same column (case, spaces and punctuation are ignored).`,
      };
    }
    seen.set(loose, column);
    columns[column] = field;
  }
  return { columns };
}
