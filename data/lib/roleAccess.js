/**
 * Role → page access for the GAD (event) workspace.
 *
 * Centralised here so the sidebar menu (menu keys) and the layout route guard
 * (base path segments) can never drift apart, and adding a future role — e.g. a
 * dedicated Research & Extension or Academic director — is a single-file change.
 */

/* Roles are stored in title case ("Planning Director") but keyed here in lower
   case, so every lookup normalises first. Same trim+lowercase as
   `normalizeRole` in lib/notifications.js; duplicated rather than imported
   because that module reaches for the database and this one must stay pure. */
const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

/* Base path segments a role may open — enforced by app/(pages)/(event)/layout.jsx */
export const EVENT_ROLE_PAGE_ACCESS = {
  "gad focal person": [
    "events-dashboard",
    "university-officials",
    "gfps",
    "gaa-budget",
    "gpb",
    "reports",
    "events-list",
    "create",
    "gad-ars",
    "gender-statistics",
    "gad-settings",
    "project-monitoring",
    "knowledge-resources",
  ],
  "gad coordinator": [
    "events-dashboard",
    "university-officials",
    "gfps",
    "gaa-budget",
    "gpb",
    "reports",
    "events-list",
    "create",
    "gad-ars",
    "gender-statistics",
    "gad-settings",
    "project-monitoring",
    "knowledge-resources",
  ],
  "planning director": ["admin-dashboard", "gpb", "gad-settings"],
};

/**
 * Whether `role` may open /gpb.
 *
 * The API reads this too: `GET /api/gpb` and `GET /api/gpb/<year>` used to hand
 * every plan, budget and project to any signed-in user while the page guard
 * denied them the page itself. Reading the same map as the layout guard is the
 * point — a second role list would be free to drift.
 *
 * Returns false for a missing or unknown role, so a bad token fails closed.
 */
export const canAccessGpb = (role) =>
  (EVENT_ROLE_PAGE_ACCESS[normalizeRole(role)] || []).includes("gpb");

/* Menu keys a role may see — used by the (event) sidebar. */
export const EVENT_ROLE_MENU_ACCESS = {
  "gad focal person": [
    "events-dashboard",
    "university-officials",
    "gfps",
    "gaa-budget",
    "gpb",
    "events-list",
    "gad-ars",
    "gender-statistics",
    "gad-settings",
    "gad-projects",
    "re-extension-projects",
    "academic-projects",
    "knowledge-resources",
  ],
  "gad coordinator": [
    "events-dashboard",
    "university-officials",
    "gfps",
    "gaa-budget",
    "gpb",
    "events-list",
    "gad-ars",
    "gender-statistics",
    "gad-settings",
    "gad-projects",
    "re-extension-projects",
    "academic-projects",
    "knowledge-resources",
  ],
};
