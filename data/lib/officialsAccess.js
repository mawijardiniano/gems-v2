import { requireRole } from "@/data/lib/auth";

/**
 * Roles that may change the organizational structure: University Officials
 * (terms), the seats and offices they sit in, and the GFPS committee.
 *
 * These routes used to check only `requireAuth`, so any logged-in account —
 * a student included — could assign, vacate or delete officials, seats and
 * offices. The pages already hid the edit controls from everyone else (the
 * GAD Coordinator sees them read-only), so this makes the server agree with
 * the screen instead of trusting it.
 *
 * Same pair as CAN_VIEW_PII_ROLES in profileBroker: the editors are also the
 * only roles that see real names, which the person search depends on.
 */
export const ORG_STRUCTURE_EDITOR_ROLES = ["Admin", "GAD Focal Person"];

/** Reads stay open to any signed-in viewer; writes go through this. */
export function requireOrgStructureEditor(req) {
  return requireRole(req, ORG_STRUCTURE_EDITOR_ROLES);
}
