import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COLLEGE_GROWTH,
  SAMPLE_SCHOOL_YEARS,
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

  assert.strictEqual(first.length, 3425);
  assert.deepStrictEqual(first, second, "generator must be deterministic");

  const fields = ["id", "sex", "campus", "college", "course", "startYear"];
  first.forEach((record) => {
    fields.forEach((field) => {
      assert.ok(record[field], `${field} missing on ${record.id}`);
    });
    assert.ok(["Female", "Male"].includes(record.sex));
    assert.ok(
      ["Female", "Male", "LGBTQIA+"].includes(record.genderIdentity),
      `genderIdentity missing on ${record.id}`,
    );
    assert.strictEqual(typeof record.soloParent, "boolean");
    assert.ok(Array.isArray(record.terms) && record.terms.length >= 2);
  });
});

test("curated totals are preserved exactly", () => {
  const stats = computeStudentStats(SAMPLE_STUDENT_RECORDS);

  assert.deepStrictEqual(stats.totals, {
    Female: 2097,
    Male: 1328,
    total: 3425,
    pctFemale: 61.2,
    pctMale: 38.8,
    lgbtqia: 86,
    pctLgbtqia: 2.5,
  });

  assert.deepStrictEqual(
    stats.byLevel.map((row) => [row.level, row.total]),
    [
      ["Undergraduate", 3048],
      ["Graduate (Masters)", 310],
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
      ["1st Year", 910],
      ["2nd Year", 846],
      ["3rd Year", 743],
      ["4th Year", 549],
    ],
  );

  assert.deepStrictEqual(
    stats.byStudentType.map((row) => [row.type, row.total]),
    [
      ["Scholar", 888],
      ["Person with Disability (PWD)", 53],
      ["Indigenous Peoples (IP)", 43],
      ["Low Income", 1201],
      ["Middle Income", 1789],
      ["High Income", 435],
    ],
  );

  assert.deepStrictEqual(
    stats.byAcademicYear.map((row) => [row.school_year, row.total]),
    [
      ["2020-2021", 2900],
      ["2021-2022", 3055],
      ["2022-2023", 3185],
      ["2023-2024", 3315],
      ["2024-2025", 3425],
    ],
  );
});

test("every academic year is a complete snapshot of the population", () => {
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  SAMPLE_SCHOOL_YEARS.forEach((schoolYear) => {
    const enrolled = SAMPLE_STUDENT_RECORDS.filter((record) =>
      record.terms.some((term) => term.school_year === schoolYear),
    );

    /* 2020-2021 already holds 2,900 of the 3,425 students, and the newest year
       holds everybody. */
    assert.ok(
      enrolled.length >= 2900,
      `${schoolYear} holds a near-complete population`,
    );
    assert.strictEqual(
      new Set(enrolled.map((record) => record.college)).size,
      14,
      `${schoolYear} covers every college`,
    );
    yearLevels.forEach((yearLevel) => {
      assert.ok(
        enrolled.some((record) => record.yearLevel === yearLevel),
        `${schoolYear} has ${yearLevel} students`,
      );
    });
    assert.ok(
      enrolled.some((record) => record.college === "Graduate School"),
      `${schoolYear} has graduate students`,
    );
  });
});

test("colleges grow at their own pace across the sample years", () => {
  const headcount = (college, schoolYear) =>
    SAMPLE_STUDENT_RECORDS.filter(
      (record) =>
        record.college === college &&
        record.terms.some((term) => term.school_year === schoolYear),
    ).length;

  const yearTotal = (schoolYear) =>
    filterStudentRecords(SAMPLE_STUDENT_RECORDS, {
      ...EMPTY_STUDENT_FILTERS,
      schoolYear,
    }).length;

  /* Computing more than doubles its share of the population, agriculture
     slowly gives share up, so the college ranking changes between years. */
  assert.ok(
    headcount("College of Information and Computing Sciences", "2024-2025") /
      yearTotal("2024-2025") >
      headcount("College of Information and Computing Sciences", "2020-2021") /
        yearTotal("2020-2021"),
  );
  assert.ok(
    headcount("College of Agriculture", "2024-2025") / yearTotal("2024-2025") <
      headcount("College of Agriculture", "2020-2021") / yearTotal("2020-2021"),
  );

  /* Pinned counts, so a change in the growth profiles shows up as a failure. */
  assert.strictEqual(
    headcount("College of Information and Computing Sciences", "2020-2021"),
    101,
  );
  assert.strictEqual(
    headcount("College of Information and Computing Sciences", "2024-2025"),
    185,
  );
  assert.strictEqual(headcount("College of Agriculture", "2020-2021"), 314);
  assert.strictEqual(headcount("College of Agriculture", "2024-2025"), 335);

  /* Every growth profile belongs to a college that exists - a typo would
     silently flatten that college's trend. */
  Object.keys(COLLEGE_GROWTH).forEach((college) =>
    assert.ok(
      SAMPLE_STUDENT_RECORDS.some((record) => record.college === college),
      `${college} is not a sample college`,
    ),
  );
});

test("computeStudentStats: Solo Parent row and gender identity breakdown", () => {
  const stats = computeStudentStats(SAMPLE_STUDENT_RECORDS);

  /* Solo parents close the demographic table; the live API has no field for
     them yet, so this row is sample-only data. */
  const last = stats.demographics[stats.demographics.length - 1];
  assert.deepStrictEqual(last, {
    label: "Solo Parent",
    Female: 62,
    Male: 20,
    total: 82,
  });
  assert.strictEqual(stats.demographics.length, 7);

  /* Gender identity is Male / Female / LGBTQIA+ (no "Other" bucket). */
  assert.deepStrictEqual(stats.byGenderIdentity, [
    { name: "Male", value: 1296 },
    { name: "Female", value: 2043 },
    { name: "LGBTQIA+", value: 86 },
  ]);
  const identityTotal = stats.byGenderIdentity.reduce(
    (sum, row) => sum + row.value,
    0,
  );
  assert.strictEqual(identityTotal, stats.totals.total);
  assert.strictEqual(
    stats.totals.lgbtqia,
    stats.byGenderIdentity.find((row) => row.name === "LGBTQIA+").value,
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
  assert.deepStrictEqual(computed.byGenderIdentity, snapshot.byGenderIdentity);
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
  assert.strictEqual(engineering.length, 225);

  const campus = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    campus: "Boac",
  });
  assert.ok(campus.length > 1000 && campus.length < records.length / 2);

  const nursing = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    course: "Bachelor of Science in Nursing",
  });
  assert.strictEqual(nursing.length, 360);

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
    Scholar: 888,
    "Person with Disability (PWD)": 53,
    "Indigenous Peoples (IP)": 43,
    "Low Income": 1201,
    "Middle Income": 1789,
    "High Income": 435,
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
  assert.ok(subset.length < 225);
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

  /* 2020-2021 already carries 2,900 of the 3,425 students. */
  const firstYear = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2020-2021",
  });
  assert.strictEqual(firstYear.length, 2900);

  const currentYear = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2024-2025",
  });
  assert.strictEqual(currentYear.length, 3425);

  /* Every enrolled student carries both semesters, so a semester filter alone
     never narrows the academic year it belongs to. */
  const secondSemester = filterStudentRecords(records, {
    ...EMPTY_STUDENT_FILTERS,
    schoolYear: "2022-2023",
    semester: "1st",
  });
  assert.strictEqual(secondSemester.length, 3185);
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
    "2020-2021",
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
    3425,
  );
});