/* Who may do what with an event. Pure (no database), so routes and tests can
   share it. These lists used to be repeated in five route files, and one
   helper was exported from a route module and imported by another route. */

import { EVENT_ROLE_PAGE_ACCESS } from "./roleAccess.js";
import { normalizeOffice } from "./colleges.js";

/** Roles that may create events. */
export const EVENT_CREATOR_ROLES = ["GAD Focal Person", "GAD Coordinator", "Dean"];

/** Roles that organize events: they may use the AI generators. */
export const EVENT_ORGANIZER_ROLES = ["Admin", ...EVENT_CREATOR_ROLES];

/** Roles whose event access covers *every* event (university-wide oversight).
    Deans and GAD Coordinators manage only the events they created. */
export const EVENT_OVERSIGHT_ROLES = ["Admin", "GAD Focal Person"];

/** True for a role that may act on any event or any user's event list. */
export const hasEventOversight = (role) => EVENT_OVERSIGHT_ROLES.includes(role);

/** True when `user` created `event` (`created_by` may be an id or populated). */
export function isEventCreator(user, event) {
  if (!user || !event?.created_by) return false;
  const creatorId = event.created_by?._id ?? event.created_by;
  return String(creatorId) === String(user._id);
}

/**
 * Who may record and validate attendance for somebody else and read the
 * guest sheet: the event's creator, or an oversight role. A Dean or GAD
 * Coordinator used to qualify for every event in the university, so one
 * college could approve or edit another college's attendance.
 */
export function isEventOrganizer(user, event) {
  if (!user) return false;
  return hasEventOversight(user.role) || isEventCreator(user, event);
}

/** Creator or Admin: who may edit, delete or file the report for an event. */
export function canManageEvent(user, event) {
  if (!user) return false;
  return user.role === "Admin" || isEventCreator(user, event);
}

/**
 * A Dean or GAD Coordinator may organize joint events with other offices,
 * but their own college must be one of the organizers: otherwise one
 * college could file events (and their participants) under another in the
 * reports. Oversight roles and accounts without an assigned college are not
 * limited. Returns an error message, or null when the offices are fine.
 */
export function organizingOfficeError(user, offices) {
  if (!user || hasEventOversight(user.role)) return null;
  const own = String(user.assignedCollege || "").trim();
  if (!own) return null;
  const list = Array.isArray(offices) ? offices : [];
  const includesOwn = list.some(
    (office) => normalizeOffice(office) === normalizeOffice(own),
  );
  return includesOwn
    ? null
    : `${own} must be one of the organizing offices of events you create or edit.`;
}

/* ── Accomplishment reports ──────────────────────────────────────── */

/** Roles that build the GAD Accomplishment Report, which reads every
    event's report: Admin and the roles with the GAD-AR page. */
export function canReadAllEventReports(role) {
  if (role === "Admin") return true;
  const key = String(role || "").trim().toLowerCase();
  return (EVENT_ROLE_PAGE_ACCESS[key] || []).includes("gad-ars");
}

/**
 * Who may read one event's accomplishment report (its narrative and its
 * files, including the signed attendance sheet): the event's organizers and
 * the GAD-AR roles. Any signed-in account used to read every report.
 */
export function canViewEventReport(user, event) {
  if (!user) return false;
  return canReadAllEventReports(user.role) || isEventOrganizer(user, event);
}

/* ── Guest validation status ─────────────────────────────────────── */

export const GUEST_STATUSES = ["pending", "approved", "rejected"];

/* Rows created before manual validation existed have no status. They are
   treated as approved so historical reports keep their numbers. */
const APPROVED_OR_LEGACY = {
  $or: [
    { validation_status: "approved" },
    { validation_status: { $exists: false } },
    { validation_status: null },
  ],
};

/** Mongo filter for a guest validation status ("all" → null). */
export function legacySafeStatusFilter(status) {
  if (status === "approved") return APPROVED_OR_LEGACY;
  if (status === "pending" || status === "rejected")
    return { validation_status: status };
  return null;
}
