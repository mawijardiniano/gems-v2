const ACTIVITY_ALTERNATION = "Seminar|Training|Lecture";

const RULES = [
  {
    name: "structured-both",
    re: new RegExp(
      `At least (\\d+) (${ACTIVITY_ALTERNATION})s? conducted with (\\d+) participants \\((\\d+) Female, (\\d+) Male\\)`,
      "i",
    ),
    parse(m) {
      const totalFemale = Number(m[4]);
      const totalMale = Number(m[5]);
      return {
        measurable: true,
        targetTotal: totalFemale + totalMale,
        targetFemale: totalFemale,
        targetMale: totalMale,
        targetActivities: Number(m[1]),
        activityType: m[2],
      };
    },
  },
  {
    name: "structured-participants",
    re: /At least (\d+) participants trained\. \((\d+) Female, (\d+) Male\)/i,
    parse(m) {
      const totalFemale = Number(m[2]);
      const totalMale = Number(m[3]);
      return {
        measurable: true,
        targetTotal: totalFemale + totalMale,
        targetFemale: totalFemale,
        targetMale: totalMale,
        targetActivities: null,
        activityType: null,
      };
    },
  },
  {
    name: "activities-only",
    re: new RegExp(
      `No\\. of (${ACTIVITY_ALTERNATION})s conducted - at least (\\d+)`,
      "i",
    ),
    parse(m) {
      return {
        measurable: true,
        targetTotal: null,
        targetFemale: null,
        targetMale: null,
        targetActivities: Number(m[2]),
        activityType: m[1],
      };
    },
  },
  {
    name: "breakdown-groups",
    re: /\(?\d+\s*(Male|Female)[\s,;]+\d+\s*(Male|Female)|(?:^|[\s.:-])\d+\s*(Male|Female)[\s,;]+\d+\s*(Male|Female)|(\d+)[\s-]*(students?|faculty\s*members?|trainees?|employees?|participants?|persons?|individuals?|people|staff)/i,
    parse(m) {
      return parseBreakdownGroups(m.input);
    },
  },
  {
    name: "participant-total",
    re: /No\.?\s*of\s*Participants?\s*[-:]\s*(\d+)/i,
    parse(m) {
      return {
        measurable: true,
        targetTotal: Number(m[1]),
        targetFemale: null,
        targetMale: null,
        targetActivities: null,
        activityType: null,
      };
    },
  },
  {
    name: "free-text-count",
    re: /(?:at least\s+)?(\d+)[\s-]*(participants?|trainees?|persons?|individuals?|employees?|people|students?|staff)\b/i,
    parse(m) {
      return {
        measurable: true,
        targetTotal: Number(m[1]),
        targetFemale: null,
        targetMale: null,
        targetActivities: null,
        activityType: null,
      };
    },
  },
  {
    name: "activities-count",
    re: /No\.?\s*of\s*activities?\s+conducted\s*(\d+)/i,
    parse(m) {
      return {
        measurable: true,
        targetTotal: null,
        targetFemale: null,
        targetMale: null,
        targetActivities: Number(m[1]),
        activityType: "activities",
      };
    },
  },
];
export const PARTICIPANT_NOUNS =
  "participants|trainees|persons|individuals|employees|people|students|staff";

const PARTICIPANT_NOUN_RE =
  "students?|faculty\\s*members?|trainees?|employees?|participants?|persons?|individuals?|people|staff";

function parseBreakdownGroups(text) {
  const breakdownRe = /\(?(\d+)\s*(Male|Female)[\s,;]+(\d+)\s*(Male|Female)/gi;
  const nounCountRe = new RegExp(
    `(\\d+)\\s*[-:]?\\s*(${PARTICIPANT_NOUN_RE})\\b`,
    "gi",
  );

  let total = 0;
  let hasAny = false;
  const claimedNounIndices = new Set();

  const breakdowns = [];
  let bm;
  while ((bm = breakdownRe.exec(text)) !== null) {
    const a = Number(bm[1]);
    const aSex = bm[2].toLowerCase();
    const b = Number(bm[3]);
    const bSex = bm[4].toLowerCase();
    const female = aSex === "female" ? a : bSex === "female" ? b : null;
    const male = aSex === "female" ? b : bSex === "female" ? a : null;
    breakdowns.push({ female, male, groupSum: (female || 0) + (male || 0), index: bm.index });
    hasAny = true;
  }

  const nounCounts = [];
  let nm;
  while ((nm = nounCountRe.exec(text)) !== null) {
    nounCounts.push({ n: Number(nm[1]), index: nm.index });
  }

  breakdowns.forEach((bd) => {
    let closest = null;
    nounCounts.forEach((nc, i) => {
      if (claimedNounIndices.has(i)) return;
      if (nc.index < bd.index && bd.index - nc.index <= 40) {
        if (!closest || bd.index - nc.index < bd.index - closest.index) {
          closest = nc;
        }
      }
    });
    if (closest) {

      claimedNounIndices.add(nounCounts.indexOf(closest));
    }
    total += bd.groupSum;
  });

  nounCounts.forEach((nc, i) => {
    if (claimedNounIndices.has(i)) return;
    total += nc.n;
    hasAny = true;
  });

  if (!hasAny) {
    return {
      measurable: false,
      kind: "unparseable",
      targetTotal: null,
      targetFemale: null,
      targetMale: null,
      targetActivities: null,
      activityType: null,
    };
  }

  return {
    measurable: true,
    targetTotal: total,
    targetFemale: null,
    targetMale: null,
    targetActivities: null,
    activityType: null,
  };
}

export function extractParticipantTarget(str) {
  if (!str || typeof str !== "string") {
    return {
      measurable: false,
      kind: "empty",
      targetTotal: null,
      targetFemale: null,
      targetMale: null,
      targetActivities: null,
      activityType: null,
    };
  }

  for (const rule of RULES) {
    const m = str.match(rule.re);
    if (m) {
      const result = rule.parse(m);
      result.kind = rule.name;
      return result;
    }
  }

  return {
    measurable: false,
    kind: "unparseable",
    targetTotal: null,
    targetFemale: null,
    targetMale: null,
    targetActivities: null,
    activityType: null,
  };
}


export function sumActualParticipants(project, { key = "attended_users", ignoreCancelled = true } = {}) {
  const events = Array.isArray(project?.events) ? project.events : [];
  let actualTotal = 0;
  let actualFemale = 0;
  let actualMale = 0;

  events.forEach((ev) => {
    if (!ev) return;
    if (ignoreCancelled && ev.status === "cancelled") return;

    const list = Array.isArray(ev[key]) ? ev[key] : [];
    list.forEach((entry) => {

      const userObj = entry?.user_id || entry;
      actualTotal += 1;

      const sex = userObj?.personal_info_id?.gadData?.sexAtBirth;
      if (typeof sex !== "string") return;
      const normalized = sex.toLowerCase();
      if (normalized === "female") actualFemale += 1;
      else if (normalized === "male") actualMale += 1;
    });
  });

  return { actualTotal, actualFemale, actualMale };
}


export function computeIndicatorProgress({ indicatorStr, project, key = "attended_users", raw }) {
  const safeStr =
    typeof indicatorStr === "string"
      ? indicatorStr
      : indicatorStr && typeof indicatorStr === "object"
        ? indicatorStr.value ?? indicatorStr._raw ?? ""
        : "";
  const target = extractParticipantTarget(safeStr);

  if (target.targetTotal === null) {
    return {
      ...target,
      raw: typeof raw === "string" ? raw : safeStr,
      hasParticipantTarget: false,
      actualTotal: null,
      remaining: null,
      percent: null,
      exceeded: false,
    };
  }

  const actual = sumActualParticipants(project, { key });
  const targetTotal = target.targetTotal;
  const remaining = targetTotal - actual.actualTotal;
  const percent =
    targetTotal > 0
      ? Math.round((actual.actualTotal / targetTotal) * 100)
      : 0;

  return {
    ...target,
    raw: typeof raw === "string" ? raw : safeStr,
    hasParticipantTarget: true,
    actualTotal: actual.actualTotal,
    actualFemale: actual.actualFemale,
    actualMale: actual.actualMale,
    remaining,
    percent,
    exceeded: remaining < 0,
  };
}


export function indicatorTargets(project, { key = "attended_users" } = {}) {

  let raw = project?.performance_indicator_target;

  if (raw && typeof raw === "object" && !Array.isArray(raw) && "value" in raw) {
    raw = raw.value;
  }
  if (raw && typeof raw === "object" && Array.isArray(raw) && raw.every((i) => i && typeof i === "object" && "value" in i)) {
    raw = raw.map((i) => i.value);
  }
  if (raw === undefined || raw === null) raw = [];
  if (!Array.isArray(raw)) raw = [raw];

  return raw
    .map((item) => {
      const str =
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? item.value ?? item._raw ?? ""
            : "";
      if (typeof str !== "string" || !str.trim()) return null;
      return computeIndicatorProgress({ indicatorStr: str, project, key, raw: str });
    })
    .filter(Boolean);
}