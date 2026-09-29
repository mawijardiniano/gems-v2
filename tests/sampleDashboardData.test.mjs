import { test } from "node:test";
import assert from "node:assert";

import {
  buildSampleDashboardData,
  sampleDashboardFilterOptions,
  SAMPLE_DASHBOARD_POPULATION,
  SAMPLE_DASHBOARD_SCHOOL_YEARS,
  SAMPLE_SEMESTERS,
} from "../app/(pages)/(event)/gender-statistics/components/sampleDashboardData.js";
import {
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_RECORDS,
} from "../app/(pages)/(event)/gender-statistics/components/studentSampleRecords.js";
import { SAMPLE_EMPLOYEE_RECORDS } from "../app/(pages)/(event)/gender-statistics/components/employeeSampleRecords.js";
import {
  APPOINTMENT_ORDER,
  CATEGORY_ORDER,
} from "../app/(pages)/(event)/gender-statistics/components/employeeStats.js";

const sum = (rows) => rows.reduce((total, row) => total + row.value, 0);

test("buildSampleDashboardData: mirrors the dashboard API response shape", () => {
  const data = buildSampleDashboardData();

  assert.deepStrictEqual(Object.keys(data).sort(), [
    "courseKeys",
    "demographics",
    "employeeGenderPanel",
    "genderPanel",
    "snapshot",
    "studentProgramData",
    "studentYearCourseData",
    "studentYearGenderData",
  ]);
  assert.deepStrictEqual(Object.keys(data.demographics).sort(), [
    "ageData",
    "appointmentData",
    "civilData",
    "employeeOfficeData",
    "employmentData",
    "religionData",
    "studentCampusData",
    "studentCollegeData",
    "studentYearLevelData",
  ]);
  assert.deepStrictEqual(Object.keys(data.snapshot).sort(), [
    "femaleCount",
    "ipCount",
    "maleCount",
    "pwdCount",
    "total",
  ]);
});

test("buildSampleDashboardData: unfiltered totals match the curated dataset", () => {
  const data = buildSampleDashboardData();

  /* 3,425 students + 1,016 employees; the flags are the curated per-sex sums. */
  assert.strictEqual(data.snapshot.total, 4441);
  assert.strictEqual(data.snapshot.femaleCount, 2709);
  assert.strictEqual(data.snapshot.maleCount, 1732);
  assert.strictEqual(data.snapshot.pwdCount, 75);
  assert.strictEqual(data.snapshot.ipCount, 95);

  assert.deepStrictEqual(data.genderPanel.genderData, [
    { name: "Female", value: 2709 },
    { name: "Male", value: 1732 },
  ]);
  /* 86 students + 30 employees carry the LGBTQIA+ identity (the rest keep
     their own sex as preference), and every sample record states a preference,
     so no "Not specified" row appears. */
  assert.deepStrictEqual(data.genderPanel.preferenceData, [
    { name: "Male", value: 1688 },
    { name: "Female", value: 2637 },
    { name: "LGBTQIA+", value: 116 },
  ]);

  assert.deepStrictEqual(data.employeeGenderPanel.genderData, [
    { name: "Female", value: 612 },
    { name: "Male", value: 404 },
  ]);
});

test("buildSampleDashboardData: college scopes students and employees", () => {
  const engineering = buildSampleDashboardData({
    college: "College of Engineering",
  });

  /* 225 students across the five engineering programs + 44 employees. */
  assert.strictEqual(engineering.snapshot.total, 269);
  assert.strictEqual(sum(engineering.studentProgramData), 225);
  assert.deepStrictEqual(engineering.demographics.employeeOfficeData, [
    { name: "College of Engineering", Male: 30, Female: 14, Other: 0 },
  ]);

  /* An office that hosts no students still scopes the employee panels. */
  const gad = buildSampleDashboardData({ college: "GAD Unit" });
  assert.strictEqual(gad.snapshot.total, 11);
  assert.deepStrictEqual(gad.studentProgramData, []);
  assert.strictEqual(sum(gad.employeeGenderPanel.genderData), 11);
});

test("buildSampleDashboardData: school year uses terms and appointment years", () => {
  /* 2,900 students were on the rolls by 2020-2021 and 757 employees (per the
     curated start-year targets); the newest year holds everybody. */
  const oldest = buildSampleDashboardData({ school_year: "2020-2021" });
  assert.strictEqual(oldest.snapshot.total, 3657);
  assert.strictEqual(
    buildSampleDashboardData({
      school_year: "2020-2021",
      person_type: "Student",
    }).snapshot.total,
    2900,
  );
  assert.strictEqual(
    buildSampleDashboardData({
      school_year: "2020-2021",
      person_type: "Employee",
    }).snapshot.total,
    757,
  );

  const newest = buildSampleDashboardData({ school_year: "2024-2025" });
  assert.strictEqual(newest.snapshot.total, 4441);
});

test("buildSampleDashboardData: a semester narrows students, not employees", () => {
  const expectedStudents = SAMPLE_STUDENT_RECORDS.filter((record) =>
    (record.terms || []).some(
      (term) =>
        term.school_year === "2020-2021" && term.semester === "Summer",
    ),
  ).length;

  const summer = buildSampleDashboardData({
    school_year: "2020-2021",
    semester: "Summer",
  });
  assert.strictEqual(summer.snapshot.total, expectedStudents + 757);
});

test("buildSampleDashboardData: sex, person type, year level and status filters", () => {
  assert.strictEqual(buildSampleDashboardData({ sex: "Female" }).snapshot.total, 2709);
  assert.strictEqual(
    buildSampleDashboardData({ person_type: "Student" }).snapshot.total,
    3425,
  );
  /* The curated year-level targets: 532 + 378 first-year students, and the
     year level excludes employees (they have no academic level). */
  assert.strictEqual(
    buildSampleDashboardData({ year_level: "1st Year" }).snapshot.total,
    910,
  );

  const faculty = buildSampleDashboardData({ employment: "Faculty" });
  assert.strictEqual(faculty.snapshot.total, 414);
  assert.deepStrictEqual(faculty.studentProgramData, []);
  assert.deepStrictEqual(faculty.demographics.employmentData, [
    { name: "Faculty", Male: 184, Female: 230, Other: 0 },
  ]);

  assert.strictEqual(
    buildSampleDashboardData({ appointment: "Regular" }).snapshot.total,
    494,
  );
});

test("buildSampleDashboardData: demographics add up to the filtered population", () => {
  const filters = { school_year: "2021-2022" };
  const data = buildSampleDashboardData(filters);
  const filteredCount = SAMPLE_STUDENT_RECORDS.filter((record) =>
    (record.terms || []).some((term) => term.school_year === "2021-2022"),
  ).length +
    SAMPLE_EMPLOYEE_RECORDS.filter((record) =>
      (record.years || []).includes("2021-2022"),
    ).length;

  assert.strictEqual(data.snapshot.total, filteredCount);
  assert.strictEqual(sum(data.demographics.ageData), filteredCount);
  assert.strictEqual(sum(data.demographics.civilData), filteredCount);
  assert.strictEqual(sum(data.demographics.religionData), filteredCount);

  /* Age buckets are the API's decade labels, sorted oldest first. */
  const labels = data.demographics.ageData.map((row) => row.name);
  labels.forEach((label) => assert.match(label, /^\d+–\d+$/));
  const starts = labels.map((label) => parseInt(label, 10));
  assert.deepStrictEqual(starts, [...starts].sort((a, b) => a - b));

  /* Employment / appointment / office rows are sex-disaggregated groups whose
     totals equal the filtered employee count. */
  const employeeCount = SAMPLE_EMPLOYEE_RECORDS.filter((record) =>
    (record.years || []).includes("2021-2022"),
  ).length;
  const groupTotal = (row) => row.Male + row.Female + row.Other;
  assert.strictEqual(
    data.demographics.employmentData.reduce((t, row) => t + groupTotal(row), 0),
    employeeCount,
  );
  assert.strictEqual(
    data.demographics.appointmentData.reduce((t, row) => t + groupTotal(row), 0),
    employeeCount,
  );
  assert.strictEqual(
    data.demographics.employeeOfficeData.reduce((t, row) => t + groupTotal(row), 0),
    employeeCount,
  );
});

test("buildSampleDashboardData: student tables keep API ordering and coverage", () => {
  const data = buildSampleDashboardData();

  assert.deepStrictEqual(
    data.demographics.studentYearLevelData.map((row) => row.name),
    ["1st Year", "2nd Year", "3rd Year", "4th Year", "Unknown"],
  );
  assert.deepStrictEqual(
    data.studentYearGenderData.map((row) => row.label),
    ["1st Year", "2nd Year", "3rd Year", "4th Year", "Unknown"],
  );
  assert.strictEqual(sum(data.studentProgramData), 3425);
  assert.strictEqual(
    data.studentYearGenderData.reduce((total, row) => total + row.total, 0),
    3425,
  );

  /* Course keys are the distinct program names across the year rows, sorted. */
  const keys = [
    ...new Set(
      data.studentYearCourseData.flatMap((row) =>
        Object.keys(row).filter((key) => key !== "name"),
      ),
    ),
  ].sort();
  assert.deepStrictEqual(data.courseKeys, keys);
  assert.ok(data.courseKeys.length > 0);
});

test("sampleDashboardFilterOptions: sample-native option lists", () => {
  const options = sampleDashboardFilterOptions();

  assert.deepStrictEqual(options.schoolYears, [
    "2024-2025",
    "2023-2024",
    "2022-2023",
    "2021-2022",
    "2020-2021",
  ]);
  assert.deepStrictEqual(options.semesters, SAMPLE_SEMESTERS);
  assert.deepStrictEqual(options.semesters, ["1st", "2nd", "Summer"]);
  assert.deepStrictEqual(options.sexOptions, ["Female", "Male"]);
  assert.deepStrictEqual(options.employmentStatuses, CATEGORY_ORDER);
  assert.deepStrictEqual(options.appointmentStatuses, APPOINTMENT_ORDER);

  /* Both student colleges and employee offices are offered; the sample covers
     the same five-year window the dashboard banner names. */
  ["College of Engineering", "GAD Unit", "Laboratory School"].forEach((name) =>
    assert.ok(options.collegeOptions.includes(name), `${name} missing`),
  );
  assert.strictEqual(
    [...options.collegeOptions].sort((a, b) => a.localeCompare(b)).join("|"),
    options.collegeOptions.join("|"),
  );
  assert.deepStrictEqual(SAMPLE_DASHBOARD_SCHOOL_YEARS, options.schoolYears);
  assert.deepStrictEqual(
    SAMPLE_DASHBOARD_SCHOOL_YEARS.slice().sort(),
    [...SAMPLE_SCHOOL_YEARS].sort(),
  );
});

test("sample dataset: profile fields the dashboard demographics need", () => {
  assert.deepStrictEqual(SAMPLE_DASHBOARD_POPULATION, {
    students: 3425,
    employees: 1016,
  });

  [...SAMPLE_STUDENT_RECORDS, ...SAMPLE_EMPLOYEE_RECORDS].forEach((record) => {
    assert.match(record.birthday, /^\d{4}-01-01$/, `${record.id} birthday`);
    assert.ok(record.civilStatus, `${record.id} civilStatus`);
    assert.ok(record.religion, `${record.id} religion`);
  });

  /* The curated per-sex civil-status totals survive the spread. */
  const single = SAMPLE_STUDENT_RECORDS.filter(
    (record) => record.civilStatus === "Single",
  );
  assert.strictEqual(single.length, 2850);
  assert.strictEqual(
    single.filter((record) => record.sex === "Female").length,
    1700,
  );
});

test("buildSampleDashboardData: deterministic and filter-composable", () => {
  const filters = {
    college: "College of Education",
    school_year: "2022-2023",
    sex: "Female",
    person_type: "Student",
    year_level: "3rd Year",
  };
  const first = buildSampleDashboardData(filters);
  const second = buildSampleDashboardData(filters);

  assert.deepStrictEqual(first, second);

  /* Every row of the payload narrows with the filters: no row may exceed the
     snapshot total (the students-only scope here). */
  assert.ok(first.snapshot.total > 0);
  assert.ok(first.snapshot.total <= 3425);
  assert.strictEqual(
    first.snapshot.femaleCount,
    first.snapshot.total,
    "a Female filter leaves no male records",
  );
  assert.deepStrictEqual(first.demographics.employeeOfficeData, []);
});

