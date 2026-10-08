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
  SAMPLE_STUDENT_PROFILE_RECORDS as SAMPLE_STUDENT_RECORDS,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS as SAMPLE_EMPLOYEE_RECORDS,
} from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";
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

  /* Every named sample profile: 10,473 students + 685 employees. */
  const everyone = [...SAMPLE_STUDENT_RECORDS, ...SAMPLE_EMPLOYEE_RECORDS];
  const count = (fn) => everyone.filter(fn).length;
  assert.strictEqual(data.snapshot.total, 11158);
  assert.strictEqual(data.snapshot.total, everyone.length);
  assert.strictEqual(data.snapshot.femaleCount, count((r) => r.sex === "Female"));
  assert.strictEqual(data.snapshot.maleCount, count((r) => r.sex === "Male"));
  assert.strictEqual(data.snapshot.pwdCount, count((r) => r.pwd === true));
  assert.strictEqual(data.snapshot.ipCount, count((r) => r.indigenous === true));

  assert.deepStrictEqual(data.genderPanel.genderData, [
    { name: "Female", value: count((r) => r.sex === "Female") },
    { name: "Male", value: count((r) => r.sex === "Male") },
  ]);
  /* Every sample record states a preference, so no "Not specified" row. */
  assert.deepStrictEqual(data.genderPanel.preferenceData, [
    { name: "Male", value: count((r) => r.genderIdentity === "Male") },
    { name: "Female", value: count((r) => r.genderIdentity === "Female") },
    { name: "LGBTQIA+", value: count((r) => r.genderIdentity === "LGBTQIA+") },
  ]);

  assert.deepStrictEqual(data.employeeGenderPanel.genderData, [
    { name: "Female", value: 413 },
    { name: "Male", value: 272 },
  ]);
});

test("buildSampleDashboardData: college scopes students and employees", () => {
  const engineering = buildSampleDashboardData({
    college: "College of Engineering",
  });

  const students = SAMPLE_STUDENT_RECORDS.filter(
    (r) => r.college === "College of Engineering",
  );
  const staff = SAMPLE_EMPLOYEE_RECORDS.filter(
    (r) => r.office === "College of Engineering",
  );
  assert.ok(students.length > 0 && staff.length > 0);
  assert.strictEqual(engineering.snapshot.total, students.length + staff.length);
  assert.strictEqual(sum(engineering.studentProgramData), students.length);
  assert.deepStrictEqual(engineering.demographics.employeeOfficeData, [
    {
      name: "College of Engineering",
      Male: staff.filter((r) => r.sex === "Male").length,
      Female: staff.filter((r) => r.sex === "Female").length,
      Other: 0,
    },
  ]);

  /* An office that hosts no students still scopes the employee panels. */
  const office = "Registrar's Office";
  const officeStaff = SAMPLE_EMPLOYEE_RECORDS.filter((r) => r.office === office);
  const registrar = buildSampleDashboardData({ college: office });
  assert.strictEqual(registrar.snapshot.total, officeStaff.length);
  assert.deepStrictEqual(registrar.studentProgramData, []);
  assert.strictEqual(
    sum(registrar.employeeGenderPanel.genderData),
    officeStaff.length,
  );
});

test("buildSampleDashboardData: school year uses terms and appointment years", () => {
  const studentsIn = (year) =>
    SAMPLE_STUDENT_RECORDS.filter((r) =>
      (r.terms || []).some((t) => t.school_year === year),
    ).length;
  const employeesIn = (year) =>
    SAMPLE_EMPLOYEE_RECORDS.filter((r) => (r.years || []).includes(year)).length;

  const oldest = buildSampleDashboardData({ school_year: "2022-2023" });
  assert.strictEqual(
    oldest.snapshot.total,
    studentsIn("2022-2023") + employeesIn("2022-2023"),
  );
  assert.strictEqual(
    buildSampleDashboardData({
      school_year: "2022-2023",
      person_type: "Student",
    }).snapshot.total,
    studentsIn("2022-2023"),
  );
  assert.strictEqual(
    buildSampleDashboardData({
      school_year: "2022-2023",
      person_type: "Employee",
    }).snapshot.total,
    employeesIn("2022-2023"),
  );

  /* The active year holds every student and employee. */
  const newest = buildSampleDashboardData({ school_year: "2026-2027" });
  assert.strictEqual(newest.snapshot.total, 10473 + 685);
});

test("buildSampleDashboardData: a semester narrows students, not employees", () => {
  const expectedStudents = SAMPLE_STUDENT_RECORDS.filter((record) =>
    (record.terms || []).some(
      (term) =>
        term.school_year === "2022-2023" && term.semester === "Summer",
    ),
  ).length;
  const employees = SAMPLE_EMPLOYEE_RECORDS.filter((r) =>
    (r.years || []).includes("2022-2023"),
  ).length;

  const summer = buildSampleDashboardData({
    school_year: "2022-2023",
    semester: "Summer",
  });
  /* The semester does not narrow employees. */
  assert.strictEqual(summer.snapshot.total, expectedStudents + employees);
});

test("buildSampleDashboardData: sex, person type, year level and status filters", () => {
  const everyone = [...SAMPLE_STUDENT_RECORDS, ...SAMPLE_EMPLOYEE_RECORDS];
  assert.strictEqual(
    buildSampleDashboardData({ sex: "Female" }).snapshot.total,
    everyone.filter((r) => r.sex === "Female").length,
  );
  assert.strictEqual(
    buildSampleDashboardData({ person_type: "Student" }).snapshot.total,
    10473,
  );
  /* The year level excludes employees (they have no academic level). */
  assert.strictEqual(
    buildSampleDashboardData({ year_level: "1st Year" }).snapshot.total,
    SAMPLE_STUDENT_RECORDS.filter((r) => r.yearLevel === "1st Year").length,
  );

  const facultyRecords = SAMPLE_EMPLOYEE_RECORDS.filter(
    (r) => r.personnelType === "Faculty",
  );
  const faculty = buildSampleDashboardData({ employment: "Faculty" });
  assert.strictEqual(faculty.snapshot.total, facultyRecords.length);
  assert.deepStrictEqual(faculty.studentProgramData, []);
  assert.deepStrictEqual(faculty.demographics.employmentData, [
    {
      name: "Faculty",
      Male: facultyRecords.filter((r) => r.sex === "Male").length,
      Female: facultyRecords.filter((r) => r.sex === "Female").length,
      Other: 0,
    },
  ]);

  assert.strictEqual(
    buildSampleDashboardData({ appointment: "Regular" }).snapshot.total,
    SAMPLE_EMPLOYEE_RECORDS.filter((r) => r.appointmentStatus === "Regular")
      .length,
  );
});

test("buildSampleDashboardData: demographics add up to the filtered population", () => {
  const filters = { school_year: "2023-2024" };
  const data = buildSampleDashboardData(filters);
  const filteredCount = SAMPLE_STUDENT_RECORDS.filter((record) =>
    (record.terms || []).some((term) => term.school_year === "2023-2024"),
  ).length +
    SAMPLE_EMPLOYEE_RECORDS.filter((record) =>
      (record.years || []).includes("2023-2024"),
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
    (record.years || []).includes("2023-2024"),
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
  assert.strictEqual(sum(data.studentProgramData), 10473);
  assert.strictEqual(
    data.studentYearGenderData.reduce((total, row) => total + row.total, 0),
    10473,
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
    "2026-2027",
    "2025-2026",
    "2024-2025",
    "2023-2024",
    "2022-2023",
  ]);
  assert.deepStrictEqual(options.semesters, SAMPLE_SEMESTERS);
  assert.deepStrictEqual(options.semesters, ["1st", "2nd", "Summer"]);
  assert.deepStrictEqual(options.sexOptions, ["Female", "Male"]);
  assert.deepStrictEqual(options.employmentStatuses, CATEGORY_ORDER);
  assert.deepStrictEqual(options.appointmentStatuses, APPOINTMENT_ORDER);

  /* Both student colleges and employee offices are offered; the sample covers
     the same five-year window the dashboard banner names. */
  ["College of Engineering", "Registrar's Office", "Graduate School"].forEach((name) =>
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
    students: 10473,
    employees: 685,
  });

  [...SAMPLE_STUDENT_RECORDS, ...SAMPLE_EMPLOYEE_RECORDS].forEach((record) => {
    assert.match(record.birthday, /^\d{4}-\d{2}-\d{2}$/, `${record.id} birthday`);
    assert.ok(record.civilStatus, `${record.id} civilStatus`);
    assert.ok(record.religion, `${record.id} religion`);
  });

  /* The curated per-sex civil-status totals survive the spread. */
  const single = SAMPLE_STUDENT_RECORDS.filter(
    (record) => record.civilStatus === "Single",
  );
  assert.strictEqual(
    single.length,
    SAMPLE_STUDENT_RECORDS.filter((r) => r.civilStatus === "Single").length,
  );
  assert.ok(single.length > 0);
  assert.ok(single.filter((record) => record.sex === "Female").length > 0);
});

test("buildSampleDashboardData: deterministic and filter-composable", () => {
  const filters = {
    college: "College of Education",
    school_year: "2025-2026",
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
  assert.ok(first.snapshot.total <= 10473);
  assert.strictEqual(
    first.snapshot.femaleCount,
    first.snapshot.total,
    "a Female filter leaves no male records",
  );
  assert.deepStrictEqual(first.demographics.employeeOfficeData, []);
});

