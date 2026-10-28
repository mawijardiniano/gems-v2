/**
 * Every route in the app, with the role shell (breadcrumb "home") that owns
 * it. Consumed by the /dev/breadcrumbs preview page and by the test suite, so
 * the preview and the tests can never drift.
 *
 * `role` maps to a key in BREADCRUMB_HOMES.
 *
 * `group: true` marks a path that exists only as a navigation group (a sidebar
 * entry that expands a submenu) and has no page.jsx — its crumb must not link.
 * These must match BREADCRUMB_GROUP_PATHS in lib/breadcrumbs.js.
 */

export const BREADCRUMB_ROUTE_PREVIEW = [
  /* ── (admin) ─────────────────────────────────────────────── */
  { path: "/admin-dashboard", role: "admin" },
  { path: "/integration", role: "admin" },
  { path: "/integration-staging", role: "admin" },
  { path: "/manual-upload", role: "admin" },
  { path: "/activity-logs", role: "admin" },
  { path: "/user-lists", role: "admin" },
  { path: "/user-lists/students", role: "admin" },
  { path: "/user-lists/employees", role: "admin" },
  { path: "/manage-role", role: "admin" },
  { path: "/admin-settings", role: "admin" },

  /* ── (dashboard) ─────────────────────────────────────────── */
  { path: "/dashboard", role: "dashboard" },
  { path: "/dashboard/personal-information", role: "dashboard" },
  { path: "/dashboard/academic", role: "dashboard" },
  { path: "/dashboard/employment", role: "dashboard" },
  { path: "/dashboard/gender-equity-data", role: "dashboard" },
  { path: "/dashboard/contact-information", role: "dashboard" },
  { path: "/events", role: "dashboard" },
  { path: "/events/discover", role: "dashboard" },
  { path: "/events/discover/abc123", role: "dashboard" },
  { path: "/settings", role: "dashboard" },

  /* ── (event) ─────────────────────────────────────────────── */
  { path: "/events-dashboard", role: "event" },
  { path: "/events-list", role: "event" },
  { path: "/events-list/abc123", role: "event" },
  { path: "/create", role: "event" },
  { path: "/project-monitoring", role: "event" },
  { path: "/gender-statistics", role: "event", group: true },
  { path: "/project-monitoring/event-calendar", role: "event" },
  { path: "/project-monitoring/gad-projects", role: "event" },
  { path: "/project-monitoring/re-extension-projects", role: "event" },
  { path: "/project-monitoring/academic-projects", role: "event" },
  { path: "/university-officials", role: "event" },
  { path: "/gfps", role: "event" },
  { path: "/gaa-budget", role: "event" },
  { path: "/gpb", role: "event" },
  { path: "/gpb/2025", role: "event" },
  { path: "/gpb/projects", role: "event", group: true },
  { path: "/gpb/projects/abc123", role: "event" },
  { path: "/gender-statistics/students", role: "event" },
  { path: "/gender-statistics/employees", role: "event" },
  { path: "/reports", role: "event" },
  { path: "/gad-ars", role: "event" },
  { path: "/knowledge-resources", role: "event" },
  { path: "/gad-settings", role: "event" },

  /* ── (dean) ──────────────────────────────────────────────── */
  { path: "/dean/dashboard", role: "dean" },
  { path: "/dean/students", role: "dean" },
  { path: "/dean/projects", role: "dean" },
  { path: "/dean/projects/create", role: "dean" },
  { path: "/dean/projects/abc123", role: "dean" },
  { path: "/dean/knowledge-resources", role: "dean" },
  { path: "/dean/settings", role: "dean" },

  /* ── (president) ─────────────────────────────────────────── */
  { path: "/president/dashboard", role: "president" },
  { path: "/president/reports", role: "president" },
  { path: "/president/knowledge-resources", role: "president" },
  { path: "/president/gender-statistics", role: "president", group: true },
  { path: "/president/gender-statistics/students", role: "president" },
  { path: "/president/gender-statistics/employees", role: "president" },
  { path: "/president/project-monitoring", role: "president" },
  { path: "/president/project-monitoring/gad-projects", role: "president" },
  {
    path: "/president/project-monitoring/re-extension-projects",
    role: "president",
  },
  { path: "/president/project-monitoring/academic-projects", role: "president" },
  { path: "/president/project-monitoring/event-calendar", role: "president" },
  { path: "/president/settings", role: "president" },

  /* ── (planning-director) ─────────────────────────────────── */
  { path: "/planning-director/dashboard", role: "planning-director" },
  { path: "/planning-director/gpb", role: "planning-director" },
  { path: "/planning-director/gpb/2025", role: "planning-director" },
  { path: "/planning-director/knowledge-resources", role: "planning-director" },
  { path: "/planning-director/settings", role: "planning-director" },

  /* ── (ictu-director) ─────────────────────────────────────── */
  { path: "/ictu-director/dashboard", role: "ictu-director" },
  { path: "/ictu-director/integration", role: "ictu-director" },
  { path: "/ictu-director/manual-upload", role: "ictu-director" },
  { path: "/ictu-director/settings", role: "ictu-director" },
];
