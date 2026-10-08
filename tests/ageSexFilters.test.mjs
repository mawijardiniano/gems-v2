import test from "node:test";
import assert from "node:assert/strict";

import {
  AGE_GROUP_ORDER,
  ageFromBirthday,
  ageGroupForAge,
  ageGroupOf,
  ageGroupBirthdayRange,
  parseListParam,
} from "../app/(pages)/(event)/gender-statistics/components/ageGroups.js";
import {
  EMPTY_STUDENT_FILTERS,
  activeFilterCount,
  computeStudentStats,
  filterStudentRecords,
} from "../app/(pages)/(event)/gender-statistics/components/studentStats.js";
import {
  EMPTY_EMPLOYEE_FILTERS,
  computeEmployeeStats,
  filterEmployeeRecords,
} from "../app/(pages)/(event)/gender-statistics/components/employeeStats.js";
import {
  SAMPLE_STUDENT_PROFILE_RECORDS as STUDENTS,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS as EMPLOYEES,
} from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";

const NOW = new Date("2026-05-10T00:00:00Z");

test("age bands: boundaries", () => {
  assert.equal(ageGroupForAge(14), "Under 15");
  assert.equal(ageGroupForAge(15), "15-19");
  assert.equal(ageGroupForAge(19), "15-19");
  assert.equal(ageGroupForAge(20), "20-24");
  assert.equal(ageGroupForAge(44), "40-44");
  assert.equal(ageGroupForAge(45), "45+");
  assert.equal(ageGroupForAge(null), null);
});

test("age from birthday respects the birthday not yet reached", () => {
  assert.equal(ageFromBirthday("2006-05-11", NOW), 19);
  assert.equal(ageFromBirthday("2006-05-10", NOW), 20);
  assert.equal(ageFromBirthday("bad"), null);
  assert.equal(ageGroupOf({ birthday: "2006-05-10" }, NOW), "20-24");
});

test("birthday range agrees with age band", () => {
  for (const group of AGE_GROUP_ORDER) {
    const range = ageGroupBirthdayRange(group, NOW);
    assert.ok(range.gt < range.lte);
  }
  const r = ageGroupBirthdayRange("20-24", NOW);
  const inBand = new Date("2003-01-01");
  assert.ok(inBand > r.gt && inBand <= r.lte);
  assert.ok(!(new Date("2010-01-01") > r.gt && new Date("2010-01-01") <= r.lte));
});

test("parseListParam handles strings and arrays", () => {
  assert.deepEqual(parseListParam("a, b,,c"), ["a", "b", "c"]);
  assert.deepEqual(parseListParam(["x", "", "y"]), ["x", "y"]);
  assert.deepEqual(parseListParam(null), []);
});

test("student filters: multi-select sex and age group compose", () => {
  const male = filterStudentRecords(STUDENTS, { sexes: ["Male"] });
  assert.ok(male.length > 0 && male.every((r) => r.sex === "Male"));

  const both = filterStudentRecords(STUDENTS, { sexes: ["Male", "Female"] });
  assert.equal(both.length, STUDENTS.length);

  const bands = filterStudentRecords(STUDENTS, {
    ageGroups: ["20-24", "25-29"],
  });
  assert.ok(
    bands.every((r) => ["20-24", "25-29"].includes(ageGroupOf(r))),
  );

  const combined = filterStudentRecords(STUDENTS, {
    ageGroups: ["20-24"],
    sexes: ["Female"],
  });
  assert.ok(combined.length < bands.length);
  assert.equal(
    filterStudentRecords(STUDENTS, EMPTY_STUDENT_FILTERS).length,
    STUDENTS.length,
  );
});

test("student stats: byAgeGroup re-sums to totals", () => {
  const stats = computeStudentStats(STUDENTS);
  const sum = stats.byAgeGroup.reduce((n, r) => n + r.total, 0);
  assert.equal(sum, stats.totals.total);
  assert.deepEqual(
    stats.byAgeGroup.map((r) => r.age_group),
    AGE_GROUP_ORDER.filter((g) => stats.ageGroups.includes(g)),
  );
});

test("employee filters and stats support age group and sex", () => {
  const stats = computeEmployeeStats(EMPLOYEES);
  assert.equal(
    stats.byAgeGroup.reduce((n, r) => n + r.total, 0),
    stats.totals.total,
  );
  const subset = filterEmployeeRecords(EMPLOYEES, {
    ageGroups: ["45+"],
    sexes: ["Female"],
  });
  assert.ok(
    subset.length > 0 &&
      subset.every((r) => r.sex === "Female" && ageGroupOf(r) === "45+"),
  );
  assert.equal(
    filterEmployeeRecords(EMPLOYEES, EMPTY_EMPLOYEE_FILTERS).length,
    EMPLOYEES.length,
  );
});

test("activeFilterCount ignores empty arrays", () => {
  assert.equal(activeFilterCount(EMPTY_STUDENT_FILTERS), 0);
  assert.equal(
    activeFilterCount({ ...EMPTY_STUDENT_FILTERS, ageGroups: ["15-19"] }),
    1,
  );
});

import { matchesDemographic } from "../app/(pages)/(event)/gender-statistics/components/studentStats.js";

test("demographic filter: union of categories, composes with sex and age", () => {
  const base = filterStudentRecords(STUDENTS, {});
  const pwd = filterStudentRecords(STUDENTS, { demographics: ["Person with Disability (PWD)"] });
  const solo = filterStudentRecords(STUDENTS, { demographics: ["Solo Parent"] });
  const both = filterStudentRecords(STUDENTS, {
    demographics: ["Person with Disability (PWD)", "Solo Parent"],
  });
  assert.ok(pwd.length > 0 && pwd.length < base.length);
  assert.ok(solo.every((r) => r.soloParent === true));
  assert.ok(both.length >= Math.max(pwd.length, solo.length));
  assert.ok(both.every((r) => matchesDemographic(r, "Person with Disability (PWD)") || matchesDemographic(r, "Solo Parent")));
  const female = filterStudentRecords(STUDENTS, { demographics: ["Scholar"], sexes: ["Female"], ageGroups: ["20-24"] });
  assert.ok(female.every((r) => r.scholar === true && ageGroupOf(r) === "20-24"));
  assert.equal(computeStudentStats(STUDENTS).demographicOptions.includes("Solo Parent"), true);
});

test("employee demographic filter and options", () => {
  const pwd = filterEmployeeRecords(EMPLOYEES, { demographics: ["Person with Disability (PWD)"] });
  assert.ok(pwd.every((r) => r.pwd === true));
  assert.ok(EMPTY_EMPLOYEE_FILTERS.demographics.length === 0);
  assert.ok(computeEmployeeStats(EMPLOYEES).demographicOptions.length > 0);
});
