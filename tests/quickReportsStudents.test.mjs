import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STUDENT_QUICK_REPORT_OPTIONS,
  STUDENT_REPORT_KINDS,
  buildIntersectionTable,
  buildYearOverYearTable,
  equityRows,
  generateStudentQuickReport,
  studentReportFilename,
  studentReportMeta,
} from "../app/(pages)/(event)/gender-statistics/components/quickReportsStudents.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(
  readFileSync(
    path.join(
      here,
      "..",
      "app",
      "(pages)",
      "(event)",
      "gender-statistics",
      "data",
      "sample-students.json",
    ),
    "utf8",
  ),
);

// ─── Report registry ────────────────────────────────────────────────

test("STUDENT_QUICK_REPORT_OPTIONS: one PDF-labelled button per report", () => {
  assert.deepStrictEqual(
    STUDENT_QUICK_REPORT_OPTIONS.map((option) => option.kind),
    [
      STUDENT_REPORT_KINDS.STUDENT_PROFILE,
      STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM,
      STUDENT_REPORT_KINDS.GENDER_GAP,
      STUDENT_REPORT_KINDS.INTERSECTIONAL,
      STUDENT_REPORT_KINDS.MULTI_YEAR,
    ],
  );
  assert.strictEqual(STUDENT_QUICK_REPORT_OPTIONS.length, 5);
  STUDENT_QUICK_REPORT_OPTIONS.forEach((option) => {
    assert.match(option.label, /\(PDF\)$/);
    assert.strictEqual(option.title, studentReportMeta(option.kind).title);
  });
});

test("studentReportFilename: slugs the kind and flags sample data", () => {
  assert.match(
    studentReportFilename(STUDENT_REPORT_KINDS.INTERSECTIONAL, true),
    /^intersectional-analysis-students-sample-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  assert.match(
    studentReportFilename(STUDENT_REPORT_KINDS.MULTI_YEAR),
    /^comparative-multi-year-enrollment-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  assert.ok(
    !studentReportFilename(STUDENT_REPORT_KINDS.STUDENT_PROFILE).includes(
      "-sample-",
    ),
  );
});

// ─── Intersection table ─────────────────────────────────────────────

test("equityRows: prefers demographics, falls back to byStudentType", () => {
  const withDemo = equityRows(sample);
  assert.strictEqual(withDemo.nameKey, "label");
  assert.strictEqual(withDemo.items.length, 6);

  const fallback = equityRows({ byStudentType: sample.byStudentType });
  assert.strictEqual(fallback.nameKey, "type");
  assert.strictEqual(fallback.items.length, 6);

  assert.strictEqual(equityRows({}).nameKey, "type");
});

test("buildIntersectionTable: within-group share plus share of all women", () => {
  const { head, body } = buildIntersectionTable(
    sample.demographics,
    sample.totals,
    "label",
  );

  assert.deepStrictEqual(head, [
    "Group",
    "Female",
    "% Female in Group",
    "Male",
    "% Male in Group",
    "Gap (pp)",
    "% of All Female Students",
    "Interpretation",
  ]);

  const scholars = body.find((row) => row[0] === "Scholar");

// ─── Multi-year table ───────────────────────────────────────────────

test("buildYearOverYearTable: yearly rows, deltas and an average row", () => {
  const { head, body } = buildYearOverYearTable(sample.byAcademicYear);

  assert.strictEqual(head.length, 8);
  assert.strictEqual(head[6], "Change in Total");
  /* Four academic years plus the average summary row. */
  assert.strictEqual(body.length, 5);

  assert.deepStrictEqual(body[0].slice(0, 3), ["2021-2022", 378, 211]);
  /* The first year has nothing to compare against. */
  assert.strictEqual(body[0][6], "-");
  assert.strictEqual(body[0][7], "-");

  assert.deepStrictEqual(body[1].slice(0, 2), ["2022-2023", 853]);
  assert.strictEqual(body[1][6], "+772");
  assert.strictEqual(body[1][7], "+475");
  assert.strictEqual(body[1][5], "62.6%");

  const average = body[body.length - 1];
  assert.strictEqual(average[0], "Average per academic year");
  assert.strictEqual(average[1], 1198);
  assert.strictEqual(average[4], 1939);
  assert.strictEqual(average[5], "61.8%");
});

test("buildYearOverYearTable: sorts unsorted years and handles an empty list", () => {
  const shuffled = [...sample.byAcademicYear].reverse();
  const { body } = buildYearOverYearTable(shuffled);
  assert.strictEqual(body[0][0], "2021-2022");
  assert.strictEqual(body[3][0], "2024-2025");

  assert.deepStrictEqual(buildYearOverYearTable(undefined).body, []);
  assert.strictEqual(buildYearOverYearTable([{ total: 5 }]).body.length, 1);
});

// ─── PDF rendering ─────────────────────────────────────────────────

for (const kind of Object.values(STUDENT_REPORT_KINDS)) {
  test(`generateStudentQuickReport: renders a readable PDF for "${kind}"`, async () => {
    const doc = await generateStudentQuickReport(kind, sample, {
      isSample: true,
      filterSummary: "College: College of Education",
    });
    const buffer = Buffer.from(doc.output("arraybuffer"));

    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
    assert.ok(buffer.length > 2000, "PDF should not be empty");
    assert.ok(doc.getNumberOfPages() >= 1);
  });
}

test("generateStudentQuickReport: multi-year report survives an empty history", async () => {
  const doc = await generateStudentQuickReport(
    STUDENT_REPORT_KINDS.MULTI_YEAR,
    { totals: sample.totals, byAcademicYear: [] },
    { isSample: false },
  );

  assert.strictEqual(
    Buffer.from(doc.output("arraybuffer")).subarray(0, 4).toString(),
    "%PDF",
  );
});

test("generateStudentQuickReport: profile report survives an empty dataset", async () => {
  const doc = await generateStudentQuickReport(
    STUDENT_REPORT_KINDS.STUDENT_PROFILE,
    {},
    {},
  );

  assert.strictEqual(
    Buffer.from(doc.output("arraybuffer")).subarray(0, 4).toString(),
    "%PDF",
  );
});
  assert.strictEqual(scholars[1], 486);
  assert.strictEqual(scholars[2], "54.5%");
  assert.strictEqual(scholars[3], 402);
  /* 486 of the 2,097 female students are scholars. */
  assert.strictEqual(scholars[6], "23.2%");
  assert.strictEqual(scholars[7], "Female-leaning");

  const highs = body.find((row) => row[0] === "High Income");
  assert.strictEqual(highs[6], "14.6%");
});

test("buildIntersectionTable: tolerates a missing group list", () => {
  const { body } = buildIntersectionTable(undefined, {}, "college");
  assert.deepStrictEqual(body, []);
});