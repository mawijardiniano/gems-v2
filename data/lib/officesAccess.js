import jwt from "jsonwebtoken";

/**
 * Who may add, rename or deactivate a university office.
 *
 * The office list lives in the database now and is edited from a visible
 * setting, so it needs a gate that does not depend on the page guard: the GAD
 * focal person owns the list, while everybody else who can reach the University
 * Officials page (GAD coordinator, planning director) gets read-only access.
 *
 * `requireAuth` already proves the session is valid; the role is read from the
 * JWT rather than the cached user row so a stale cache can never widen access.
 *
 * The secret is read per call rather than captured at import: `lib/auth.js`
 * captures it at module scope, which makes this module untestable in isolation
 * (imports are hoisted, so a test cannot set the variable first).
 */
export const OFFICE_WRITE_ROLES = ["gad focal person"];

/** Roles that may read the office list from any authenticated session. */
export const OFFICE_READ_ROLES = [
  ...OFFICE_WRITE_ROLES,
  "gad coordinator",
  "planning director",
];

/** Normalises any role-ish value to the lowercase form used across the app. */
export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

/**
 * Role carried by the request's JWT, without a DB round-trip.
 *
 * `requireAuth` is still the gate for "is this a valid session"; this only
 * answers "which role is asking", so a stale cached user row cannot grant a
 * write the token does not claim. An unreadable token yields "" — every caller
 * then fails closed.
 */
export function getRoleFromRequest(req) {
  const token =
    req?.cookies?.get?.("auth_token")?.value ||
    req?.headers?.get?.("authorization")?.replace("Bearer ", "");
  if (!token) return "";
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return normalizeRole(decoded?.role);
  } catch {
    return "";
  }
}

/** True when the request may add, rename or deactivate an office. */
export const canWriteOffices = (req) =>
  OFFICE_WRITE_ROLES.includes(getRoleFromRequest(req));

/** True when the request may read the office list. */
export const canReadOffices = (req) =>
  OFFICE_READ_ROLES.includes(getRoleFromRequest(req));
