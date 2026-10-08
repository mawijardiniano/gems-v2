import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStudentStats,
  filterStudentRecords,
} from "../app/(pages)/(event)/gender-statistics/components/studentStats.js";
import { SAMPLE_STUDENT_PROFILE_RECORDS as RECORDS } from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";

const YEARS = ["2022-2023", "2023-2024", "2024-2025"];

const statsFor = (year, extra = {}) =>
  computeStudentStats(
    filterStudentRecords(RECORDS, { schoolYear: year, ...extra }),
    RECORDS,
  );

test("per-year totals match byAcademicYear from the unfiltered stats", () => {
  const all = computeStudentStats(RECORDS, RECORDS);
  YEARS.forEach((year) => {
    const row = all.byAcademicYear.find((r) => r.school_year === year);
    const stats = statsFor(year);
    assert.equal(stats.totals.total, row.total);
    assert.equal(stats.totals.Female, row.Female);
    assert.equal(stats.totals.Male, row.Male);
  });
});

test("every breakdown of a year sums to that year's total", () => {
  YEARS.forEach((year) => {
    const stats = statsFor(year);
    const sum = (rows) => rows.reduce((n, r) => n + r.total, 0);
    assert.equal(sum(stats.byCollege), stats.totals.total);
    assert.equal(sum(stats.byLevel), stats.totals.total);
  });
});

test("other filters apply within each selected year", () => {
  const college = "College of Information and Computing Sciences";
  YEARS.forEach((year) => {
    const stats = statsFor(year, { college });
    assert.ok(stats.totals.total > 0);
    assert.ok(stats.totals.total < statsFor(year).totals.total);
    assert.equal(stats.byCollege.length, 1);
  });
});
