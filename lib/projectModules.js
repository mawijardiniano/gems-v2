/**
 * UI + validation constants for the two office-managed project modules:
 * Research & Extension projects and Academic projects.
 *
 * Kept free of mongoose (mirrors lib/knowledgeResources.js) so the exact same
 * lists can be imported from models, API routes and client components.
 */

/* ── Research & Extension ─────────────────────────────────────────────────── */

export const RE_CLASSIFICATIONS = ["Research", "Extension"];

export const RE_RESEARCH_CATEGORIES = [
  "Basic Research",
  "Applied Research",
  "Development Research",
  "Institutional Research",
  "Others",
];

export const RE_EXTENSION_MODALITIES = [
  "Training",
  "Technical Advisory",
  "Community Outreach / Service",
  "Information Dissemination",
  "Others",
];

/** Category options keyed by classification, used by the create form. */
export const RE_CATEGORIES = {
  Research: RE_RESEARCH_CATEGORIES,
  Extension: RE_EXTENSION_MODALITIES,
};

export const RE_FUNDING_SOURCES = [
  "Internal",
  "External",
  "Self-funded",
  "Grant",
];

export const RE_STATUSES = ["for-review", "ongoing", "completed", "terminated"];

/* ── Academic ─────────────────────────────────────────────────────────────── */

export const ACADEMIC_PROJECT_TYPES = [
  "Curriculum Development",
  "Instructional Materials",
  "Accreditation (AACCUP/ISO)",
  "Faculty Development",
  "Student Development",
  "Instruction / Pedagogy",
  "Others",
];

export const SEMESTERS = ["1st Semester", "2nd Semester", "Mid-Year/Summer"];

export const ACADEMIC_STATUSES = [
  "for-review",
  "ongoing",
  "completed",
  "cancelled",
];

/* ── Shared status badge metadata ─────────────────────────────────────────── */

export const PROJECT_MODULE_STATUS_META = {
  "for-review": {
    label: "For Review",
    classes: "bg-gray-50 text-gray-700 border-gray-200",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  terminated: {
    label: "Terminated",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
};

export const getProjectModuleStatusMeta = (status) =>
  PROJECT_MODULE_STATUS_META[status] || PROJECT_MODULE_STATUS_META["for-review"];

/* ── Comment field targets (kept in sync with the models + comment routes) ── */

export const RE_COMMENT_FIELDS = [
  "title",
  "classification",
  "category",
  "research_agenda",
  "objectives",
  "beneficiaries",
  "partner_agency",
  "delivery_site",
  "expected_outputs",
  "funding_source",
  "funding_agency",
  "budget",
  "source_budget",
  "responsible_office",
  "general",
];

export const ACADEMIC_COMMENT_FIELDS = [
  "title",
  "project_type",
  "college",
  "programs",
  "semester",
  "objectives",
  "expected_outputs",
  "target_participants",
  "partner_agency",
  "budget",
  "source_budget",
  "responsible_office",
  "general",
];

/* ── Reference-number prefixes (keep in sync with lib/referenceNumber.js) ─── */


export const PROJECT_MODULE_PREFIXES = {
  reExtension: "RNE",
  academic: "ACD",
};
