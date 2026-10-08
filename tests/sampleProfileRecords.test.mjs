import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

import {
  SAMPLE_EMPLOYEE_LIST_ROWS,
  SAMPLE_EMPLOYEE_PROFILE_COUNT,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS,
  SAMPLE_EMPLOYEE_PROFILES,
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_LIST_ROWS,
  SAMPLE_STUDENT_PROFILE_COUNT,
  SAMPLE_STUDENT_PROFILE_RECORDS,
  SAMPLE_STUDENT_PROFILES,
} from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";

const STUDENTS = 10473;

test("sample profiles: 10,473 students and 685 employees", () => {
  assert.strictEqual(SAMPLE_STUDENT_PROFILE_COUNT, STUDENTS);
  assert.strictEqual(SAMPLE_EMPLOYEE_PROFILE_COUNT, 685);
  assert.strictEqual(SAMPLE_STUDENT_PROFILE_RECORDS.length, STUDENTS);
  assert.strictEqual(SAMPLE_EMPLOYEE_PROFILE_RECORDS.length, 685);
  assert.deepStrictEqual(SAMPLE_SCHOOL_YEARS, [
    "2022-2023",
    "2023-2024",
    "2024-2025",
    "2025-2026",
    "2026-2027",
  ]);
});

test("sample students: 2026-2027 sex totals match the enrollment tables", () => {
  const active = SAMPLE_STUDENT_PROFILE_RECORDS.filter((r) =>
    r.terms.some((t) => t.school_year === "2026-2027"),
  );
  assert.strictEqual(active.length, STUDENTS);
  assert.strictEqual(active.filter((r) => r.sex === "Male").length, 4687);
  assert.strictEqual(active.filter((r) => r.sex === "Female").length, 5786);
});

test("sample profiles: unique ids, emails and student/employee ids", () => {
  const all = [...SAMPLE_STUDENT_PROFILES, ...SAMPLE_EMPLOYEE_PROFILES];
  assert.strictEqual(new Set(all.map((p) => p._id)).size, all.length);
  assert.strictEqual(new Set(all.map((p) => p.contact.email)).size, all.length);
  assert.strictEqual(
    new Set(SAMPLE_STUDENT_PROFILE_RECORDS.map((r) => r.studentId)).size,
    STUDENTS,
  );
  assert.strictEqual(
    new Set(SAMPLE_EMPLOYEE_PROFILE_RECORDS.map((r) => r.employeeId)).size,
    685,
  );
});

test("sample students: continuous history ending on 2026-2027 1st", () => {
  SAMPLE_STUDENT_PROFILES.forEach((p) => {
    const last = p.profile_terms[p.profile_terms.length - 1];
    assert.strictEqual(last.school_year, "2026-2027");
    assert.strictEqual(last.semester, "1st");
    const level = p.affiliation.academic_information.year_level;
    assert.ok(
      level === undefined ||
        ["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(level),
    );
  });
});

test("sample employees: one 1st-semester term per year from the start year on", () => {
  SAMPLE_EMPLOYEE_PROFILES.forEach((p) => {
    const startIdx = SAMPLE_SCHOOL_YEARS.indexOf(p._meta.startYear);
    assert.ok(startIdx >= 0);
    assert.deepStrictEqual(
      p.profile_terms.map((t) => `${t.school_year}|${t.semester}`),
      SAMPLE_SCHOOL_YEARS.slice(startIdx).map((y) => `${y}|1st`),
    );
  });
  /* Headcount grows year over year instead of repeating one figure. */
  const perYear = SAMPLE_SCHOOL_YEARS.map(
    (y) =>
      SAMPLE_EMPLOYEE_PROFILE_RECORDS.filter((r) => r.years.includes(y)).length,
  );
  assert.strictEqual(perYear[perYear.length - 1], 685);
  perYear.slice(1).forEach((n, i) => assert.ok(n > perYear[i]));
  SAMPLE_EMPLOYEE_PROFILE_RECORDS.forEach((r) => {
    assert.strictEqual(Boolean(r.academicRank), r.personnelType === "Faculty");
  });
});

test("sample list rows: shaped like /api/profile/list items", () => {
  assert.strictEqual(SAMPLE_STUDENT_LIST_ROWS.length, STUDENTS);
  assert.strictEqual(SAMPLE_EMPLOYEE_LIST_ROWS.length, 685);
  const row = SAMPLE_STUDENT_LIST_ROWS[0];
  assert.ok(row.personal_info_id.personal.first_name);
  assert.ok(row.personal_info_id.affiliation.academic_information.college);
  assert.ok(
    SAMPLE_EMPLOYEE_LIST_ROWS[0].personal_info_id.affiliation
      .employment_information.office,
  );
});

test("data/sample-profiles.json matches the in-app sample", () => {
  const json = JSON.parse(
    readFileSync(new URL("../data/sample-profiles.json", import.meta.url), "utf8"),
  );
  assert.strictEqual(json.profiles.length, STUDENTS + 685);
  assert.deepStrictEqual(
    json.profiles.map((p) => p._id),
    [...SAMPLE_STUDENT_PROFILES, ...SAMPLE_EMPLOYEE_PROFILES].map((p) => p._id),
  );
});

