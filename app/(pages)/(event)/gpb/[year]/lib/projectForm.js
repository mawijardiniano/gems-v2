/* Pure helpers for the GPB year page: budget messages, performance-indicator
   formatting/parsing and the add-project wizard's step validators. Moved out
   of content.jsx so they can be tested on their own. */

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
