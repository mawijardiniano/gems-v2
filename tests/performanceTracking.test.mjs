import { test } from "node:test";
import assert from "node:assert";

import {
  extractParticipantTarget,
  sumActualParticipants,
  computeIndicatorProgress,
  indicatorTargets,
  aggregateIndicatorProgress,
} from "../lib/performanceTracking.js";

// ─── extractParticipantTarget ────────────────────────────────────────

test("structured-both: parses target total from 'At least N ... conducted with X participants'", () => {
  const r = extractParticipantTarget(
    "At least 5 Seminars conducted with 120 participants (70 Female, 50 Male)",
  );

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "structured-both");
  assert.strictEqual(r.targetTotal, 120);
  assert.strictEqual(r.targetFemale, 70);
  assert.strictEqual(r.targetMale, 50);
  assert.strictEqual(r.targetActivities, 5);
  assert.strictEqual(r.activityType, "Seminar");
});

test("structured-participants: parses target total from 'At least N participants trained'", () => {
  const r = extractParticipantTarget(
    "At least 200 participants trained. (150 Female, 50 Male)",
  );

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "structured-participants");
  assert.strictEqual(r.targetTotal, 200);
  assert.strictEqual(r.targetFemale, 150);
  assert.strictEqual(r.targetMale, 50);
  assert.strictEqual(r.targetActivities, null);
});

test("activities-only: no participant target (measurable, targetTotal null)", () => {
  const r = extractParticipantTarget("No. of Trainings conducted - at least 8");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "activities-only");
  assert.strictEqual(r.targetTotal, null);
  assert.strictEqual(r.targetActivities, 8);
});

test("free-text-breakdown: extracts target from '(F Female, M Male)' in free text", () => {
  const r = extractParticipantTarget("Train at least 60 employees (40 Female, 20 Male)");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "breakdown-groups");
  assert.strictEqual(r.targetTotal, 60);
});

test("free-text-count: extracts target from 'at least N participants'", () => {
  const r = extractParticipantTarget("At least 80 participants expected");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "breakdown-groups");
  assert.strictEqual(r.targetTotal, 80);
});

test("percent-target: percentage is not a measurable participant target but is recognised", () => {
  const r = extractParticipantTarget("At least 80% of male students trained");

  assert.strictEqual(r.measurable, false);
  assert.strictEqual(r.kind, "percent-target");
  assert.strictEqual(r.classification, "percent");
  assert.strictEqual(r.targetTotal, null);
  assert.strictEqual(r.targetPercent, 80);
});

test("activity target: count without a participant noun is captured as an activity, never as participants", () => {
  const r = extractParticipantTarget("Conduct 3 awareness campaigns");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.classification, "activities");
  assert.strictEqual(r.targetTotal, null);
  assert.strictEqual(r.targetActivities, 3);
});

test("ordering: structured-both wins (no double-count via free-text-breakdown)", () => {
  const r = extractParticipantTarget(
    "At least 5 Seminars conducted with 120 participants (70 Female, 50 Male)",
  );

  // Rule 1 fires first; the embedded "(70 Female, 50 Male)" must not be
  // re-interpreted to stack another 120.
  assert.strictEqual(r.kind, "structured-both");
  assert.strictEqual(r.targetTotal, 120);
});

test("empty/undefined input is not measurable", () => {
  assert.strictEqual(extractParticipantTarget("").measurable, false);
  assert.strictEqual(extractParticipantTarget(undefined).measurable, false);
  assert.strictEqual(extractParticipantTarget(null).measurable, false);
});
// ─── Real GPB indicator rows (copied from the live database) ─────────

test("real row: mixed activity + participant targets are BOTH captured", () => {
  const r = extractParticipantTarget(
    "No, of training\nprovided -at least 2-\nNo of\nbeneficiaries/female employees trained - at least 500",
  );

  assert.strictEqual(r.classification, "participants");
  assert.strictEqual(r.targetTotal, 500);
  assert.strictEqual(r.targetActivities, 2);
});

test("real row: number placed after the noun is still read", () => {
  const r = extractParticipantTarget(
    "No of participants - at least 100 women residing in disaster prone areas",
  );

  assert.strictEqual(r.targetTotal, 100);
  assert.strictEqual(r.classification, "participants");
});

test("real row: thousands separators are read as one number", () => {
  const r = extractParticipantTarget(
    "1,308 direct beneficiaries trained, increased awareness on Safe Spaces Act - 800 females and 508 males trained",
  );

  assert.strictEqual(r.targetTotal, 1308);
});

test("real row: a repeated total with a gender split is never double counted", () => {
  const r = extractParticipantTarget(
    "1,320 beneficiaries reached increased reproductive health knowledge 1,320 (700 females and 620 males) beneficiaries",
  );

  assert.strictEqual(r.targetTotal, 1320);
});

test("real row: breakdown supplies the total and keeps activity + percent targets", () => {
  const r = extractParticipantTarget(
    "1,537 (1000 females and 537 males) direct beneficiaries trained at least 3 sustainable livelihood programs developed 40% women in leadership roles",
  );

  assert.strictEqual(r.targetTotal, 1537);
  assert.strictEqual(r.targetActivities, 3);
  assert.strictEqual(r.targetPercent, 40);
});

test("real row: F-/M- shorthand and word numbers are understood", () => {
  const r = extractParticipantTarget(
    "No. of financial literacy activity conducted - at least 1- No of participants trainedat least fifty (F-30 and M-20)",
  );

  assert.strictEqual(r.targetTotal, 50);
  assert.strictEqual(r.targetActivities, 1);
});

test("real row: two-word number form is understood", () => {
  const r = extractParticipantTarget(
    "No of meetings conducted at least two (2)No of polices revisited or revised - at least two (2)",
  );

  assert.strictEqual(r.targetActivities, 2);
  assert.strictEqual(r.targetDeliverables, 2);
});

test("real row: deliverable counts are recognised outside the participant bar", () => {
  assert.strictEqual(
    extractParticipantTarget("No. of MOAS proposed and signed - at least 5")
      .targetDeliverables,
    5,
  );
  assert.strictEqual(
    extractParticipantTarget(
      "No of policies revisited, revised and formulated at least 2",
    ).targetDeliverables,
    2,
  );
  assert.strictEqual(
    extractParticipantTarget("10 modular tents purchased").targetDeliverables,
    10,
  );
  assert.strictEqual(
    extractParticipantTarget(
      "No. of proposal prepared, approved and implemented - at least 1",
    ).classification,
    "deliverables",
  );
});

test("real row: list markers and years are never counted as targets", () => {
  const r = extractParticipantTarget(
    "1) Survey conducted 2) meeting with LGU on program design completed and 3) Intervention design completed",
  );

  assert.strictEqual(r.targetTotal, null);
  assert.strictEqual(r.targetDeliverables, null);
  assert.strictEqual(r.classification, "qualitative");
});

test("real row: qualitative indicators are labelled, never dropped silently", () => {
  const qualitative = [
    "BOR Approved GAD Agenda",
    "Presence of a well-designed system Data stored and processed Updated data bases and statistics",
    "No of activity conducted",
  ];

  qualitative.forEach((row) => {
    assert.strictEqual(extractParticipantTarget(row).classification, "qualitative");
  });
});

test("every indicator class is named", () => {
  const classes = [
    extractParticipantTarget("At least 200 participants trained. (150 Female, 50 Male)"),
    extractParticipantTarget("No. of Trainings conducted - at least 8"),
    extractParticipantTarget("10 modular tents purchased"),
    extractParticipantTarget("At least 80% of cases logged"),
    extractParticipantTarget("BOR Approved GAD Agenda"),
    extractParticipantTarget(""),
  ].map((r) => r.classification);

  assert.deepStrictEqual(classes, [
    "participants",
    "activities",
    "deliverables",
    "percent",
    "qualitative",
    "empty",
  ]);
});

// ─── sumActualParticipants ───────────────────────────────────────────

const attended = (sex) => ({
  user_id: { personal_info_id: { gadData: { sexAtBirth: sex } } },
});

test("sumActualParticipants counts non-cancelled events and skips cancelled", () => {
  const project = {
    events: [
      {
        status: "completed",
        attended_users: [
          attended("Female"),
          attended("Female"),
          attended("Male"),
        ],
      },
      {
        status: "completed",
        attended_users: [
          attended("Female"),
          attended("Male"),
          attended("Male"),
          { user_id: {} },
        ],
      },
      { status: "cancelled", attended_users: [{ user_id: {} }] },
    ],
  };

  const r = sumActualParticipants(project);

  assert.strictEqual(r.actualTotal, 7);
  assert.strictEqual(r.actualFemale, 3);
  assert.strictEqual(r.actualMale, 3);
});

test("sumActualParticipants supports registered_users key", () => {
  // registered_users is populated as UserAuth objects that carry a
  // personal_info_id -> gadData.sexAtBirth (see app/api/events/route.js:46).
  const registered = (sex) => ({
    personal_info_id: { gadData: { sexAtBirth: sex } },
  });

  const project = {
    events: [
      {
        status: "completed",
        registered_users: [registered("Female"), registered("Male")],
      },
    ],
  };

  const r = sumActualParticipants(project, { key: "registered_users" });
  assert.strictEqual(r.actualTotal, 2);
  assert.strictEqual(r.actualFemale, 1);
  assert.strictEqual(r.actualMale, 1);
});

test("sumActualParticipants returns zeros with no events", () => {
  const r = sumActualParticipants({});
  assert.deepStrictEqual(r, { actualTotal: 0, actualFemale: 0, actualMale: 0 });
});
// ─── computeIndicatorProgress ────────────────────────────────────────

test("computeIndicatorProgress: remaining is positive shortfall when below target", () => {
  const project = { events: [] };
  const r = computeIndicatorProgress({
    indicatorStr: "At least 120 participants trained. (70 Female, 50 Male)",
    project,
  });

  assert.strictEqual(r.hasParticipantTarget, true);
  assert.strictEqual(r.targetTotal, 120);
  assert.strictEqual(r.actualTotal, 0);
  assert.strictEqual(r.remaining, 120);
  assert.strictEqual(r.percent, 0);
  assert.strictEqual(r.exceeded, false);
});

test("computeIndicatorProgress: remaining goes negative (exceeded) past target", () => {
  const project = {
    events: [
      {
        status: "completed",
        attended_users: [
          attended("Female"),
          attended("Male"),
          attended("Female"),
        ],
      },
    ],
  };
  const r = computeIndicatorProgress({
    indicatorStr: "At least 2 participants trained. (1 Female, 1 Male)",
    project,
  });

  assert.strictEqual(r.targetTotal, 2);
  assert.strictEqual(r.actualTotal, 3);
  assert.strictEqual(r.remaining, -1);
  assert.strictEqual(r.percent, 150);
  assert.strictEqual(r.exceeded, true);
});

test("computeIndicatorProgress: activities-only has no participant target", () => {
  const r = computeIndicatorProgress({
    indicatorStr: "No. of Trainings conducted - at least 8",
    project: { events: [] },
  });

  assert.strictEqual(r.hasParticipantTarget, false);
  assert.strictEqual(r.targetTotal, null);
  assert.strictEqual(r.targetActivities, 8);
});

test("indicatorTargets maps only non-empty indicators", () => {
  const project = {
    performance_indicator_target: [
      "At least 5 Seminars conducted with 120 participants (70 Female, 50 Male)",
      "",
      "No. of Trainings conducted - at least 8",
    ],
    events: [],
  };

  const list = indicatorTargets(project);

  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].targetTotal, 120);
  assert.strictEqual(list[0].hasParticipantTarget, true);
  // activities-only is still returned but flagged as no participant target
  assert.strictEqual(list[1].hasParticipantTarget, false);
  assert.strictEqual(list[1].targetActivities, 8);
});
// ─── indicatorTargets shape robustness (regression) ──────────────────
// The real Mongoose FieldSchema shape is { value: [...] }; the suite
// originally only tested plain arrays, which is how the .trim() crash
// slipped through. These mirror the actual runtime data.

test("indicatorTargets handles Mongoose FieldSchema { value: [...] } shape", () => {
  const project = {
    performance_indicator_target: {
      value: [
        "At least 5 Seminars conducted with 120 participants (70 Female, 50 Male)",
        "No. of Trainings conducted - at least 8",
      ],
    },
    events: [],
  };

  const list = indicatorTargets(project);

  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].targetTotal, 120);
  assert.strictEqual(list[1].hasParticipantTarget, false);
  assert.strictEqual(list[1].targetActivities, 8);
});

test("indicatorTargets handles a single string value in a wrapper", () => {
  const project = {
    performance_indicator_target: {
      value: "At least 80 participants expected",
    },
    events: [],
  };

  const list = indicatorTargets(project);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].targetTotal, 80);
});

test("indicatorTargets handles null/undefined and does not crash", () => {
  assert.deepStrictEqual(indicatorTargets({ performance_indicator_target: null }), []);
  assert.deepStrictEqual(indicatorTargets({}), []);
  assert.deepStrictEqual(indicatorTargets(null), []);
});

test("indicatorTargets handles an array of { value } wrappers", () => {
  const project = {
    performance_indicator_target: [
      { value: "At least 50 participants trained. (30 Female, 20 Male)" },
      { value: "" },
    ],
    events: [],
  };

  const list = indicatorTargets(project);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].targetTotal, 50);
});

test("computeIndicatorProgress tolerates a non-string indicator (no crash)", () => {
  const r = computeIndicatorProgress({ indicatorStr: { value: 123 }, project: { events: [] } });
  assert.strictEqual(r.hasParticipantTarget, false);
});

// ─── No. of Participants / breakdown-groups (new parser) ─────────────

test("breakdown-groups: sums students + faculty groups (user's real string)", () => {
  const r = extractParticipantTarget(
    "No. of activities conducted 5 activities conducted on March 2025\nNo. of Participants- 1000\nstudents (500 Male, 500 Female, 100 Faculty Members (50 Male, 50 Female",
  );

  assert.strictEqual(r.measurable, true);
  // 500+500 students + 50+50 faculty = 1000 + 100 = 1100
  assert.strictEqual(r.targetTotal, 1100);
});

test("breakdown-groups: attached noun-count is not double-counted", () => {
  const r = extractParticipantTarget(
    "No. of Participants- 1000 students (500 Male, 500 Female)",
  );

  // The breakdown (500+500) claims the preceding "1000 students" label;
  // only the group sum counts.
  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.targetTotal, 1000);
});

test("breakdown-groups: sums standalone noun-counts", () => {
  const r = extractParticipantTarget("Train 200 employees and 300 students");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.targetTotal, 500);
});

test("participant-total: explicit 'No. of Participants-' total", () => {
  const r = extractParticipantTarget("No. of Participants- 1000");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "participant-total");
  assert.strictEqual(r.targetTotal, 1000);
});

test("activities-count: generic 'No. of activities conducted'", () => {
  const r = extractParticipantTarget("No. of activities conducted 5");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "activities-count");
  assert.strictEqual(r.targetActivities, 5);
  assert.strictEqual(r.targetTotal, null);
});

test("computeIndicatorProgress preserves the raw indicator string", () => {
  const rawText = "At least 5 seminars conducted with 1000 participants (500 Female, 500 Male)";
  const r = computeIndicatorProgress({ indicatorStr: rawText, project: { events: [] }, raw: rawText });

  assert.strictEqual(r.raw, rawText);

  // Also for unparseable indicators so the UI never shows the internal kind.
  const unparseable = "Conduct at least 2 awareness campaigns per semester on gender rights and safe spaces.";
  const u = computeIndicatorProgress({ indicatorStr: unparseable, project: { events: [] }, raw: unparseable });
  assert.strictEqual(u.raw, unparseable);
  assert.strictEqual(u.hasParticipantTarget, false);
});

// ─── Bare / space-tolerant breakdowns ────────────────────────────────

test("breakdown-groups: bare '500 Male, 500 Female' without parens", () => {
  const r = extractParticipantTarget("No. of students 500 Male, 500 Female");

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.kind, "breakdown-groups");
  assert.strictEqual(r.targetTotal, 1000);
});

test("breakdown-groups: space-tolerant '100Male' (no space) with another group", () => {
  const r = extractParticipantTarget(
    "No. of students (500 Male, 500 Female) Faculty (100Male, 100 Female)",
  );

  assert.strictEqual(r.measurable, true);
  assert.strictEqual(r.targetTotal, 1200);

// ─── aggregateIndicatorProgress (Target vs Actual bars) ──────────────

const indicatorProject = (indicators, events = []) => ({
  performance_indicator_target: indicators,
  events,
});

test("aggregateIndicatorProgress reads the target from a single participant indicator", () => {
  const result = aggregateIndicatorProgress(
    indicatorProject([
      "At least 5 seminars conducted with 1000 participants (500 Female, 500 Male)",
    ]),
  );

  assert.strictEqual(result.hasTarget, true);
  assert.strictEqual(result.indicatorCount, 1);
  assert.strictEqual(result.targetTotal, 1000);
  assert.strictEqual(result.actualTotal, 0);
  assert.strictEqual(result.percent, 0);
  assert.strictEqual(result.exceeded, false);
});

test("aggregateIndicatorProgress skips activity-only indicators without a participant count", () => {
  const result = aggregateIndicatorProgress(
    indicatorProject([
      "Conduct at least 2 awareness campaigns per semester on gender rights and safe spaces.",
    ]),
  );

  assert.strictEqual(result.hasTarget, false);
  assert.strictEqual(result.indicatorCount, 0);
  assert.strictEqual(result.targetTotal, 0);
  assert.strictEqual(result.percent, 0);
});

test("aggregateIndicatorProgress sums grouped students + faculty targets (1200)", () => {
  const result = aggregateIndicatorProgress(
    indicatorProject([
      "No. of students (500 Male, 500 Female) Faculty (100Male, 100 Female)",
    ]),
  );

  assert.strictEqual(result.hasTarget, true);
  assert.strictEqual(result.targetTotal, 1200);
});

test("aggregateIndicatorProgress counts attendance from linked events and flags overshoot", () => {
  const attended = (sex) => ({
    user_id: { personal_info_id: { gadData: { sexAtBirth: sex } } },
  });

  const result = aggregateIndicatorProgress({
    performance_indicator_target: {
      value: [
        "At least 2 participants trained. (1 Female, 1 Male)",
        "Conduct at least 2 awareness campaigns per semester on gender rights and safe spaces.",
      ],
    },
    events: [
      {
        title: "Training",
        status: "completed",
        attended_users: [
          attended("Female"),
          attended("Male"),
          attended("Female"),
        ],
      },
      {
        title: "Cancelled",
        status: "cancelled",
        attended_users: [attended("Male")],
      },
    ],
  });

  assert.strictEqual(result.hasTarget, true);
  assert.strictEqual(result.indicatorCount, 1); // campaign indicator skipped
  assert.strictEqual(result.targetTotal, 2);
  assert.strictEqual(result.actualTotal, 3);
  assert.strictEqual(result.remaining, -1);
  assert.strictEqual(result.percent, 150);
  assert.strictEqual(result.exceeded, true);
});

test("aggregateIndicatorProgress reports no target for empty or missing indicators", () => {
  const cases = [
    {},
    { performance_indicator_target: null },
    { performance_indicator_target: [] },
    { performance_indicator_target: ["", "   "] },
  ];

  cases.forEach((project) => {
    const result = aggregateIndicatorProgress(project);
    assert.strictEqual(result.hasTarget, false);
    assert.strictEqual(result.actualTotal, 0);
    assert.strictEqual(result.targetTotal, 0);
    assert.strictEqual(result.exceeded, false);
    /* nothing encoded must be visible, not silently ignored */
    assert.strictEqual(result.needsEncoding, true);
    assert.strictEqual(result.hasIndicators, false);
  });
});

test("aggregateIndicatorProgress explains why a project cannot be measured", () => {
  const qualitative = aggregateIndicatorProgress({
    performance_indicator_target: { value: ["BOR Approved GAD Agenda"] },
  });
  assert.strictEqual(qualitative.hasTarget, false);
  assert.strictEqual(qualitative.hasIndicators, true);
  assert.strictEqual(qualitative.needsEncoding, true);
  assert.strictEqual(qualitative.classifications.qualitative, 1);

  const percentOnly = aggregateIndicatorProgress({
    performance_indicator_target: { value: ["At least 80% of cases logged"] },
  });
  assert.strictEqual(percentOnly.needsEncoding, true);
  assert.strictEqual(percentOnly.classifications.percent, 1);

  const measurable = aggregateIndicatorProgress({
    performance_indicator_target: {
      value: ["At least 100 participants trained (50 Female, 50 Male)"],
    },
    events: [],
  });
  assert.strictEqual(measurable.hasTarget, true);
  assert.strictEqual(measurable.needsEncoding, false);
  assert.strictEqual(measurable.classifications.participants, 1);
});

});