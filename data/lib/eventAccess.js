/* Who may do what with an event. Pure (no database), so routes and tests can
   share it. These lists used to be repeated in five route files, and one
   helper was exported from a route module and imported by another route. */

/** Roles that may create events. */
export const EVENT_CREATOR_ROLES = ["GAD Focal Person", "GAD Coordinator", "Dean"];

/** Roles that may manage any event's attendance and use the AI generators. */
export const EVENT_ORGANIZER_ROLES = ["Admin", ...EVENT_CREATOR_ROLES];

export const isOrganizerRole = (role) => EVENT_ORGANIZER_ROLES.includes(role);

/** True when `user` created `event` (`created_by` may be an id or populated). */
export function isEventCreator(user, event) {
  if (!user || !event?.created_by) return false;
  const creatorId = event.created_by?._id ?? event.created_by;
  return String(creatorId) === String(user._id);
}

/**
 * An organizer role, or the person who created the event, may record and
 * validate attendance for somebody else and read the guest sheet.
 */
export function isEventOrganizer(user, event) {
  if (!user) return false;
  return isOrganizerRole(user.role) || isEventCreator(user, event);
}

/** Creator or Admin: who may edit, delete or file the report for an event. */
export function canManageEvent(user, event) {
  if (!user) return false;
  return user.role === "Admin" || isEventCreator(user, event);
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
