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

/* The GAD-AR leaves "Actual Result" blank for an Attributed Program. The
   page, the browser print and the PDF all ask this, so they cannot disagree
   (the page used to show it while both printed versions left it blank). */
export function isActualResultReported(project) {
  return projectTypeLabel(project) !== "Attributed Program";
}

/* "12.34%" of `base`, for the GAD-AR budget block. A year with no GAA budget
   encoded yet reads "To follow", like the amounts beside it, instead of a
   "0.00%" that looks like a real figure. */
export function budgetPercent(amount, base, hasBudget) {
  if (!hasBudget) return "To follow";
  const total = Number(base) || 0;
  if (total <= 0) return "0.00%";
  return `${(((Number(amount) || 0) / total) * 100).toFixed(2)}%`;
}

/* A plan field as a list, empty entries kept, for lists paired by index. */
function indexedList(field) {
  const value = fieldValue(field);
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/** Each activity as `{ title, description }`, paired by index before any
    empty entry is dropped (see activityCellText). */
export function activityPairs(project) {
  const titles = indexedList(project?.gad_activity);
  const descriptions = indexedList(project?.gad_activity_description);
  return titles
    .map((title, idx) => ({ title, description: descriptions[idx] || "" }))
    .filter(({ title }) => Boolean(title));
}

/* The GAD Activity column stays a single column: each activity prints its
   title with its (index-paired) description on the following line.
   Descriptions are optional, so they are paired before anything is dropped:
   filtering out an empty description moved the next one under the wrong
   title. A pair is dropped only when its title is empty. */
export function activityCellText(project, fallback = "") {
  return (
    activityPairs(project)
      .map(({ title, description }) =>
        description ? `${title}\n${description}` : title,
      )
      .join("\n") || fallback
  );
}

/** The project statuses a GAD project moves through. */
export const PROJECT_STATUSES = ["for-review", "ongoing", "completed"];

/* "Php 1,234.50": the PDFs' Times font has no peso sign. Two decimals, like
   every other screen (data/lib/money.js). */
export function pdfPeso(n) {
  return `Php ${formatAmount(Number(n) || 0)}`;
}
