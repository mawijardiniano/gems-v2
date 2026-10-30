/**
 * Breadcrumb resolver for the entire GEMS app.
 *
 * Single source of truth for "given a pathname, what crumbs do we show?".
 * Mirrors the conventions of lib/sectionTitles.js: pure functions, no React and
 * no next/navigation imports, so it can be unit-tested with `node --test`.
 *
 * Design rules (all encoded below):
 *  1. Labels come from BREADCRUMB_LABELS, copied verbatim from each role
 *     sidebar's `name:` / `label=` so a crumb never disagrees with the menu.
 *  2. Route groups such as (admin) or (event) are NOT url segments — the
 *     resolver only ever looks at real path segments.
 *  3. Dynamic segments ([id], [year]) are never links; they get a human label.
 *  4. Longest-prefix wins, so /gpb/projects/123 never resolves to /gpb/2025.
 *  5. Consecutive duplicate labels collapse, so /dashboard does not render
 *     "Overview > Overview".
 */

/* ─── Labels, copied verbatim from the sidebars ─────────────────────────── */

/** Static route → label. Keyed by the full pathname of the route. */
export const BREADCRUMB_LABELS = {
  /* (admin) */
  "/admin-dashboard": "Dashboard",
  "/integration": "Data Integration",
  "/integration-staging": "Staging Workspace",
  "/manual-upload": "Manual Upload",
  "/activity-logs": "Audit Trail",
  "/user-lists": "User Lists",
  "/user-lists/students": "Students",
  "/user-lists/employees": "Employees",
  "/manage-role": "Manage Roles",
  "/admin-settings": "Account Settings",

  /* (dashboard) */
  "/dashboard": "Overview",
  "/dashboard/personal-information": "Personal Information",
  "/dashboard/academic": "Academic Information",
  "/dashboard/employment": "Employment Information",
  "/dashboard/gender-equity-data": "GAD Data",
  "/dashboard/contact-information": "Contact Information",
  "/events": "Events",
  "/events/discover": "Discover Events",
  "/settings": "Settings",

  /* (event) */
  "/events-dashboard": "Dashboard",
  "/events-list": "Event Management",
  "/create": "Create Event",
  "/project-monitoring": "Project Monitoring",
  "/project-monitoring/event-calendar": "Event Calendar",
  "/project-monitoring/gad-projects": "GAD Projects / Activities",
  "/project-monitoring/re-extension-projects": "Research & Extension",
  "/project-monitoring/academic-projects": "Academic Projects",
  "/university-officials": "University Officials",
  "/gfps": "GFPS",
  "/gaa-budget": "GAA Budget",
  "/gpb": "GPB",
  "/gpb/projects": "Projects",
  "/gender-statistics": "Gender Statistics",
  "/gender-statistics/students": "Students",
  "/gender-statistics/employees": "Employees",
  "/reports": "Reports",
  "/gad-ars": "GAD AR",
  "/knowledge-resources": "Knowledge Resources",
  "/gad-settings": "Settings",

  /* (dean) */
  "/dean/dashboard": "Dashboard",
  "/dean/students": "Student Records",
  "/dean/projects": "Projects",
  "/dean/projects/create": "Create Project",
  "/dean/knowledge-resources": "Knowledge Resources",
  "/dean/settings": "Settings",

  /* (president) */
  "/president/dashboard": "Dashboard",
  "/president/reports": "Reports",
  "/president/gender-statistics": "Gender Statistics",
  "/president/gender-statistics/students": "Students",
  "/president/gender-statistics/employees": "Employees",
  "/president/project-monitoring": "Project Monitoring",
  "/president/project-monitoring/gad-projects": "GAD Projects / Activities",
  "/president/project-monitoring/re-extension-projects": "Research & Extension",
  "/president/project-monitoring/academic-projects": "Academic Projects",
  "/president/project-monitoring/event-calendar": "Event Calendar",
  "/president/settings": "Settings",

  /* (planning-director) */
  "/planning-director/dashboard": "Dashboard",
  "/planning-director/gpb": "GPB",
  "/planning-director/knowledge-resources": "Knowledge Resources",
  "/planning-director/settings": "Settings",

  /* (ictu-director) */
  "/ictu-director/dashboard": "Dashboard",
  "/ictu-director/integration": "Data Integration",
  "/ictu-director/manual-upload": "Manual Upload",
  "/ictu-director/settings": "Settings",
};

/**
 * Dynamic route → label for the [id] / [year] segment.
 *
 * Keys are the directory pattern that owns the parameter, values the crumb
 * label. Patterns are matched longest-first so /gpb/projects/[id] wins over
 * the year rule for /gpb/[year].
 */
export const BREADCRUMB_DYNAMIC_LABELS = {
  "/events/discover/[id]": "Event Details",
  "/events-list/[id]": "Event Details",
  "/gpb/projects/[id]": "Project Details",
  "/dean/projects/[id]": "Project Details",
  "/attend/[id]": "Attendance",
  "/events/attendance/[id]": "Attendance",
  "/gpb/[year]": "GPB Year",
  "/planning-director/gpb/[year]": "GPB Year",
};

/**
 * Paths that exist only as navigation *groups*, not as pages.
 *
 * Each has a sidebar entry that expands a submenu (or a synthetic level such as
 * /gpb/projects, which only has a [id] child) and no page.jsx of its own. A
 * crumb for one of these still shows its label, but it must never be a link —
 * otherwise clicking it lands on a 404.
 *
 * Note /project-monitoring and /president/project-monitoring are deliberately
 * absent: they have redirect pages, so they are real destinations.
 *
 * Keep in sync with lib/breadcrumbRoutes.js: every entry here should appear
 * there with `group: true`, and the tests assert that.
 */
export const BREADCRUMB_GROUP_PATHS = new Set([
  "/gpb/projects",
  "/gender-statistics",
  "/president/gender-statistics",
]);

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const DYNAMIC_SEGMENT = /^\[(.+)\]$/;

/** Splits "/a/b/?x=1" into ["a", "b"]. */
export function splitPath(pathname) {
  return String(pathname || "")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean);
}

/**
 * "manual-upload" -> "Manual Upload".
 * Used only as a fallback when a segment has no label of its own.
 */
export function humanizeSegment(segment) {
  const text = String(segment || "").replace(/[-_]+/g, " ").trim();
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * ObjectId / UUID / hex-looking segment — an opaque record id, never a label
 * worth prettifying (showing "Abc123" as a crumb would be noise).
 */
export function looksLikeId(segment) {
  const value = String(segment || "");
  if (/^[0-9a-f]{24}$/i.test(value)) return true; /* Mongo ObjectId */
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return true; /* UUID */
  }
  if (value.length >= 20 && /^[0-9a-z]+$/i.test(value)) return true;
  return /[0-9]/.test(value) && /[a-f]/i.test(value) && value.length >= 6;
}

/**
 * Marks each path segment as dynamic or not.
 *
 * Dynamic: an [id] parameter, a bare year (2025) or an opaque record id.
 * Dynamic segments never become links and never get title-cased.
 */
function describeSegments(segments) {
  return segments.map((segment) => {
    const param = DYNAMIC_SEGMENT.exec(segment);
    if (param) return { segment, dynamic: true, parameter: param[1] };
    if (/^\d{4}$/.test(segment)) {
      return { segment, dynamic: true, parameter: "year" };
    }
    if (looksLikeId(segment)) {
      return { segment, dynamic: true, parameter: "id" };
    }
    return { segment, dynamic: false, parameter: null };
  });
}

/**
 * Resolves the label a dynamic segment should show.
 *
 * Order: runtime label (a real record title) → the pattern that owns this
 * segment's position → the raw value (a year stays "2025").
 */
function dynamicLabelFor(pathSegments, index, resolvedLabels, patterns) {
  const segments = describeSegments(pathSegments);
  const item = segments[index];
  if (!item?.dynamic) return null;

  if (resolvedLabels[item.parameter]) return resolvedLabels[item.parameter];

  const patternKeys = Object.keys(patterns).sort((a, b) => b.length - a.length);
  for (const pattern of patternKeys) {
    const patternSegments = splitPath(pattern);
    if (patternSegments.length !== pathSegments.length) continue;

    const matches = patternSegments.every(
      (expected, position) =>
        DYNAMIC_SEGMENT.test(expected) ||
        expected === pathSegments[position]
    );

    if (matches) return patterns[pattern];
  }

  return null;
}

/* ─── Public API ────────────────────────────────────────────────────────── */

/**
 * Builds the crumbs for a pathname.
 *
 * @param {string} pathname  e.g. "/user-lists/students"
 * @param {object} [options]
 * @param {{label: string, href: string}} [options.home]
 *        Root crumb for the active role shell (see BREADCRUMB_HOMES).
 * @param {object} [options.labels]         Overrides for BREADCRUMB_LABELS.
 * @param {object} [options.dynamicLabels]  Overrides for BREADCRUMB_DYNAMIC_LABELS.
 * @param {Record<string,string>} [options.resolvedLabels]
 *        Runtime labels keyed by parameter, e.g. { id: "GAD Orientation 2025" }.
 * @param {Set<string>} [options.groupPaths]
 *        Paths that are nav groups with no page (see BREADCRUMB_GROUP_PATHS).
 *        Their crumb keeps its label but is never a link.
 *
 * @returns {Array<{href: string|null, label: string, current: boolean}>}
 */
export function buildBreadcrumbs(pathname, options = {}) {
  const {
    home = null,
    labels = BREADCRUMB_LABELS,
    dynamicLabels = BREADCRUMB_DYNAMIC_LABELS,
    resolvedLabels = {},
    groupPaths = BREADCRUMB_GROUP_PATHS,
  } = options;

  const segments = describeSegments(splitPath(pathname));

  if (segments.length === 0) {
    return home ? [{ ...home, current: true }] : [];
  }

  const pathSegments = segments.map((item) => item.segment);

  let href = "";
  const crumbs = segments.map((item, index) => {
    href += `/${item.segment}`;

    let label;
    if (item.dynamic) {
      label =
        (item.parameter === "year" ? null : dynamicLabelFor(
          pathSegments,
          index,
          resolvedLabels,
          dynamicLabels
        )) || resolvedLabels[item.parameter] || item.segment;
    } else {
      label = labels[href] || humanizeSegment(item.segment);
    }

    return { href: item.dynamic ? null : href, label, current: false };
  });

  /* Group paths (submenu parents with no page.jsx) keep their label but must
     never link — clicking one would land on a 404. */
  for (const crumb of crumbs) {
    if (crumb.href && groupPaths.has(crumb.href)) crumb.href = null;
  }

  const withHome = home ? [{ ...home, current: false }, ...crumbs] : crumbs;

  /* Rule 5: consecutive duplicates collapse ("Overview > Overview"). */
  const deduped = withHome.filter(
    (crumb, index) =>
      index === 0 ||
      String(crumb.label).toLowerCase() !==
        String(withHome[index - 1].label).toLowerCase()
  );

  const last = deduped.length - 1;
  return deduped.map((crumb, index) => ({
    ...crumb,
    current: index === last,
    /* The current page is never a link. */
    href: index === last ? null : crumb.href,
  }));
}

/** Root crumb per role shell — used by the layout mounts. */
export const BREADCRUMB_HOMES = {
  admin: { label: "Admin", href: "/admin-dashboard" },
  dashboard: { label: "Overview", href: "/dashboard" },
  event: { label: "Dashboard", href: "/events-dashboard" },
  dean: { label: "Dean", href: "/dean/dashboard" },
  president: { label: "President", href: "/president/dashboard" },
  "planning-director": {
    label: "Planning Director",
    href: "/planning-director/dashboard",
  },
  "ictu-director": {
    label: "ICTU Director",
    href: "/ictu-director/dashboard",
  },
};

