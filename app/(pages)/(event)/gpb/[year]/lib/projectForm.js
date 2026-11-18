/* Pure helpers for the GPB year page: budget messages, performance-indicator
   formatting/parsing and the add-project wizard's step validators. Moved out
   of content.jsx so they can be tested on their own. */

// Relative path (not "@/"), so node --test can load this file directly.
import { toOfficeArray } from "../../../../../../data/lib/colleges.js";

export const ACTIVITY_TYPE = ["Seminar", "Training", "Lecture"];

export function describeBudgetRejection(data) {
  const remaining = data?.budgetSummary?.remainingBudget;
  const base = data.message || data.error || "Failed to add project";
  return remaining !== null &&
    remaining !== undefined &&
    Number.isFinite(Number(remaining))
    ? `${base}. Remaining Budget: ₱${Number(remaining).toLocaleString()}`
    : base;
}

export function describeBudgetWarning(data) {
  const base = data.warning;
  const overBy = data?.budgetSummary?.overBy;
  return base &&
    overBy !== null &&
    overBy !== undefined &&
    Number.isFinite(Number(overBy)) &&
    Number(overBy) > 0
    ? `${base} Exceeds budget by ₱${Number(overBy).toLocaleString()}.`
    : base;
}

export function getScannedFileType(url) {
  const clean = String(url || "")
    .split("?")[0]
    .toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (/\.(jpe?g|png|webp|gif|bmp)$/.test(clean)) return "image";
  return "other";
}

export function emptyIndicator() {
  return {
    activityType: "",
    totalActivities: "",
    totalMale: "",
    totalFemale: "",
  };
}

export function formatPerformanceIndicator({
  activityType,
  totalActivities,
  totalMale,
  totalFemale,
}) {
  const a = activityType || "activity";
  const s = Number(totalActivities) || 0;
  const m = Number(totalMale) || 0;
  const f = Number(totalFemale) || 0;
  const total = m + f;
  const hasActivities = s > 0;
  const hasParticipants = total > 0;

  if (hasActivities && hasParticipants) {
    return `At least ${s} ${a.toLowerCase()}${s !== 1 ? "s" : ""} conducted with ${total} participants (${f} Female, ${m} Male)`;
  } else if (hasActivities && !hasParticipants) {
    return `No. of ${a.toLowerCase()}s conducted - at least ${s}`;
  } else if (!hasActivities && hasParticipants) {
    return `At least ${total} participants trained. (${f} Female, ${m} Male)`;
  }
  return "";
}

export const ACTIVITY_ALTERNATION = ACTIVITY_TYPE.join("|");

export function parsePerformanceIndicator(str) {
  if (!str || typeof str !== "string") return emptyIndicator();

  const bothMatch = str.match(
    new RegExp(
      `At least (\\d+) (${ACTIVITY_ALTERNATION})s? conducted with \\d+ participants \\((\\d+) Female, (\\d+) Male\\)`,
      "i",
    ),
  );
  if (bothMatch) {
    const matchedType =
      ACTIVITY_TYPE.find(
        (t) => t.toLowerCase() === bothMatch[2].toLowerCase(),
      ) || bothMatch[2];
    return {
      activityType: matchedType,
      totalActivities: bothMatch[1],
      totalFemale: bothMatch[3],
      totalMale: bothMatch[4],
    };
  }

  const activitiesOnly = str.match(
    new RegExp(
      `No\\. of (${ACTIVITY_ALTERNATION})s conducted - at least (\\d+)`,
      "i",
    ),
  );
  if (activitiesOnly) {
    const matchedType =
      ACTIVITY_TYPE.find(
        (t) => t.toLowerCase() === activitiesOnly[1].toLowerCase(),
      ) || activitiesOnly[1];
    return {
      activityType: matchedType,
      totalActivities: activitiesOnly[2],
      totalMale: "",
      totalFemale: "",
    };
  }

  const participantsOnly = str.match(
    /At least \d+ participants trained\. \((\d+) Female, (\d+) Male\)/,
  );
  if (participantsOnly) {
    return {
      activityType: "",
      totalActivities: "",
      totalFemale: participantsOnly[1],
      totalMale: participantsOnly[2],
    };
  }

  return { _raw: str };
}

export function serializeIndicators(arr) {
  return (arr || [])
    .map((p) => {
      if (typeof p === "string") return p;
      if (p?._raw !== undefined) return p._raw;
      return formatPerformanceIndicator(p);
    })
    .filter(Boolean);
}

/* GAD activity titles and their descriptions are stored as two index-paired
   arrays (`gad_activity` / `gad_activity_description`) because the API, the
   reports and the printed form already treat the title list as the source of
   rows. Every editing surface funnels through this helper so the pair can
   never drift: legacy projects that only have titles simply get an empty
   description for each row. */
export function alignActivityDescriptions(titles, descriptions) {
  const list = Array.isArray(descriptions) ? [...descriptions] : [];
  const count = Array.isArray(titles) ? titles.length : 0;
  while (list.length < count) list.push("");
  return list.slice(0, count);
}

export function isIndicatorComplete(ind) {
  if (!ind || ind._raw !== undefined) return true;
  const hasType = !!ind.activityType;
  const hasCount =
    ind.totalActivities !== "" && Number(ind.totalActivities) > 0;
  return hasType && hasCount;
}

export function indicatorsValid(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(isIndicatorComplete);
}

export function isNonEmptyArrayFilled(arr) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((v) => typeof v === "string" && v.trim() !== "")
  );
}

export function isAttributedProgram(p) {
  return p?.project_type === "Attributed Program";
}

export function isStep1Valid(p) {
  if (isAttributedProgram(p)) {
    return p.project_type?.trim() !== "";
  }
  return (
    p.project_type?.trim() !== "" &&
    p.gender_issue.trim() !== "" &&
    isNonEmptyArrayFilled(p.cause_gender_issue)
  );
}

export function isStep2Valid(p) {
  if (isAttributedProgram(p)) {
    return true;
  }
  return (
    isNonEmptyArrayFilled(p.gad_objective) && p.relevant_agency.trim() !== ""
  );
}

export function isStep3Valid(p) {
  if (isAttributedProgram(p)) {
    return (
      isNonEmptyArrayFilled(p.gad_activity) &&
      Number(p.gad_budget) > 0 &&
      p.source_budget.trim() !== "" &&
      isNonEmptyArrayFilled(p.responsible_office)
    );
  }
  return (
    isNonEmptyArrayFilled(p.gad_activity) &&
    Number(p.gad_budget) > 0 &&
    p.source_budget.trim() !== "" &&
    isNonEmptyArrayFilled(p.responsible_office) &&
    indicatorsValid(p.performance_indicator_target)
  );
}

export function isEditRowValid(row) {
  if (!row) return false;
  if (isAttributedProgram(row)) {
    return (
      row.project_type?.trim() &&
      isNonEmptyArrayFilled(row.gad_activity) &&
      Number(row.gad_budget) > 0 &&
      row.source_budget?.trim() &&
      isNonEmptyArrayFilled(row.responsible_office)
    );
  }
  return (
    row.project_type?.trim() &&
    row.gender_issue?.trim() &&
    isNonEmptyArrayFilled(row.cause_gender_issue) &&
    isNonEmptyArrayFilled(row.gad_objective) &&
    row.relevant_agency?.trim() &&
    isNonEmptyArrayFilled(row.gad_activity) &&
    Number(row.gad_budget) > 0 &&
    row.source_budget?.trim() &&
    isNonEmptyArrayFilled(row.responsible_office) &&
    indicatorsValid(row.performance_indicator_target)
  );
}

/* ── GAD activity rows (title + description) ─────────────────────────────
   Each row in the wizard and the edit modal is a title with an optional
   description underneath. Adding or removing a row has to move both arrays
   together, otherwise description 2 would show up under title 3. These take a
   project form and return the updated copy, so the "new project" and the
   "edit project" forms share one implementation. */
export function setActivityTitle(project, idx, value) {
  const titles = [...(project?.gad_activity || [""])];
  titles[idx] = value;
  return {
    ...project,
    gad_activity: titles,
    gad_activity_description: alignActivityDescriptions(
      titles,
      project?.gad_activity_description,
    ),
  };
}

export function setActivityDescription(project, idx, value) {
  const descriptions = alignActivityDescriptions(
    project?.gad_activity,
    project?.gad_activity_description,
  );
  descriptions[idx] = value;
  return { ...project, gad_activity_description: descriptions };
}

export function addActivityRow(project) {
  return {
    ...project,
    gad_activity: [...(project?.gad_activity || [""]), ""],
    gad_activity_description: [
      ...alignActivityDescriptions(
        project?.gad_activity,
        project?.gad_activity_description,
      ),
      "",
    ],
  };
}

export function removeActivityRow(project, idx) {
  const titles = [...(project?.gad_activity || [""])];
  if (titles.length <= 1) return project;
  const descriptions = alignActivityDescriptions(
    project?.gad_activity,
    project?.gad_activity_description,
  );
  titles.splice(idx, 1);
  descriptions.splice(idx, 1);
  return { ...project, gad_activity: titles, gad_activity_description: descriptions };
}

/* ── Table ordering and labels ───────────────────────────────────────── */
const PROJECT_TYPE_ORDER = {
  "Client Focused": 0,
  "Organization Focused": 1,
  "Attributed Program": 2,
  Uncategorized: 3,
};

export function getProjectTypeLabel(project) {
  const rawType = project?.project_type;
  const value = rawType && typeof rawType === "object" ? rawType.value : rawType;
  return Object.hasOwn(PROJECT_TYPE_ORDER, value) ? value : "Uncategorized";
}

/* Groups projects by type in the GPB's fixed order; within a type the saved
   order is kept (Array.prototype.sort is stable). */
export function orderProjectsByType(projects) {
  const list = Array.isArray(projects) ? projects : [];
  return [...list].sort(
    (a, b) =>
      PROJECT_TYPE_ORDER[getProjectTypeLabel(a)] -
      PROJECT_TYPE_ORDER[getProjectTypeLabel(b)],
  );
}

export function getCreatorName(project) {
  const creator = project?.createdBy;
  if (!creator) return "—";
  const personal = creator.personal_info_id?.personal;
  if (personal) {
    return `${personal.first_name || ""} ${personal.last_name || ""}`.trim();
  }
  return creator.username || "—";
}

export function getCreatorRole(project) {
  return project?.createdBy?.role || "";
}

/* The API stores most fields as { value, ... } objects; the page works with
   the plain values and keeps the originals in `_raw`. */
export function normalizeGpbProject(p) {
  const plain = (field) => p[field]?.value ?? p[field];
  const titles = plain("gad_activity") ?? [];
  return {
    ...p,
    _raw: {
      project_type: p.project_type,
      gender_issue: p.gender_issue,
      cause_gender_issue: p.cause_gender_issue,
      gad_objective: p.gad_objective,
      supporting_statistics_data: p.supporting_statistics_data,
      relevant_agency: p.relevant_agency,
      gad_activity: p.gad_activity,
      gad_activity_description: p.gad_activity_description,
      performance_indicator_target: p.performance_indicator_target,
      gad_budget: p.gad_budget,
      source_budget: p.source_budget,
      responsible_office: p.responsible_office,
    },
    project_type: plain("project_type"),
    gender_issue: plain("gender_issue"),
    cause_gender_issue: plain("cause_gender_issue") ?? [],
    gad_objective: plain("gad_objective") ?? [],
    supporting_statistics_data: plain("supporting_statistics_data"),
    relevant_agency: plain("relevant_agency"),
    gad_activity: titles,
    /* Always index-paired with the titles, so legacy projects (titles only)
       get an empty description per row instead of shifting descriptions. */
    gad_activity_description: alignActivityDescriptions(
      titles,
      plain("gad_activity_description") ?? [],
    ),
    performance_indicator_target: plain("performance_indicator_target") ?? [],
    gad_budget: plain("gad_budget"),
    source_budget: plain("source_budget"),
    responsible_office: toOfficeArray(plain("responsible_office")),
    comments: Array.isArray(p.comments) ? p.comments : [],
  };
}
