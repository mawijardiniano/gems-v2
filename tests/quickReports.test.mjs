import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MIN_GROUP_FOR_FINDINGS,
  QUICK_REPORT_OPTIONS,
  REPORT_KINDS,
  buildGapEntries,
  buildGapFindings,
  buildSexSummaryTable,
  buildSexTable,
  gapTableFromEntries,
  generateQuickReport,
  interpretGap,
  quickReportFilename,
  quickReportMeta,
} from "../app/(pages)/(event)/gender-statistics/components/quickReports.js";

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
      "sample-employees.json",
    ),
    "utf8",
  ),
);

// ─── buildSexTable / buildSexSummaryTable ────────────────────────────

test("buildSexTable: one row per category plus a computed Total row", () => {
  const { head, body } = buildSexTable(
    sample.byCategory,
    "category",
    "Personnel Category",
  );

  assert.deepStrictEqual(head, [
    "Personnel Category",
    "Female",
    "Male",
    "Other",
    "Total",
    "% Female",
  ]);
  assert.strictEqual(body.length, sample.byCategory.length + 1);
  assert.strictEqual(body[0][0], "Faculty");
  assert.strictEqual(body[0][1], 230);

  const total = body[body.length - 1];
  assert.strictEqual(total[0], "Total");
  assert.strictEqual(total[1], 230 + 357 + 25);
  assert.strictEqual(total[2], 184 + 210 + 10);
  assert.strictEqual(total[4], 419 + 571 + 36);
});

test("buildSexTable: tolerates missing breakdowns without throwing", () => {
  const { body } = buildSexTable(undefined, "level", "Position Level");
  assert.deepStrictEqual(body, []);
});

test("buildSexSummaryTable: reads the pre-computed percentages off totals", () => {
  const { body } = buildSexSummaryTable(sample.totals);
  assert.deepStrictEqual(body[0], ["Female", 612, "59.6%"]);
  assert.deepStrictEqual(body[1], ["Male", 404, "39.4%"]);
  assert.deepStrictEqual(body[2], ["Non-binary / Other", 10, "1%"]);
  assert.deepStrictEqual(body[3], ["Total", 1026, "100%"]);
});

test("buildSexSummaryTable: recomputes percentages when totals omit them", () => {
  const { body } = buildSexSummaryTable({
    Female: 3,
    Male: 1,
    Other: 0,
    total: 4,
  });
  assert.deepStrictEqual(body[0], ["Female", 3, "75%"]);
  assert.deepStrictEqual(body[1], ["Male", 1, "25%"]);
  assert.deepStrictEqual(body[2], ["Non-binary / Other", 0, "0%"]);
});

// ─── Gender gap entries ──────────────────────────────────────────────

test("buildGapEntries: computes % female/male, gap in pp and interpretation", () => {
  const entries = buildGapEntries(sample.byCategory, "category");
  const faculty = entries.find((e) => e.label === "Faculty");
  const admin = entries.find((e) => e.label === "Administrative Staff");

  assert.strictEqual(faculty.total, 419);
  assert.strictEqual(faculty.pctFemale, 54.9);
  assert.strictEqual(faculty.pctMale, 43.9);
  assert.strictEqual(faculty.gapPp, 11);
  assert.strictEqual(faculty.interpretation, "Female-leaning");

  assert.strictEqual(admin.pctFemale, 62.5);
  assert.strictEqual(admin.gapPp, 25.7);
  assert.strictEqual(admin.interpretation, "Female-dominated");
});

test("buildGapEntries: position levels keep the source order", () => {
  const entries = buildGapEntries(sample.byPositionLevel, "level");
  assert.strictEqual(entries[0].label, "University President");
  assert.strictEqual(
    entries[entries.length - 1].label,
    "Job Order/Contractual",
  );
});

test("interpretGap: parity, leaning and dominated bands", () => {
  assert.strictEqual(interpretGap(4.9, 100), "Near parity");
  assert.strictEqual(interpretGap(-5, 100), "Near parity");
  assert.strictEqual(interpretGap(5.1, 100), "Female-leaning");
  assert.strictEqual(interpretGap(-20, 100), "Male-leaning");
  assert.strictEqual(interpretGap(20.1, 100), "Female-dominated");
  assert.strictEqual(interpretGap(-50, 100), "Male-dominated");
  assert.strictEqual(interpretGap(0, 0), "No data");
});

test("gapTableFromEntries: produces a seven-column gap table", () => {
  const entries = buildGapEntries(sample.byCategory, "category");
  const { head, body } = gapTableFromEntries(entries, "Personnel Category");
  assert.strictEqual(head.length, 7);
  assert.strictEqual(head[5], "Gap (pp)");
  assert.strictEqual(body.length, entries.length);
  assert.strictEqual(body[0][5], "+11 pp");
});

// ── Key findings ────────────────────────────────────────────────────

test("buildGapFindings: summarises overall share, widest gap and faculty vs admin", () => {
  const categories = buildGapEntries(sample.byCategory, "category");
  const findings = buildGapFindings(categories, {
    overallPctFemale: sample.totals.pctFemale,
    overallTotal: sample.totals.total,
    scopeLabel: "the sample dataset",
    categories,
  });

  assert.ok(findings.length >= 5);
  assert.match(findings[0], /59\.6% of the 1,026 personnel/);
  assert.ok(findings.some((line) => /Widest gap/.test(line)));
  assert.ok(
    findings.some((line) =>
      /Faculty \(.*\) are .* administrative personnel/.test(line),
    ),
  );
});

test("buildGapFindings: falls back to a message when there is no data", () => {
  const findings = buildGapFindings([], {});
  assert.strictEqual(findings.length, 1);
  assert.match(findings[0], /No breakdown data/);
});

test("buildGapFindings: ignores groups smaller than the findings threshold", () => {
  const entries = [
    {
      label: "Tiny",
      Female: 1,
      Male: 0,
      Other: 0,
      total: 1,
      pctFemale: 100,
      pctMale: 0,
      gapPp: 100,
      interpretation: "Female-dominated",
    },
    {
      label: "Solid",
      Female: 30,
      Male: 20,
      Other: 0,
      total: 50,
      pctFemale: 60,
      pctMale: 40,
      gapPp: 20,
      interpretation: "Female-leaning",
    },
  ];
  const findings = buildGapFindings(entries, {
    overallPctFemale: 61,
    overallTotal: 51,
  });

  assert.ok(findings.some((line) => /Widest gap: Solid/.test(line)));
  assert.ok(!findings.some((line) => /Tiny/.test(line)));
  assert.ok(
    findings.some((line) =>
      new RegExp(`1 groups with ${MIN_GROUP_FOR_FINDINGS}\\+`).test(line),
    ),
  );
});

// ─── PDF rendering ──────────────────────────────────────────────────

test("quickReportFilename: slugs the kind and flags sample data", () => {
  const name = quickReportFilename(REPORT_KINDS.GENDER_GAP, true);
  assert.match(
    name,
    /^gender-gap-analysis-faculty-personnel-sample-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  assert.ok(
    !quickReportFilename(REPORT_KINDS.POSITION_LEVEL).includes("-sample-"),
  );
});

test("QUICK_REPORT_OPTIONS: one PDF-labelled button per report kind", () => {
  assert.deepStrictEqual(
    QUICK_REPORT_OPTIONS.map((option) => option.kind),
    [REPORT_KINDS.PROFILES, REPORT_KINDS.POSITION_LEVEL, REPORT_KINDS.GENDER_GAP],
  );
  QUICK_REPORT_OPTIONS.forEach((option) => {
    assert.match(option.label, /\(PDF\)$/);
    assert.strictEqual(option.title, quickReportMeta(option.kind).title);
  });
});

for (const kind of Object.values(REPORT_KINDS)) {
  test(`generateQuickReport: renders a readable PDF for "${kind}"`, async () => {
    const doc = await generateQuickReport(kind, sample, { isSample: true });
    const buffer = Buffer.from(doc.output("arraybuffer"));

    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
    assert.ok(buffer.length > 2000, "PDF should not be empty");
    assert.ok(doc.getNumberOfPages() >= 1);
  });
}

