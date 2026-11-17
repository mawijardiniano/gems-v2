import jwt from "jsonwebtoken";

/**
 * Who may add, rename, move or deactivate a university position (seat).
 *
 * Same gate as lib/officesAccess.js: the org chart belongs to one owner, and
 * everybody else who can reach the University Officials page gets read-only
 * access. A seat is a *row inside* an office column, so the two lists are
 * edited by the same person.
 *
 * `requireAuth` already proves the session is valid; the role is read from the
 * JWT rather than the cached user row so a stale cache can never widen access.
 *
 * The secret is read per call rather than captured at import: `lib/auth.js`
 * captures it at module scope, which makes this module untestable in isolation
 * (imports are hoisted, so a test cannot set the variable first).
 */
export const POSITION_WRITE_ROLES = ["gad focal person"];

/** Roles that may read the seat list from any authenticated session. */
export const POSITION_READ_ROLES = [
  ...POSITION_WRITE_ROLES,
  "gad coordinator",
  "planning director",
];

/** Normalises any role-ish value to the lowercase form used across the app. */
export const normalizePositionRole = (role) =>
  String(role || "").trim().toLowerCase();

/**
 * Role carried by the request's JWT, without a DB round-trip.
 *
 * `requireAuth` is still the gate for "is this a valid session"; this only
 * answers "which role is asking", so a stale cached user row cannot grant a
 * write the token does not claim. An unreadable token yields "" — every caller
 * then fails closed.
 */
export function getPositionRoleFromRequest(req) {
  const token =
    req?.cookies?.get?.("auth_token")?.value ||
    req?.headers?.get?.("authorization")?.replace("Bearer ", "");
  if (!token) return "";
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return normalizePositionRole(decoded?.role);
  } catch {
    return "";
  }
}

/** True when the request may add, rename, move or deactivate a seat. */
export const canWritePositions = (req) =>
  POSITION_WRITE_ROLES.includes(getPositionRoleFromRequest(req));

/** True when the request may read the seat list. */
export const canReadPositions = (req) =>
  POSITION_READ_ROLES.includes(getPositionRoleFromRequest(req));
