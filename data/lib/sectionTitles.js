/**
 * Event-section titles for the navbar, derived from the sidebar routes.
 *
 * Single source of truth so the navbar title always matches the active
 * sidebar section (Dashboard, Project Monitoring, Gender Statistics, ...).
 * Longest-prefix wins so nested pages like /gpb/2025 or
 * /gender-statistics/students resolve to their parent section.
 */

export const EVENT_SECTION_TITLES = [
  { prefix: "/project-monitoring/gad-projects", title: "GAD Projects / Activities" },
  { prefix: "/project-monitoring/re-extension-projects", title: "Research & Extension" },
  { prefix: "/project-monitoring/academic-projects", title: "Academic Projects" },
  { prefix: "/project-monitoring", title: "Project Monitoring" },
  { prefix: "/gender-statistics/students", title: "Gender Statistics — Students" },
  { prefix: "/gender-statistics/employees", title: "Gender Statistics — Employees" },
  { prefix: "/gender-statistics", title: "Gender Statistics" },
  { prefix: "/university-officials", title: "University Officials" },
  { prefix: "/organizational-structure", title: "Organizational Structure" },
  { prefix: "/events-dashboard", title: "Dashboard" },
  { prefix: "/admin-dashboard", title: "Dashboard" },
  { prefix: "/knowledge-resources", title: "Knowledge Resources" },
  { prefix: "/events-list", title: "Events List" },
  { prefix: "/gaa-budget", title: "GAA Budget" },
  { prefix: "/gad-settings", title: "Settings" },
  { prefix: "/gad-ars", title: "GAD AR" },
  { prefix: "/reports", title: "Reports" },
  { prefix: "/gfps", title: "GFPS" },
  { prefix: "/gpb", title: "GPB" },
  { prefix: "/events", title: "Events" },
];

export const EVENT_DEFAULT_TITLE = "EVENTS MANAGEMENT";

/** Resolves "/gpb/2025" -> "GPB 2025", null when not a year route. */
function gpbYearTitle(pathname) {
  const match = String(pathname || "").match(/^\/gpb\/(\d{4})\/?$/);
  return match ? `GPB ${match[1]}` : null;
}

/** Longest-prefix match of pathname against EVENT_SECTION_TITLES. */
export function resolveEventSectionTitle(pathname) {
  const path = String(pathname || "");
  if (!path) return EVENT_DEFAULT_TITLE;
  const yearTitle = gpbYearTitle(path);
  if (yearTitle) return yearTitle;
  const hit = EVENT_SECTION_TITLES.filter(({ prefix }) =>
    path === prefix || path.startsWith(`${prefix}/`),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return hit ? hit.title : EVENT_DEFAULT_TITLE;
}
