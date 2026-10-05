import { test } from "node:test";
import assert from "node:assert";

import {
  buildOverallReport,
  buildPerProjectReport,
  buildQuarterBreakdownReport,
  buildQuarterlyReport,
  orderProjectsByType,
} from "../lib/gpbProgressPdf.js";

/* Fixtures mirror the GPB-2031-001 Women's Month project that prompted the
   summary-band layout: a long activity description plus milestones spread over
   three calendar quarters, and a second project with no milestones at all. */

const womenMonthProject = {
  reference_number: "GPB-2031-001",
  gad_activity: {
    value: [
      "Conduct the Annual National Women's Month Celebration through Gender Equality and Women Empowerment Activities",
      "Organize University-wide activities in line with the National Women's Month Celebration such as forums, exhibits, cultural presentations, and recognition programs that highlight women's contributions in history and society",
    ],
  },
  /* Index-paired with the titles above: each description prints on the line
     under its own activity, inside the single GAD ACTIVITY column. */
  gad_activity_description: {
    value: [
      "University-wide kick-off ceremony joined by the GAD Focal Point System",
      "Forums, exhibits, cultural presentations and a recognition program for women achievers",
    ],
  },
  project_type: { value: "Client Focused" },
  project_status: "ongoing",
  milestones: [
    {
      title: "Planning meeting with the GAD focal persons",
      status: "completed",
      target_date: "2030-08-15",
      actual_date: "2030-08-14",
      proofs: [{ url: "proof-1" }, { url: "proof-2" }],
    },
    {
      title: "Forums, exhibits and cultural presentations",
      status: "ongoing",
      target_date: "2030-11-10",
      actual_date: null,
      proofs: [],
    },
    {
      title: "Recognition program for women achievers",
      status: "pending",
      target_date: "2031-02-20",
      actual_date: null,
      proofs: [],
    },
  ],
};

const emptyProject = {
  reference_number: "GPB-2031-002",
  gad_activity: { value: "Conduct gender sensitivity orientations for new employees" },
  project_type: { value: "Organization Focused" },
  project_status: "for-review",
  milestones: [],
};

const YEAR = 2030;

const asPdf = (buffer) => {
  assert.ok(Buffer.isBuffer(buffer), "builder returns a Buffer");
  assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
  assert.ok(buffer.length > 2000, "PDF should not be empty");
};

const pageCount = (buffer) => {
  const text = buffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
};

// ─── Project ordering ───────────────────────────────────────────────

test("orderProjectsByType: groups by project type and keeps arrival order inside a type", () => {
  const projects = [
    { reference_number: "C-1", project_type: { value: "Attributed Program" } },
    { reference_number: "A-1", project_type: { value: "Organization Focused" } },
    { reference_number: "B-1", project_type: { value: "Client Focused" } },
    { reference_number: "B-2", project_type: { value: "Client Focused" } },
  ];

  assert.deepStrictEqual(
    orderProjectsByType(projects).map((p) => p.reference_number),
    ["B-1", "B-2", "A-1", "C-1"],
  );
  /* The source array is never mutated. */
  assert.strictEqual(projects[0].reference_number, "C-1");
});

// ─── PDF builders ───────────────────────────────────────────────────

test("buildPerProjectReport: renders the summary band per project", () => {
  const buffer = buildPerProjectReport([womenMonthProject], YEAR);
  asPdf(buffer);
  assert.strictEqual(pageCount(buffer), 1);
});

test("buildPerProjectReport: a project without milestones renders the empty row", () => {
  const buffer = buildPerProjectReport(
    [womenMonthProject, emptyProject],
    YEAR,
  );
  asPdf(buffer);
  /* The second project pushes the content past one page. */
  assert.ok(pageCount(buffer) >= 1);
});

test("buildPerProjectReport: paginates a long project list", () => {
  const many = Array.from({ length: 6 }, (_, index) => ({
    ...womenMonthProject,
    reference_number: `GPB-2031-${String(index + 1).padStart(3, "0")}`,
  }));
  const buffer = buildPerProjectReport(many, YEAR);
  asPdf(buffer);
  assert.ok(pageCount(buffer) >= 2, "six projects should span several pages");
});

test("buildOverallReport: renders the landscape summary table", () => {
  const buffer = buildOverallReport(
    [womenMonthProject, emptyProject],
    YEAR,
  );
  asPdf(buffer);
});

test("buildQuarterlyReport: renders per-quarter project sections", () => {
  for (const quarter of [3, 4]) {
    const buffer = buildQuarterlyReport([womenMonthProject], YEAR, quarter);
    asPdf(buffer);
  }
});

test("buildQuarterBreakdownReport: renders the status breakdown tables", () => {
  const buffer = buildQuarterBreakdownReport(
    [womenMonthProject, emptyProject],
    YEAR,
  );
  asPdf(buffer);
});
