import test from "node:test";
import assert from "node:assert/strict";
import {
  activitySpan,
  activityYears,
  fmtGanttDate,
  ganttPdfFilename,
  ganttRows,
  pickGanttYear,
  resolveAutoTable,
  resolveProjectTitle,
} from "../lib/ganttPdf.js";
import { timelineLayout, timelineYears } from "../lib/gantt.js";

/*
 * GAD projects store the project name in `gad_activity` (there is no `title`),
 * which is why the chart used to download with "(untitled project)".
 */
test("resolveProjectTitle reads the GAD activity list", () => {
  assert.equal(
    resolveProjectTitle({
      gad_activity: { value: ["Conduct gender sensitivity orientations"] },
    }),
    "Conduct gender sensitivity orientations",
  );
  assert.equal(
    resolveProjectTitle({
      gad_activity: { value: ["First activity", " Second ", "", "Fourth"] },
    }),
    "First activity (+2 more)",
  );
});

test("resolveProjectTitle prefers a real title then falls back to name", () => {
  assert.equal(
    resolveProjectTitle({ title: "  Research Project  ", name: "ignored" }),
    "Research Project",
  );
  assert.equal(
    resolveProjectTitle({ title: { value: "Wrapped Title" } }),
    "Wrapped Title",
  );
  assert.equal(resolveProjectTitle({ name: "Named Only" }), "Named Only");
  assert.equal(resolveProjectTitle({}), "(untitled project)");
  assert.equal(resolveProjectTitle(null), "(untitled project)");
});

test("ganttPdfFilename sanitizes the reference number", () => {
  assert.equal(
    ganttPdfFilename({ reference_number: "GPB-2031-002" }, 2025),
    "Gantt-GPB-2031-002-2025.pdf",
  );
  /* A reference with characters a filesystem rejects must not leak through. */
  assert.equal(
    ganttPdfFilename({ reference_number: "GPB/2031:002" }, 2025),
    "Gantt-GPB-2031-002-2025.pdf",
  );
  assert.equal(
    ganttPdfFilename({ gad_activity: { value: ["Short Name"] } }, 2024),
    "Gantt-Short-Name-2024.pdf",
  );
  assert.equal(ganttPdfFilename({}, null), "Gantt-project-chart.pdf");
});

test("ganttRows keeps only named activities", () => {
  const rows = ganttRows({
    gantt_activities: [
      { activity: "Prep", start_date: "2025-01-06" },
      { activity: "   ", start_date: "2025-02-01" },
      null,
      { activity: "Train", start_date: "2025-03-03" },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].activity, "Prep");
  assert.equal(rows[1].activity, "Train");
  assert.deepEqual(ganttRows({}), []);
});

test("pickGanttYear and activitySpan agree with the on-screen chart", () => {
  const activities = [
    { activity: "A", start_date: "2025-03-10", end_date: "2025-05-15" },
    { activity: "B", start_date: "2025-01-06", end_date: "2025-02-28" },
  ];
  assert.equal(pickGanttYear({ year: "2024" }, activities), 2025);
  assert.deepEqual(activitySpan(activities), {
    start: "2025-01-06",
    end: "2025-05-15",
  });
  /* With no dates at all the project year decides the timeline year. */
  assert.equal(pickGanttYear({ year: "2024" }, []), 2024);
  assert.equal(activitySpan([]), null);
});

/*
 * The GPB-2031-002 chart: activity 2 runs Mar 2025 - Feb 2026. Before this the
 * bar was clipped at Dec 31 2025 and the 2026 tail vanished with no marker.
 */
test("timelineYears charts a project across every year it touches", () => {
  const crossYear = [
    { activity: "Prep", start_date: "2025-01-06", end_date: "2025-01-31" },
    { activity: "Train", start_date: "2025-03-03", end_date: "2026-02-28" },
  ];
  assert.deepEqual(timelineYears(crossYear, 2025), [2025, 2026]);

  /* A Q3 start running into next year must not lose its second block. */
  const q3 = [{ start_date: "2025-09-15", end_date: "2026-03-20" }];
  assert.deepEqual(timelineYears(q3, 2025), [2025, 2026]);

  /* Three calendar years in one project. */
  const long = [{ start_date: "2024-11-01", end_date: "2026-02-01" }];
  assert.deepEqual(timelineYears(long, 2024), [2024, 2025, 2026]);

  /* One year stays one block. */
  assert.deepEqual(
    timelineYears(
      [{ start_date: "2025-01-06", end_date: "2025-01-31" }],
      2025,
    ),
    [2025],
  );

  /* Undated rows still get the project year so an empty chart is drawn. */
  assert.deepEqual(timelineYears([], 2024), [2024]);
  assert.deepEqual(timelineYears([{ activity: "No dates" }], 2024), [2024]);
  /* A project year outside the span is still included, in order. */
  assert.deepEqual(
    timelineYears([{ start_date: "2025-05-01", end_date: "2025-06-01" }], 2024),
    [2024, 2025],
  );
});

test("activityYears spans the earliest start and latest end", () => {
  assert.deepEqual(
    activityYears([
      { start_date: "2025-03-10", end_date: "2026-02-28" },
      { start_date: "2025-01-06", end_date: "2025-02-28" },
    ]),
    { start: 2025, end: 2026 },
  );
  assert.equal(activityYears([]), null);
  assert.equal(activityYears([{ activity: "undated" }]), null);
});

test("timelineLayout flags a bar that spills past the year", () => {
  const rows = [
    { start_date: "2025-01-06", end_date: "2025-01-31" },
    { start_date: "2025-03-03", end_date: "2026-02-28" },
  ];

  const [done, continuing] = timelineLayout(rows, 2025);
  assert.equal(done.continuesBefore, false);
  assert.equal(done.continuesAfter, false);
  /* The 2026 tail is clamped, so the bar must say it continues. */
  assert.equal(continuing.continuesAfter, true);
  assert.equal(continuing.continuesBefore, false);
  assert.equal(Math.round(continuing.left + continuing.width), 100);

  const [tail] = timelineLayout(rows.slice(1), 2026);
  assert.equal(tail.continuesBefore, true);
  assert.equal(tail.continuesAfter, false);
  assert.equal(tail.left, 0);

  /* A row entirely outside the year keeps the null lane. */
  assert.equal(timelineLayout([rows[0]], 2026)[0], null);
});

test("fmtGanttDate formats ISO dates and blanks invalid ones", () => {
  assert.equal(fmtGanttDate("2025-01-06"), "Jan 6, 2025");
  assert.equal(fmtGanttDate(""), "-");
  assert.equal(fmtGanttDate("not a date"), "-");
});

test("resolveAutoTable finds the callable in every interop shape", () => {
  const fn = () => {};
  assert.equal(resolveAutoTable(fn), fn);
  assert.equal(resolveAutoTable({ default: fn }), fn);
  assert.equal(resolveAutoTable({ default: { default: fn } }), fn);
  assert.equal(resolveAutoTable({}), null);
  assert.equal(resolveAutoTable(null), null);
});
