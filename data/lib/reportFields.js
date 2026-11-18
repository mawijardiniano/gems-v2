/* Helpers shared by the PDF report routes (GAD-AR, GPB matrix, projects and
   events status). Each route had its own copy. Pure. */

// Relative path (not "@/"), so node --test can load this file directly.
import { formatAmount } from "./money.js";

/** A plan field's value, whether stored plain or as `{ value }`. */
export function fieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
}

/** A plan field as a list of non-empty entries. */
export function fieldList(field) {
  const value = fieldValue(field);
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return [];
}

/** The order project types are grouped in on every GPB report. */
export const PROJECT_TYPE_ORDER = {
  "Client Focused": 0,
  "Organization Focused": 1,
  "Attributed Program": 2,
  Uncategorized: 3,
};

export function projectTypeLabel(project) {
  const raw = project?.project_type;
  const value = raw && typeof raw === "object" ? raw.value : raw;
  return PROJECT_TYPE_ORDER[value] !== undefined ? value : "Uncategorized";
}

/** Grouped by type in PROJECT_TYPE_ORDER; saved order kept within a type. */
export function orderProjectsByType(projects) {
  return [...(Array.isArray(projects) ? projects : [])].sort(
    (a, b) =>
      PROJECT_TYPE_ORDER[projectTypeLabel(a)] -
      PROJECT_TYPE_ORDER[projectTypeLabel(b)],
  );
}

/* The GAD Activity column stays a single column: each activity prints its
   title with its (index-paired) description on the following line. */
export function activityCellText(project, fallback = "") {
  const titles = fieldList(project?.gad_activity);
  const descriptions = fieldList(project?.gad_activity_description);
  return (
    titles
      .map((title, idx) =>
        descriptions[idx] ? `${title}\n${descriptions[idx]}` : title,
      )
      .join("\n") || fallback
  );
}

/* "Php 1,234.50": the PDFs' Times font has no peso sign. Two decimals, like
   every other screen (data/lib/money.js). */
export function pdfPeso(n) {
  return `Php ${formatAmount(Number(n) || 0)}`;
}
