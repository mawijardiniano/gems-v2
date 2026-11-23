/* Pure helpers for the GAD projects monitoring page: statuses, milestone
   progress, list filtering and totals. Kept free of React so they can be
   tested on their own. */

// Relative paths (not "@/"), so node --test can load this file directly.
import { OFFICE_OPTIONS, normalizeOffice } from "../../../../../../data/lib/colleges.js";
import { getArrayValue, getFieldValue } from "../../lib/projectView.js";

export const PROJECT_STATUSES = ["for-review", "ongoing", "completed"];

/* Number of projects listed per page for the selected academic year. */
export const PROJECTS_PER_PAGE = 5;

export const getProjectStatus = (project) =>
  PROJECT_STATUSES.includes(project?.project_status)
    ? project.project_status
    : "for-review";

export const PROJECT_STATUS_META = {
  "for-review": {
    label: "For Review",
    classes: "bg-subtle text-fg-3 border-line",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-secondary-50 text-secondary-700 border-secondary-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-success-subtle text-success border-success-border",
  },
};

export const MILESTONE_STATUS_META = {
  pending: {
    label: "Pending",
    classes: "bg-subtle text-fg-3 border-line",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-secondary-50 text-secondary-700 border-secondary-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-success-subtle text-success border-success-border",
  },
};

export const EVENT_STATUS_META = {
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    classes: "bg-success-subtle text-success border-success-border",
  },
  active: {
    label: "Ongoing",
    dot: "bg-secondary-500",
    classes: "bg-secondary-50 text-secondary-700 border-secondary-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-400",
    classes: "bg-danger-subtle text-danger border-danger-border",
  },
};

/* Milestones with a title; blank rows saved by the editor are ignored. */
export const getMilestones = (project) =>
  (Array.isArray(project?.milestones) ? project.milestones : []).filter(
    (m) => m && String(m.title || "").trim(),
  );

export const getMilestoneProgress = (project) => {
  const list = getMilestones(project);
  const total = list.length;
  const done = list.filter((m) => m.status === "completed").length;
  return {
    total,
    done,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
};

export const isOwnProject = (project, userId) =>
  Boolean(userId) &&
  String(project?.createdBy?._id || project?.createdBy || "") === String(userId);

/* The year's projects narrowed by office, status and a free-text search. */
export function filterGadProjects(
  projects,
  { year, office = "all", status = "all", search = "" },
) {
  const q = search.trim().toLowerCase();
  return (Array.isArray(projects) ? projects : [])
    .filter((p) => Number(p.year) === Number(year))
    .filter(
      (p) =>
        office === "all" ||
        getArrayValue(p.responsible_office).some(
          (o) => normalizeOffice(o) === normalizeOffice(office),
        ),
    )
    .filter((p) => status === "all" || getProjectStatus(p) === status)
    .filter((p) => {
      if (!q) return true;
      const haystack = [
        ...getArrayValue(p.gad_activity),
        ...getArrayValue(p.gad_activity_description),
        ...getArrayValue(p.responsible_office),
        getFieldValue(p.gender_issue),
        getFieldValue(p.project_type),
        String(p.year || ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
}

/* Canonical colleges/offices plus any custom office saved on a record, so
   custom-typed entries stay filterable from the one dropdown. */
export function officeOptionsFor(projects) {
  const seen = new Map();
  OFFICE_OPTIONS.forEach((o) => seen.set(normalizeOffice(o), o));
  (Array.isArray(projects) ? projects : []).forEach((p) =>
    getArrayValue(p.responsible_office).forEach((o) => {
      const key = normalizeOffice(o);
      if (!seen.has(key)) seen.set(key, o);
    }),
  );
  return [...seen.values()];
}

/* Academic years present, newest first. */
export const yearsOf = (projects) =>
  [...new Set((projects || []).map((p) => p.year).filter(Boolean))].sort(
    (a, b) => b - a,
  );

export function statusTotals(projects) {
  const count = (s) => projects.filter((p) => getProjectStatus(p) === s).length;
  return {
    completed: count("completed"),
    ongoing: count("ongoing"),
    forReview: count("for-review"),
    listed: projects.length,
  };
}

/* Page numbers to show: first, last and the current page's neighbours;
   `null` marks a gap ("…"). */
export function pageWindow(currentPage, totalPages) {
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      if (pages.length && pages[pages.length - 1] !== p - 1) pages.push(null);
      pages.push(p);
    }
  }
  return pages;
}
