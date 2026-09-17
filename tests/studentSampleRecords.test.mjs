import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSampleStudentRecords,
  SAMPLE_STUDENT_RECORDS,
} from "../app/(pages)/(event)/gender-statistics/components/studentSampleRecords.js";
import {
  EMPTY_STUDENT_FILTERS,
  activeFilterCount,
  computeStudentStats,
  filterStudentRecords,
  studentLevelOf,
} from "../app/(pages)/(event)/gender-statistics/components/studentStats.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(
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

test("buildSampleStudentRecords: deterministic and complete", () => {
  const first = buildSampleStudentRecords();
  const second = buildSampleStudentRecords();

  assert.strictEqual(first.length, 3439);
  assert.deepStrictEqual(first, second, "generator must be deterministic");

  const fields = ["id", "sex", "campus", "college", "course", "startYear"];
  first.forEach((record) => {
    fields.forEach((field) => {
      assert.ok(record[field], `${field} missing on ${record.id}`);
    });
    assert.ok(["Female", "Male", "Other"].includes(record.sex));
    assert.ok(Array.isArray(record.terms) && record.terms.length >= 2);
  });
});

test("curated totals are preserved exactly", () => {
  const stats = computeStudentStats(SAMPLE_STUDENT_RECORDS);

  assert.deepStrictEqual(stats.totals, {
    Female: 2097,
    Male: 1328,
    Other: 14,
    total: 3439,
    pctFemale: 61,
    pctMale: 38.6,
    pctOther: 0.4,
  });

  assert.deepStrictEqual(
    stats.byLevel.map((row) => [row.level, row.total]),
    [
      ["Undergraduate", 3060],
      ["Graduate (Masters)", 312],
      ["Graduate (Doctoral)", 67],
    ],
  );

  assert.strictEqual(stats.byCollege.length, 14);
  assert.strictEqual(stats.byProgram.length, 10);
  assert.strictEqual(
    stats.byCollege.reduce((sum, row) => sum + row.total, 0),
    stats.totals.total,
  );

  assert.deepStrictEqual(
    stats.byYearLevel.map((row) => [row.year_level, row.total]),
    [
      ["1st Year", 914],
      ["2nd Year", 850],
      ["3rd Year", 745],
      ["4th Year", 551],
    ],
  );

  assert.deepStrictEqual(
    stats.byStudentType.map((row) => [row.type, row.total]),
    [
      ["Scholar", 892],
      ["Person with Disability (PWD)", 53],
      ["Indigenous Peoples (IP)", 43],
      ["Low Income", 1204],
      ["Middle Income", 1798],
      ["High Income", 437],
    ],
  );

  assert.deepStrictEqual(
    stats.byAcademicYear.map((row) => [row.school_year, row.total]),
    [
      ["2021-2022", 591],
      ["2022-2023", 1363],
      ["2023-2024", 2363],
      ["2024-2025", 3439],
    ],
  );
});

test("year levels stop at 4th year and are undergraduate-only", () => {
  assert.deepStrictEqual(snapshot.yearLevels, [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
  ]);
  assert.ok(!JSON.stringify(snapshot).includes("5th Year"));
  assert.ok(!JSON.stringify(snapshot).includes("6th Year"));

  const undergraduate = snapshot.byLevel.find(
    (row) => row.level === "Undergraduate",
  );
  assert.strictEqual(
    snapshot.byYearLevel.reduce((sum, row) => sum + row.total, 0),
    undergraduate.total,
  );
});

test("computeStudentStats matches the committed snapshot", () => {
  const computed = computeStudentStats(SAMPLE_STUDENT_RECORDS);
  assert.deepStrictEqual(computed.totals, snapshot.totals);
  assert.deepStrictEqual(computed.byCollege, snapshot.byCollege);
  assert.deepStrictEqual(computed.byLevel, snapshot.byLevel);
  assert.deepStrictEqual(computed.byYearLevel, snapshot.byYearLevel);
  assert.deepStrictEqual(computed.byStudentType, snapshot.byStudentType);
  assert.deepStrictEqual(computed.byAcademicYear, snapshot.byAcademicYear);
  assert.deepStrictEqual(computed.demographics, snapshot.demographics);
});
// --- Filtering -------------------------------------------------------

test("studentLevelOf: doctoral and masters are split from undergraduate", () => {
  assert.strictEqual(
    studentLevelOf({ college: "Graduate School", course: "Doctor of Education" }),
    "Graduate (Doctoral)",
  );
  assert.strictEqual(
    studentLevelOf({
      college: "Graduate School",
      course: "Master of Arts in Education",
    }),
    "Graduate (Masters)",
  );
  assert.strictEqual(
    studentLevelOf({
      college: "College of Education",
      course: "Bachelor of Elementary Education",
    }),
    "Undergraduate",
  );
});

test("filterStudentRecords: each dimension narrows the dataset", () => {
  const records = SAMPLE_STUDENT_RECORDS;

  const engineering = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    college: "College of Engineering",
  });
  assert.strictEqual(engineering.length, 226);

  const campus = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    campus: "Boac",
  });
  assert.ok(campus.length > 1000 && campus.length < records.length / 2);

  const nursing = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    course: "Bachelor of Science in Nursing",
  });
  assert.strictEqual(nursing.length, 362);

  const doctoral = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    course: "Doctor of Education",
  });
  assert.strictEqual(doctoral.length, 67);
  assert.strictEqual(
    computeStudentStats(doctoral).byLevel[0].level,
    "Graduate (Doctoral)",
  );
});

test("filterStudentRecords: student type matches the demographic rows", () => {
  const records = SAMPLE_STUDENT_RECORDS;
  const expected = {
    Scholar: 892,
    "Person with Disability (PWD)": 53,
    "Indigenous Peoples (IP)": 43,
    "Low Income": 1204,
    "Middle Income": 1798,
    "High Income": 437,
  };

  Object.entries(expected).forEach(([studentType, count]) => {
    const subset = filterStudentRecords(records, {
      ...EMPTY_STUDENT_FILTERS,
      studentType,
    });
    assert.strictEqual(subset.length, count, `${studentType} count`);
  });
});

test("filterStudentRecords: filters compose and subsets re-sum", () => {
  const subset = filterStudentRecords(SAMPLE_STUDENT_RECORDS, {
    ...EMPTY_STUDENT_FILTERS,
    college: "College of Engineering",
    yearLevel: "2nd Year",
    studentType: "Scholar",
  });

  assert.ok(subset.length > 0);
  assert.ok(subset.length < 226);
  subset.forEach((record) => {
    assert.strictEqual(record.college, "College of Engineering");
    assert.strictEqual(record.yearLevel, "2nd Year");
    assert.strictEqual(record.scholar, true);
  });

  const stats = computeStudentStats(subset);
  assert.strictEqual(stats.totals.total, subset.length);
  assert.deepStrictEqual(stats.byLevel.map((row) => row.level), [
    "Undergraduate",
  ]);
  assert.strictEqual(stats.byCollege.length, 1);
});

test("filterStudentRecords: academic year narrows through the term history", () => {
  const records = SAMPLE_STUDENT_RECORDS;

  const firstYear = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2021-2022",
  });
  assert.strictEqual(firstYear.length, 591);

  const currentYear = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2024-2025",
  });
  assert.strictEqual(currentYear.length, 3439);

  const secondSemester = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2022-2023",
    semester: "1st",
  });
  assert.strictEqual(secondSemester.length, firstYear.length + 772);
});

test("filterStudentRecords: impossible combinations return an empty dataset", () => {
  const subset = filterStudentRecords(SAMPLE_STUDENT_RECORDS, {
    ...EMPTY_STUDENT_FILTERS,
    college: "College of Engineering",
    course: "Doctor of Education",
  });

  assert.strictEqual(subset.length, 0);
  assert.strictEqual(computeStudentStats(subset).totals.total, 0);
});

test("filterStudentRecords: no filters returns the full dataset", () => {
  const all = filterStudentRecords(SAMPLE_STUDENT_RECORDS, EMPTY_STUDENT_FILTERS);

  assert.strictEqual(all.length, SAMPLE_STUDENT_RECORDS.length);
  assert.strictEqual(activeFilterCount(EMPTY_STUDENT_FILTERS), 0);
  assert.strictEqual(activeFilterCount({ ...EMPTY_STUDENT_FILTERS, campus: "Boac" }), 1);
});

test("option lists survive a filter that matches no records", () => {
  /* A live database can pin an academic year the sample dataset does not have
     (for example 2026-2027). The page must still be able to offer the years it
     does have, otherwise the year can never be corrected and the sample view
     stays empty. */
  const empty = filterStudentRecords(SAMPLE_STUDENT_RECORDS, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2026-2027",
    semester: "1st",
  });
  assert.strictEqual(empty.length, 0);

  const stats = computeStudentStats(empty, SAMPLE_STUDENT_RECORDS);
  assert.strictEqual(stats.totals.total, 0);
  assert.deepStrictEqual(stats.schoolYears, [
    "2024-2025",
    "2023-2024",
    "2022-2023",
    "2021-2022",
  ]);
  assert.deepStrictEqual(stats.semesters, ["1st", "2nd"]);
  assert.deepStrictEqual(stats.yearLevels, [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
  ]);
  assert.strictEqual(stats.studentTypes.length, 6);
  assert.strictEqual(stats.byAcademicYear.length, 0);

  /* Re-pinning the newest year the dataset actually has restores the data. */
  const recovered = filterStudentRecords(SAMPLE_STUDENT_RECORDS, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: stats.schoolYears[0],
    semester: "1st",
  });
  assert.strictEqual(recovered.length, SAMPLE_STUDENT_RECORDS.length);
  assert.strictEqual(
    computeStudentStats(recovered, SAMPLE_STUDENT_RECORDS).totals.total,
    3439,
  );
});