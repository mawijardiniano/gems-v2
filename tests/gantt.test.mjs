import test from "node:test";
import assert from "node:assert/strict";
import {
  calcDurationDays,
  generateMilestonesFromGantt,
  isMilestonesOutdated,
  mergeMilestones,
  timelineLayout,
} from "../lib/gantt.js";
import {
  parseCsvTable,
  parseGanttTable,
  parseGanttActivities,
  GANTT_TEMPLATE_CSV,
} from "../lib/ganttParse.js";

test("calcDurationDays is inclusive and matches the design", () => {
  assert.equal(calcDurationDays("2025-01-06", "2025-01-31"), 26);
  assert.equal(calcDurationDays("2025-04-01", "2025-08-29"), 151);
  assert.equal(calcDurationDays("2025-11-03", "2025-12-19"), 47);
  assert.equal(calcDurationDays("2025-02-01", "2025-01-01"), 0);
  assert.equal(calcDurationDays("", "2025-01-01"), 0);
});

test("generateMilestonesFromGantt builds start, per-activity and final", () => {
  const out = generateMilestonesFromGantt([
    { activity: "Prep", start_date: "2025-01-06", end_date: "2025-01-31" },
    { activity: "Train", start_date: "2025-03-03", end_date: "2025-03-31" },
    { activity: "Report", start_date: "2025-11-03", end_date: "2025-12-19" },
    { activity: "", start_date: "2025-01-01", end_date: "2025-01-02" },
  ]);
  assert.deepEqual(
    out.map((m) => [m.title, m.target_date]),
    [
      ["Project Start-Up", "2025-01-06"],
      ["Train Completed", "2025-03-31"],
      ["Project Completed", "2025-12-19"],
    ],
  );
  assert.equal(out[0].source_activity, "Prep");
  assert.deepEqual(generateMilestonesFromGantt([]), []);
});

test("mergeMilestones keeps progress across rename, date shift and delete", () => {
  const acts = [
    { activity: "Prep", start_date: "2025-01-06", end_date: "2025-01-31" },
    { activity: "Train", start_date: "2025-03-03", end_date: "2025-03-31" },
    { activity: "Report", start_date: "2025-11-03", end_date: "2025-12-19" },
  ];
  const proofs = [{ key: "k1" }];
  const previous = generateMilestonesFromGantt(acts).map((m) =>
    m.title === "Train Completed"
      ? { ...m, status: "completed", actual_date: "2025-04-01", proofs }
      : m,
  );
  previous.push({ title: "Custom", source_activity: "", status: "pending", proofs: [] });

  // rename + date shift
  const renamed = acts.map((a) =>
    a.activity === "Train"
      ? { ...a, activity: "Training v2", end_date: "2025-04-05" }
      : a,
  );
  const r1 = mergeMilestones(generateMilestonesFromGantt(renamed), previous);
  const train = r1.milestones.find((m) => m.title === "Training v2 Completed");
  assert.equal(train.target_date, "2025-04-05");
  assert.equal(train.status, "completed");
  assert.deepEqual(train.proofs, proofs);
  assert.equal(r1.milestones.at(-1).title, "Custom");
  assert.equal(r1.removed.length, 0);

  // deleted activity is reported
  const r2 = mergeMilestones(
    generateMilestonesFromGantt([acts[0], acts[2]]),
    previous,
  );
  assert.equal(r2.removed.length, 1);
  assert.equal(r2.removed[0].title, "Train Completed");
});

test("isMilestonesOutdated detects Gantt drift", () => {
  const acts = [
    { activity: "A", start_date: "2025-01-01", end_date: "2025-01-05" },
    { activity: "B", start_date: "2025-02-01", end_date: "2025-02-05" },
  ];
  const rows = generateMilestonesFromGantt(acts);
  assert.equal(isMilestonesOutdated(acts, rows), false);
  const moved = [acts[0], { ...acts[1], end_date: "2025-02-09" }];
  assert.equal(isMilestonesOutdated(moved, rows), true);
  assert.equal(isMilestonesOutdated([], []), false);
});

test("template CSV round-trips through the parser", () => {
  const { rows, error } = parseGanttTable(parseCsvTable(GANTT_TEMPLATE_CSV));
  assert.equal(error, undefined);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].activity, "Project Preparation and Coordination");
  assert.equal(rows[1].end_date, "2025-03-31");
  assert.equal(rows[1].person_responsible, "Training Team");
});

test("parseGanttTable converts Excel serial dates and reports errors", () => {
  const ok = parseGanttTable([
    ["Activity", "Start", "End"],
    ["Task", 45663, 45688],
  ]);
  assert.equal(ok.rows[0].start_date, "2025-01-06");
  assert.equal(ok.rows[0].end_date, "2025-01-31");
  assert.ok(parseGanttTable([["a", "b"], ["c", "d"]]).error);
});

test("timelineLayout clamps to the year", () => {
  const [full, outside] = timelineLayout(
    [
      { start_date: "2025-01-01", end_date: "2025-12-31" },
      { start_date: "2024-01-01", end_date: "2024-02-01" },
    ],
    2025,
  );
  assert.equal(full.left, 0);
  assert.equal(Math.round(full.width), 100);
  assert.equal(outside, null);
});

test("parseGanttActivities validates input", () => {
  const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  assert.ok(parseGanttActivities("x", parseDate).error);
  assert.ok(
    parseGanttActivities(
      [{ activity: "A", start_date: "2025-02-01", end_date: "2025-01-01" }],
      parseDate,
    ).error,
  );
  const ok = parseGanttActivities(
    [{ activity: " A ", start_date: "2025-01-01", end_date: "2025-01-05" }],
    parseDate,
  );
  assert.equal(ok.activities[0].activity, "A");
});
