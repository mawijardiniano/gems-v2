const ACTIVITY_ALTERNATION = "Seminar|Training|Lecture";

/* Spelled-out numbers are everywhere in real GPB indicator text
   ("at least two (2) MOAs"). They are converted to digits during
   normalization so every rule can read them. */
const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90,
};

const WORD_NUMBERS_ALT = Object.keys(WORD_NUMBERS).join("|");

/* Participant nouns accepted before/after a count. `beneficiaries` and `women`
   are included because real GPB rows use them constantly
   ("1,308 direct beneficiaries trained", "100 women residing in ..."). */
const PARTICIPANT_NOUN_SRC =
  "students?|faculty\\s*members?|trainees?|employees?|participants?|persons?|individuals?|people|staff|beneficiaries|beneficiary|women|men|farmers?|teachers?|officials?|households?|barangay\\s+officials?";

/* Activity/output words — the "how many times" side of an indicator. */
const ACTIVITY_NOUN_SRC =
  "trainings?|seminars?|lectures?|meetings?|activities|activity|campaigns?|symposiums?|symposia|fora|forums?|assemblies|orientations?|outreach|civic(?:-|\\s)oriented\\s+activities|programs?|sessions?|workshops?|webinars?|drills?|exercises?|surveys?|assessments?";

/* Countable non-attendance outputs (MOAs, policies, tents, designs…). These
   declare a target but no attendance, so they are classified separately. */
const DELIVERABLE_NOUN_SRC =
  "moas?|memorandum\\s+of\\s+agreements?|proposals?|polic(?:y|ies|es)|designs?|prototypes?|reports?|plans?|tents?|rooms?|areas?|desks?|corners?|systems?|databases?|manuals?|toolkits?|materials?|copies?|documents?|agreements?|orders?|resolutions?|inventor(?:y|ies)|agenda|infographics?|bills?|ordinances?";

/* "No," / "No ," is a very common typo for "No." in encoded rows. */
function normalizeIndicatorText(value) {
  let s = String(value ?? "");
  s = s.replace(/[\r\n\t]+/g, " ");
  s = s.replace(/[\u2013\u2014\u2212]/g, "-");
  s = s.replace(/\bNo\s*,/gi, "No.");
  s = s.replace(/-\s*at\s?least/gi, "- at least");
  s = s.replace(/(^|[^a-zA-Z-])at\s?least/gi, "$1at least");
  s = s.replace(/\bleast\s*(\d)/gi, "least $1");
  s = s.replace(/(\d),(\d{3})\b/g, "$1$2");
  s = s.replace(/\s+/g, " ").trim();

  /* "two (2)" / "one(1)" -> the digit form wins; keep a space when the next
     character is a letter ("at least two (2)No of …" -> "at least 2 No of …") */
  s = s.replace(
    new RegExp(`\\b(${WORD_NUMBERS_ALT})\\s*\\((\\d+)\\)`, "gi"),
    (match, _word, digits, offset, whole) =>
      /[A-Za-z]/.test(whole[offset + match.length] || "")
        ? `${digits} `
        : digits,
  );
  /* any remaining spelled-out number becomes a digit */
  s = s.replace(
    new RegExp(`\\b(${WORD_NUMBERS_ALT})\\b`, "gi"),
    (word) => String(WORD_NUMBERS[word.toLowerCase()]),
  );
  return s;
}


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
      const full = m.input || "";
      /* Rows like "No. of lectures conducted - at least 4 - No of participants
         - at least 500" declare two targets: hand the whole string to the
         context scanner so the participant count is not lost. */
      const hasParticipantNoun = new RegExp(
        `\\b(?:${PARTICIPANT_NOUN_SRC})\\b`,
        "i",
      ).test(full);
      const atLeastCount = (full.match(/\bat\s+least\s+\d+/gi) || []).length;
      if (hasParticipantNoun || atLeastCount > 1) {
        return parseContextTargets(full);
      }

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
  {
    /* Final fallback for real-world rows that mix targets and word orders
       ("No, of training provided -at least 2- No of beneficiaries trained -
       at least 500"). Also labels purely qualitative indicators. */
    name: "context-targets",
    re: /\d/,
    parse(m) {
      return parseContextTargets(m.input);
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

/* ── Real-world GPB indicators mix several targets into one string and put the
   number either before or after its noun. The scanner below finds every number
   anchored to a target noun ("at least N", "N noun", "noun … N"), classifies it
   by the NEAREST noun, and de-duplicates totals against their gender
   breakdowns ("600 beneficiaries … 300 females and 300 males"). ── */

const PARTICIPANT_NOUN_MATCH_RE = new RegExp(
  `\\b(?:${PARTICIPANT_NOUN_SRC})\\b`,
  "gi",
);
const ACTIVITY_NOUN_MATCH_RE = new RegExp(
  `\\b(?:${ACTIVITY_NOUN_SRC})\\b`,
  "gi",
);
const DELIVERABLE_NOUN_MATCH_RE = new RegExp(
  `\\b(?:${DELIVERABLE_NOUN_SRC})\\b`,
  "gi",
);

function nearestNounKind(text, index, length) {
  const windowStart = Math.max(0, index - 70);
  const beforeRaw = text.slice(windowStart, index);
  const afterRaw = text.slice(
    index + length,
    Math.min(text.length, index + length + 70),
  );

  /* A new target clause ("No. of …", "Number of …") starts a different target,
     so nouns from the next clause must not classify this number. */
  const lastMarkerIndex = (str) => {
    const re = /\bNo[.,]?\s*of\b|\bNumber\s*of\b/gi;
    let idx = -1;
    let m;
    while ((m = re.exec(str)) !== null) idx = m.index;
    return idx;
  };

  const clauseCut = afterRaw.search(/\bNo[.,]?\s*of\b|\bNumber\s*of\b/i);
  const after = clauseCut >= 0 ? afterRaw.slice(0, clauseCut) : afterRaw;

  /* Slice at the LAST marker so the current clause keeps its own head noun. */
  const beforeCut = lastMarkerIndex(beforeRaw);
  const before = beforeCut >= 0 ? beforeRaw.slice(beforeCut) : beforeRaw;

  let best = null;
  const kinds = [
    ["participant", PARTICIPANT_NOUN_MATCH_RE],
    ["activity", ACTIVITY_NOUN_MATCH_RE],
    ["deliverable", DELIVERABLE_NOUN_MATCH_RE],
  ];

  /* 1. A noun sitting right after the number is the clearest signal
     ("at least 3 sustainable livelihood programs"). */
  kinds.forEach(([kind, re]) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(after)) !== null) {
      if (m.index <= 25 && (!best || m.index < best.distance)) {
        best = { kind, distance: m.index };
      }
    }
  });
  if (best) return best.kind;

  /* 2. Otherwise the clause head names the target
     ("No. of beneficiaries of the outreach activities conducted - at least 200"). */
  let leftmost = null;
  kinds.forEach(([kind, re]) => {
    re.lastIndex = 0;
    const m = re.exec(before);
    if (m && (!leftmost || m.index < leftmost.index)) {
      leftmost = { kind, index: m.index };
    }
  });
  if (leftmost) return leftmost.kind;

  /* 3. Last resort: the nearest noun anywhere in the window. */
  kinds.forEach(([kind, re]) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(after)) !== null) {
      if (!best || m.index < best.distance) best = { kind, distance: m.index };
    }
  });

  return best ? best.kind : null;
}

function dedupeCounts(entries, { window = 160 } = {}) {
  const sorted = [...entries].sort((a, b) => a.pos - b.pos);
  const kept = [];
  sorted.forEach((entry) => {
    const duplicate = kept.find(
      (k) => k.n === entry.n && Math.abs(entry.pos - k.pos) <= window,
    );
    if (!duplicate) kept.push(entry);
  });
  return kept;
}

function parseContextTargets(text) {
  /* Percent targets are masked first so "80%" never reads as 80 participants. */
  const masked = text.replace(/(\d{1,3})\s*%/g, (m) => m.replace(/\d/g, "X"));
  const percentMatch = text.match(/(?:at\s+least\s+)?(\d{1,3})\s*%/i);
  const percent = percentMatch ? Number(percentMatch[1]) : null;

  /* Gender breakdowns: "(40 Male and 60 Female)", "F-100/M-100",
     "300 females and 300 males" */
  const sexCounts = [];
  const sexRe =
    /\b(females?|f)\b\s*[-:=]?\s*(\d{1,6})\b|\b(\d{1,6})\s*(females?)\b|\b(males?|m)\b\s*[-:=]?\s*(\d{1,6})\b|\b(\d{1,6})\s*(males?)\b/gi;
  let sm;
  while ((sm = sexRe.exec(masked)) !== null) {
    const isFemale = Boolean(sm[1] || sm[4]);
    const n = Number(sm[2] || sm[3] || sm[6] || sm[7]);
    if (n) {
      sexCounts.push({
        pos: sm.index,
        end: sm.index + sm[0].length,
        n,
        isFemale,
      });
    }
  }
  /* Numbers that are part of a gender split ("800 females and 508 males") are
     already represented by the breakdown total — never count them twice. */
  const insideSexSpan = (pos) =>
    sexCounts.some((s) => pos >= s.pos && pos <= s.end);

  const breakdowns = [];
  sexCounts
    .sort((a, b) => a.pos - b.pos)
    .forEach((entry) => {
      const last = breakdowns[breakdowns.length - 1];
      if (last && entry.pos - last.endPos <= 60) {
        last.sum += entry.n;
        last.endPos = entry.pos;
        if (entry.isFemale) last.female += entry.n;
        else last.male += entry.n;
      } else {
        breakdowns.push({
          pos: entry.pos,
          endPos: entry.pos,
          sum: entry.n,
          female: entry.isFemale ? entry.n : 0,
          male: entry.isFemale ? 0 : entry.n,
        });
      }
    });
  breakdowns.forEach((bd) => {
    if (bd.female === 0 || bd.male === 0) bd.sum = 0;
  });

  const participants = [];
  const activities = [];
  const deliverables = [];

  /* "at least N" — classified by the nearest noun */
  const atLeastRe = /\bat\s+least\s+(\d{1,6})\b/gi;
  let am;
  while ((am = atLeastRe.exec(masked)) !== null) {
    const n = Number(am[1]);
    const kind = nearestNounKind(masked, am.index, am[0].length);
    const entry = { pos: am.index, n };
    if (kind === "participant") participants.push(entry);
    else if (kind === "activity") activities.push(entry);
    else if (kind === "deliverable") deliverables.push(entry);
  }

  /* "N noun" — e.g. "1308 direct beneficiaries", "5 trainings", "10 tents" */
  const isUsableCount = (pos, raw) =>
    !insideSexSpan(pos) && !/^\d{4}$/.test(raw) && !/^\d\)/.test(masked.slice(pos, pos + 3));

  const numberNounRe =
    /\b(\d{1,6})\s*(?:direct\s+|total\s+|new\s+|additional\s+)?([a-z][a-z/&-]*)\b/gi;
  let nm;
  while ((nm = numberNounRe.exec(masked)) !== null) {
    const n = Number(nm[1]);
    if (!n || !isUsableCount(nm.index, nm[1])) continue;
    const kind = nearestNounKind(
      masked,
      nm.index + nm[0].indexOf(nm[1]),
      nm[1].length,
    );
    const entry = { pos: nm.index, n };
    if (kind === "participant") participants.push(entry);
    else if (kind === "activity") activities.push(entry);
    else if (kind === "deliverable") deliverables.push(entry);
  }

  /* "noun … N" — e.g. "design-1", "prototype created - 1", "tents purchased 10" */
  const nounNumberRe = new RegExp(
    `\\b(?:${DELIVERABLE_NOUN_SRC}|${ACTIVITY_NOUN_SRC})\\b[^0-9]{0,30}?\\b(\\d{1,6})\\b`,
    "gi",
  );
  let nn;
  while ((nn = nounNumberRe.exec(masked)) !== null) {
    const n = Number(nn[1]);
    if (!n || !isUsableCount(nn.index + nn[0].lastIndexOf(nn[1]), nn[1])) continue;
    const kind = nearestNounKind(masked, nn.index, nn[0].length);
    const entry = { pos: nn.index, n };
    if (kind === "deliverable") deliverables.push(entry);
    else if (kind === "activity") activities.push(entry);
    else if (kind === "participant") participants.push(entry);
  }

  /* A breakdown only supplies the total when no other count already did
     ("1,537 (1000 females and 537 males) direct beneficiaries"). */
  breakdowns.forEach((bd) => {
    if (!bd.sum) return;
    const covered = participants.some((p) => Math.abs(p.pos - bd.pos) <= 160);
    if (!covered) participants.push({ pos: bd.pos, n: bd.sum, breakdown: bd });
  });

  const keptParticipants = dedupeCounts(participants, { window: 300 });
  /* Cross-category de-duplication only guards the SAME occurrence being read
     twice (e.g. "at least 500" as both participant and activity) — keep the
     window tight so two different targets of equal value both survive. */
  const keptActivities = dedupeCounts(activities).filter(
    (a) =>
      !keptParticipants.some(
        (p) => p.n === a.n && Math.abs(p.pos - a.pos) <= 20,
      ),
  );
  const keptDeliverables = [...deliverables]
    .filter(
      (d) =>
        !keptParticipants.some(
          (p) => p.n === d.n && Math.abs(p.pos - d.pos) <= 20,
        ) &&
        !keptActivities.some(
          (a) => a.n === d.n && Math.abs(a.pos - d.pos) <= 20,
        ),
    )
    .sort((a, b) => a.pos - b.pos);

  const targetTotal = keptParticipants.length
    ? keptParticipants.reduce((s, p) => s + p.n, 0)
    : null;
  const targetActivities = keptActivities.length
    ? keptActivities.reduce((s, a) => s + a.n, 0)
    : null;
  const targetDeliverables = keptDeliverables.length
    ? keptDeliverables.reduce((s, d) => s + d.n, 0)
    : null;
  const breakdown = keptParticipants.find((p) => p.breakdown)?.breakdown;

  if (
    targetTotal === null &&
    targetActivities === null &&
    targetDeliverables === null
  ) {
    const hasPercent = percent !== null;
    return {
      /* A percentage target has no countable head-count, so it stays outside
         the participant bar — but it is recognised, not silently dropped. */
      measurable: false,
      kind: hasPercent ? "percent-target" : "qualitative",
      classification: hasPercent ? "percent" : "qualitative",
      targetTotal: null,
      targetFemale: null,
      targetMale: null,
      targetActivities: null,
      activityType: null,
      targetDeliverables: null,
      targetPercent: percent,
    };
  }

  return {
    measurable: true,
    kind: "context-targets",
    classification:
      targetTotal !== null
        ? "participants"
        : targetActivities !== null
          ? "activities"
          : "deliverables",
    targetTotal,
    targetFemale: breakdown ? breakdown.female : null,
    targetMale: breakdown ? breakdown.male : null,
    targetActivities,
    activityType: null,
    targetDeliverables,
    targetPercent: percent,
  };
}



function classifyResult(result) {
  if (result.classification) return result;
  if (result.targetTotal != null) result.classification = "participants";
  else if (result.targetActivities != null) result.classification = "activities";
  else if (result.targetDeliverables != null) result.classification = "deliverables";
  else if (result.targetPercent != null) result.classification = "percent";
  else result.classification = result.measurable ? "activities" : "unparseable";
  return result;
}

const EMPTY_RESULT = {
  measurable: false,
  kind: "empty",
  classification: "empty",
  targetTotal: null,
  targetFemale: null,
  targetMale: null,
  targetActivities: null,
  activityType: null,
  targetDeliverables: null,
  targetPercent: null,
};

export function extractParticipantTarget(str) {
  if (!str || typeof str !== "string" || !str.trim()) {
    return { ...EMPTY_RESULT };
  }

  const normalized = normalizeIndicatorText(str);

  for (const rule of RULES) {
    const m = normalized.match(rule.re);
    if (m) {
      const result = rule.parse(m);
      return classifyResult({
        measurable: Boolean(result.measurable),
        /* the context scanner reports its own more precise kind */
        kind: result.kind ?? rule.name,
        classification: result.classification ?? null,
        targetTotal: result.targetTotal ?? null,
        targetFemale: result.targetFemale ?? null,
        targetMale: result.targetMale ?? null,
        targetActivities: result.targetActivities ?? null,
        activityType: result.activityType ?? null,
        targetDeliverables: result.targetDeliverables ?? null,
        targetPercent: result.targetPercent ?? null,
      });
    }
  }

  /* Nothing numeric to anchor on — the row describes qualitative outcomes. */
  const hasDigits = /\d/.test(normalized);
  return {
    measurable: false,
    kind: hasDigits ? "unparseable" : "qualitative",
    classification: hasDigits ? "unparseable" : "qualitative",
    targetTotal: null,
    targetFemale: null,
    targetMale: null,
    targetActivities: null,
    activityType: null,
    targetDeliverables: null,
    targetPercent: null,
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

/**
 * Aggregates the participant targets declared in a project's Performance Indicator /
 * Target strings into a single Target-vs-Actual figure (used by the participant
 * progress bars). Activity-only indicators — e.g. "Conduct at least 2 awareness
 * campaigns per semester" — declare no participant count and are skipped, so
 * `hasTarget` is false when nothing measurable is present.
 */
export function aggregateIndicatorProgress(
  project,
  { key = "attended_users" } = {},
) {
  const indicators = indicatorTargets(project, { key });
  const measurable = indicators.filter(
    (indicator) => indicator.hasParticipantTarget,
  );

  /* Every indicator now carries a classification, so a project that cannot be
     measured can say WHY (qualitative wording, percentage-only target, nothing
     encoded yet) instead of silently showing an empty bar. */
  const classifications = indicators.reduce((acc, indicator) => {
    const c = indicator.classification || "unparseable";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const hasIndicators = indicators.length > 0;
  const needsEncoding = measurable.length === 0;

  if (measurable.length === 0) {
    return {
      hasTarget: false,
      hasIndicators,
      needsEncoding,
      classifications,
      indicatorCount: 0,
      actualTotal: 0,
      targetTotal: 0,
      remaining: 0,
      percent: 0,
      exceeded: false,
    };
  }

  const targetTotal = measurable.reduce((sum, i) => sum + i.targetTotal, 0);
  const actualTotal = measurable.reduce((sum, i) => sum + i.actualTotal, 0);
  const remaining = targetTotal - actualTotal;

  return {
    hasTarget: true,
    hasIndicators,
    needsEncoding,
    classifications,
    indicatorCount: measurable.length,
    actualTotal,
    targetTotal,
    remaining,
    percent: targetTotal > 0 ? Math.round((actualTotal / targetTotal) * 100) : 0,
    exceeded: remaining < 0,
  };
}
