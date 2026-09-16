import { test } from "node:test";
import assert from "node:assert";

import {
  stripActualRefMarkers,
  normalizeAccomplishmentLines,
  getActiveProjectEvents,
  summarizeProjectEvents,
  generateAccomplishmentSummary,
  usesAccomplishmentOverride,
  shouldUseAccomplishmentOverride,
  resolveAccomplishmentLines,
  resolveAccomplishmentText,
  getParticipantBreakdown,
  withGeneratedAccomplishment,
  PROJECT_EVENTS_POPULATE,
} from "../lib/accomplishmentSummary.js";

const attended = (sex, status) => ({
  user_id: {
    personal_info_id: {
      gadData: { sexAtBirth: sex },
      personal: status ? { currentStatus: status } : {},
    },
  },
});

/* Reproduction of the reported bug: 'Takbo Para kay Juana' was saved with a single
   event while a second event ('test') had already been linked to the project. */
const reportedProject = {
  actual_accomplishment: [
    "1 event conducted — 'Takbo Para kay Juana' with 1 participant (0 Female, 0 Male)",
  ],
  actual_accomplishment_override: false,
  events: [
    {
      title: "Takbo Para kay Juana",
      status: "completed",
      attended_users: [attended("Female")],
    },
    {
      title: "test",
      status: "active",
      attended_users: [attended("Female"), attended("Male")],
    },
  ],
};

// ── stripActualRefMarkers / normalizeAccomplishmentLines ────────────

test("stripActualRefMarkers removes the legacy rollup marker", () => {
  const line =
    'Conducted "Takbo" on August 18, 2026 — 3 participants [ref:abc123]';
  assert.strictEqual(
    stripActualRefMarkers(line),
    'Conducted "Takbo" on August 18, 2026 — 3 participants',
  );
});

test("normalizeAccomplishmentLines accepts arrays, strings and empty values", () => {
  assert.deepStrictEqual(normalizeAccomplishmentLines(["a  ", "", "  b"]), [
    "a",
    "b",
  ]);
  assert.deepStrictEqual(normalizeAccomplishmentLines("solo line"), [
    "solo line",
  ]);
  assert.deepStrictEqual(normalizeAccomplishmentLines(null), []);
  assert.deepStrictEqual(normalizeAccomplishmentLines(undefined), []);
});

// ─── getActiveProjectEvents / summarizeProjectEvents ────────────────

test("getActiveProjectEvents drops cancelled events and null entries", () => {
  const events = getActiveProjectEvents({
    events: [
      { title: "keep", status: "active" },
      null,
      { title: "drop", status: "cancelled" },
      { title: "keep2", status: "completed" },
    ],
  });

  assert.deepStrictEqual(
    events.map((e) => e.title),
    ["keep", "keep2"],
  );
});

test("summarizeProjectEvents counts participants and sex breakdown", () => {
  const summary = summarizeProjectEvents(reportedProject);

  assert.strictEqual(summary.eventCount, 2);
  assert.strictEqual(summary.totalAttended, 3);
  assert.strictEqual(summary.femaleCount, 2);
  assert.strictEqual(summary.maleCount, 1);
  assert.deepStrictEqual(summary.titles, ["Takbo Para kay Juana", "test"]);
});

// ─── generateAccomplishmentSummary ──────────────────────────────────

test("generateAccomplishmentSummary uses every linked event (the reported bug)", () => {
  assert.strictEqual(
    generateAccomplishmentSummary(reportedProject),
    "2 events conducted — 'Takbo Para kay Juana', 'test' with 3 participants (2 Female, 1 Male)",
  );
});

test("generateAccomplishmentSummary uses singular wording for one event/participant", () => {
  assert.strictEqual(
    generateAccomplishmentSummary({
      events: [
        {
          title: "Solo",
          status: "active",
          attended_users: [attended("Male")],
        },
      ],
    }),
    "1 event conducted — 'Solo' with 1 participant (0 Female, 1 Male)",
  );
});

test("generateAccomplishmentSummary reports zero participants for an event with no attendance", () => {
  assert.strictEqual(
    generateAccomplishmentSummary({
      events: [{ title: "Upcoming", status: "active", attended_users: [] }],
    }),
    "1 event conducted — 'Upcoming' with 0 participants (0 Female, 0 Male)",
  );
});

test("generateAccomplishmentSummary excludes cancelled events entirely", () => {
  assert.strictEqual(
    generateAccomplishmentSummary({
      events: [{ title: "Cancelled", status: "cancelled", attended_users: [] }],
    }),
    "",
  );
});

test("generateAccomplishmentSummary returns an empty string without events", () => {
  assert.strictEqual(generateAccomplishmentSummary({}), "");
  assert.strictEqual(generateAccomplishmentSummary({ events: [] }), "");
  assert.strictEqual(generateAccomplishmentSummary(null), "");
});

// ─── resolveAccomplishmentLines / Text ──────────────────────────────

test("usesAccomplishmentOverride reflects the saved flag", () => {
  assert.strictEqual(usesAccomplishmentOverride({}), false);
  assert.strictEqual(
    usesAccomplishmentOverride({ actual_accomplishment_override: true }),
    true,
  );
});

test("resolveAccomplishmentLines ignores a stale snapshot when not overridden", () => {
  const lines = resolveAccomplishmentLines(reportedProject);

  assert.deepStrictEqual(lines, [
    "2 events conducted — 'Takbo Para kay Juana', 'test' with 3 participants (2 Female, 1 Male)",
  ]);
});

test("resolveAccomplishmentLines honours a manual override", () => {
  const lines = resolveAccomplishmentLines({
    ...reportedProject,
    actual_accomplishment_override: true,
    actual_accomplishment: ["Custom narrative written by the owner"],
  });

  assert.deepStrictEqual(lines, ["Custom narrative written by the owner"]);
});

test("resolveAccomplishmentLines falls back to stored text when there are no events", () => {
  const lines = resolveAccomplishmentLines({
    events: [],
    actual_accomplishment_override: false,
    actual_accomplishment: ["A legacy note"],
  });

  assert.deepStrictEqual(lines, ["A legacy note"]);
});

test("resolveAccomplishmentText joins multiple lines", () => {
  assert.strictEqual(
    resolveAccomplishmentText({
      actual_accomplishment_override: true,
      actual_accomplishment: ["line one", "line two"],
    }),
    "line one\nline two",
  );
});

// ─── withGeneratedAccomplishment / populate config ───────────────────

test("withGeneratedAccomplishment attaches the derived string", () => {
  const plain = withGeneratedAccomplishment(reportedProject);

  assert.strictEqual(
    plain.generated_accomplishment,
    "2 events conducted — 'Takbo Para kay Juana', 'test' with 3 participants (2 Female, 1 Male)",
  );
  // Original fields are preserved for existing consumers.
  assert.strictEqual(plain.actual_accomplishment_override, false);
});

test("withGeneratedAccomplishment works on documents exposing toObject()", () => {
  const doc = {
    toObject: () => ({ events: [{ title: "Doc", status: "active" }] }),
  };

  assert.strictEqual(
    withGeneratedAccomplishment(doc).generated_accomplishment,
    "1 event conducted — 'Doc' with 0 participants (0 Female, 0 Male)",
  );
});

test("PROJECT_EVENTS_POPULATE targets events, attendance and sex data", () => {
  assert.strictEqual(PROJECT_EVENTS_POPULATE.path, "events");
  assert.strictEqual(
    PROJECT_EVENTS_POPULATE.populate.path,
    "attended_users.user_id",
  );
  assert.strictEqual(
    PROJECT_EVENTS_POPULATE.populate.populate.path,
    "personal_info_id",
  );
  assert.ok(
    PROJECT_EVENTS_POPULATE.populate.populate.select.includes(
      "personal.currentStatus",
    ),
    "sector breakdown needs personal.currentStatus",
  );
});

// ─── shouldUseAccomplishmentOverride ────────────────────────────────

test("shouldUseAccomplishmentOverride follows the saved flag", () => {
  assert.strictEqual(
    shouldUseAccomplishmentOverride({
      actual_accomplishment_override: true,
      events: [{ title: "A", status: "active" }],
    }),
    true,
  );
  assert.strictEqual(
    shouldUseAccomplishmentOverride({
      actual_accomplishment_override: false,
      events: [{ title: "A", status: "active" }],
    }),
    false,
  );
});

test("shouldUseAccomplishmentOverride protects legacy text without events", () => {
  assert.strictEqual(
    shouldUseAccomplishmentOverride({
      events: [],
      actual_accomplishment: ["Legacy note"],
    }),
    true,
  );
  // Nothing stored and nothing generated → still auto mode.
  assert.strictEqual(shouldUseAccomplishmentOverride({ events: [] }), false);
  // Events exist → the file is derived, not an override.
  assert.strictEqual(
    shouldUseAccomplishmentOverride({
      events: [{ title: "A", status: "active" }],
      actual_accomplishment: ["Legacy note"],
    }),
    false,
  );
});

// ─── Participant breakdown (donut chart data) ───────────────────────

const breakdownProject = {
  events: [
    {
      title: "Event A",
      status: "completed",
      attended_users: [
        attended("Female", "Student"),
        attended("Female", "Employee"),
        attended("Male", "Student"),
      ],
    },
    {
      title: "Event B",
      status: "active",
      attended_users: [attended("Male", "Employee"), attended("")],
    },
    {
      title: "Cancelled event",
      status: "cancelled",
      attended_users: [attended("Female", "Student")],
    },
  ],
};

test("summarizeProjectEvents reports sex and sector totals", () => {
  const summary = summarizeProjectEvents(breakdownProject);

  assert.deepStrictEqual(summary.sex, { female: 2, male: 2, unspecified: 1 });
  assert.deepStrictEqual(summary.sector, {
    student: 2,
    employee: 2,
    unspecified: 1,
  });
  // Buckets always add up to the attendance total.
  assert.strictEqual(summary.totalAttended, 5);
  assert.strictEqual(
    summary.sex.female + summary.sex.male + summary.sex.unspecified,
    summary.totalAttended,
  );
  assert.strictEqual(
    summary.sector.student + summary.sector.employee + summary.sector.unspecified,
    summary.totalAttended,
  );
});

test("getParticipantBreakdown returns chart-ready rows and skips empty buckets", () => {
  const breakdown = getParticipantBreakdown(breakdownProject);

  assert.strictEqual(breakdown.totalAttended, 5);
  assert.strictEqual(breakdown.eventCount, 2);
  assert.deepStrictEqual(breakdown.bySex, [
    { name: "Female", value: 2 },
    { name: "Male", value: 2 },
    { name: "Unspecified", value: 1 },
  ]);
  assert.deepStrictEqual(breakdown.bySector, [
    { name: "Student", value: 2 },
    { name: "Employee", value: 2 },
    { name: "Unspecified", value: 1 },
  ]);
});

test("getParticipantBreakdown drops zero-value buckets for the donut", () => {
  const breakdown = getParticipantBreakdown({
    events: [
      {
        title: "Only students",
        status: "active",
        attended_users: [attended("Female", "Student")],
      },
    ],
  });

  assert.deepStrictEqual(breakdown.bySex, [{ name: "Female", value: 1 }]);
  assert.deepStrictEqual(breakdown.bySector, [{ name: "Student", value: 1 }]);
});

test("getParticipantBreakdown reports an empty breakdown without attendance", () => {
  const breakdown = getParticipantBreakdown({
    events: [{ title: "Upcoming", status: "active", attended_users: [] }],
  });

  assert.strictEqual(breakdown.totalAttended, 0);
  assert.deepStrictEqual(breakdown.bySex, []);
  assert.deepStrictEqual(breakdown.bySector, []);
});