/**
 * Role → page access for the GAD (event) workspace.
 *
 * Centralised here so the sidebar menu (menu keys) and the layout route guard
 * (base path segments) can never drift apart, and adding a future role — e.g. a
 * dedicated Research & Extension or Academic director — is a single-file change.
 */

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
