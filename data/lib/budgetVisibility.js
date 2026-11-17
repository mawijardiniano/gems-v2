/**
 * Who may see the project monitoring budget figures.
 *
 * The GAD focal person sees the budget of every office; a GAD coordinator sees
 * only the budget of the college they are assigned to (their own office list
 * overlaps the project's responsible offices); every other role sees no budget
 * figures at all — the utilization card and the per-project bar are simply not
 * rendered. Project counts (total / completed / ongoing) stay visible to
 * everyone who can open the page.
 *
 * Kept here, free of JSX, so the GAD page and the shared monitoring workspace
 * apply the exact same rule and it can be unit tested.
 */

import { normalizeOffice, toOfficeArray } from "./colleges.js";

export const BUDGET_VIEW = {
  ALL: "all",
  OWN_OFFICE: "own-office",
  NONE: "none",
};

/* The budget scope a role gets. Unknown roles see nothing. */
export const budgetViewFor = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();

  if (normalized === "gad focal person") return BUDGET_VIEW.ALL;
  if (normalized === "gad coordinator") return BUDGET_VIEW.OWN_OFFICE;
  return BUDGET_VIEW.NONE;
};

/* Whether a project belongs to the office the viewer is assigned to. Office
   names are compared through normalizeOffice, so a legacy "&" spelling or the
   `{ value: [...] }` field shape still matches. */
export const isInOwnOffice = (project, assignedOffice) => {
  const target = normalizeOffice(assignedOffice);
  if (!target) return false;

  return toOfficeArray(project?.responsible_office).some(
    (office) => normalizeOffice(office) === target,
  );
};

export const canViewProjectBudget = (view, project, assignedOffice) => {
  if (view === BUDGET_VIEW.ALL) return true;
  if (view === BUDGET_VIEW.OWN_OFFICE) {
    return isInOwnOffice(project, assignedOffice);
  }
  return false;
};

/* The projects whose budget rolls up into the utilization card: everything for
   the focal person, only the viewer's college for a coordinator, nothing for
   anyone else. */
export const budgetProjectsFor = (view, projects, assignedOffice) => {
  const list = Array.isArray(projects) ? projects : [];
  if (view === BUDGET_VIEW.ALL) return list;
  if (view === BUDGET_VIEW.OWN_OFFICE) {
    return list.filter((project) => isInOwnOffice(project, assignedOffice));
  }
  return [];
};

/* Planned budget in a project field, which the API stores as `{ value }`. */
const budgetOf = (field) => {
  if (!field) return 0;
  const value =
    typeof field === "object" && !Array.isArray(field) && "value" in field
      ? field.value
      : field;
  return Number(value) || 0;
};

/* Total planned budget, total actual expenditure and the utilization between
   them. A year with no budget encoded reports 0% rather than NaN. */
export const summarizeBudget = (projects, budgetField = "gad_budget") => {
  const list = Array.isArray(projects) ? projects : [];

  const totalBudget = list.reduce(
    (sum, project) => sum + budgetOf(project?.[budgetField]),
    0,
  );
  const totalExpenditures = list.reduce(
    (sum, project) => sum + (Number(project?.actual_expenditures) || 0),
    0,
  );
  const utilization =
    totalBudget > 0 ? (totalExpenditures / totalBudget) * 100 : 0;

  return { totalBudget, totalExpenditures, utilization };
};