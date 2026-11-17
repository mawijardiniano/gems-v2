/* Who may change a project, a GPB or a GAA budget, and when an approved GPB
   locks them. Pure (no database), so routes, the upload route and tests share
   one definition.

   Until this module the project APIs only checked that the caller was signed
   in: any account could delete any project (with its events and files), edit
   its budget, or post a comment as somebody else. The pages hid those
   controls, but nothing on the server enforced them.

   Roles are compared lower case, the way `normalizeRole` writes them. */

import { EVENT_ROLE_PAGE_ACCESS } from "./roleAccess.js";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

/** Besides a project's creator, these roles may edit or delete any project. */
export const PROJECT_MANAGER_ROLES = ["gad focal person", "admin"];

/** Academic and Research & Extension projects are office-managed: besides
    the creator, these roles may create and edit any of them. */
export const MODULE_EDITOR_ROLES = [
  "gad focal person",
  "gad coordinator",
  "admin",
];

export const isModuleEditorRole = (role) =>
  MODULE_EDITOR_ROLES.includes(normalizeRole(role));

/** Roles that may create, attach budgets to, or delete a whole GPB, and
    create, edit or delete GAA budgets. Matches the pages: coordinators and
    the planning director see GPBs and budgets read-only. */
export const GPB_MANAGER_ROLES = ["gad focal person", "admin"];

/** Roles that may add a GAD project to a GPB (the GPB page's "+ Add Project";
    the planning director reviews instead). */
export const PROJECT_CREATOR_ROLES = [
  "gad focal person",
  "gad coordinator",
  "admin",
];

export const isProjectManagerRole = (role) =>
  PROJECT_MANAGER_ROLES.includes(normalizeRole(role));

export const isProjectCreatorRole = (role) =>
  PROJECT_CREATOR_ROLES.includes(normalizeRole(role));

/**
 * Whether a role may read full project records: budgets, actuals and the
 * attendance of linked events. Roles that open the GPB or project-monitoring
 * pages, plus Admin. Everyone else (e.g. a Dean picking a project for an
 * event) gets only what a picker needs.
 */
export const canViewProjectDetails = (role) =>
  normalizeRole(role) === "admin" ||
  (EVENT_ROLE_PAGE_ACCESS[normalizeRole(role)] || []).some(
    (page) => page === "gpb" || page === "project-monitoring",
  );

/** Fields a project picker needs (create-event, events list). */
export const PROJECT_PICKER_FIELDS =
  "_id year reference_number project_type gad_activity responsible_office createdBy";

export const isGpbManagerRole = (role) =>
  GPB_MANAGER_ROLES.includes(normalizeRole(role));

/** True when `user` created `project` (`createdBy` may be an id or populated). */
export function isProjectCreator(user, project) {
  if (!user || !project?.createdBy) return false;
  const creatorId = project.createdBy?._id ?? project.createdBy;
  return String(creatorId) === String(user._id);
}

/** The creator, a GAD Focal Person or an Admin may edit or delete a project. */
export function canManageProject(user, project) {
  if (!user) return false;
  return isProjectCreator(user, project) || isProjectManagerRole(user.role);
}

/* ── Approved-GPB lock ───────────────────────────────────────────── */

/** True when the plan has been approved: its contents are final until it is
    disapproved (and, if needed, returned to draft). */
export const isGpbLocked = (gpb) =>
  normalizeRole(gpb?.status_of_gpb?.status) === "approved";

/**
 * The fields that make up the plan itself — the GPB matrix columns. An
 * approved GPB freezes these. What happens *during* implementation (actuals,
 * milestones, schedule and status, Gantt chart, approval metadata) is
 * recorded after approval and stays editable.
 */
export const PLAN_FIELDS = [
  "project_type",
  "gender_issue",
  "cause_gender_issue",
  "gad_objective",
  "supporting_statistics_data",
  "relevant_agency",
  "gad_activity",
  "gad_activity_description",
  "performance_indicator_target",
  "gad_budget",
  "source_budget",
  "responsible_office",
  "reference_number",
  "year",
];

/** The plan fields a request body would change. */
export const planFieldsTouched = (body) =>
  PLAN_FIELDS.filter((field) => body && body[field] !== undefined);

export const GPB_LOCKED_MESSAGE =
  "This GPB has been approved, so its projects and budget are locked. Disapprove the GPB first to make changes.";
