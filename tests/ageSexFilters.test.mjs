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
  /* The five converted filters are multi-selects: empty [] is "all", a
     non-empty list counts as one active filter. */
  assert.equal(
    activeFilterCount({ ...EMPTY_STUDENT_FILTERS, campus: ["Boac"] }),
    1,
  );
  assert.equal(
    activeFilterCount({ ...EMPTY_STUDENT_FILTERS, semester: ["1st", "2nd"] }),
    1,
  );
});

test("student filters: campus / college / program / year level / semester are multi-select ORs", () => {
  const base = filterStudentRecords(STUDENTS, {});
  assert.ok(base.length > 0);

  const campuses = [...new Set(STUDENTS.map((r) => r.campus).filter(Boolean))];
  assert.ok(campuses.length >= 2, "sample needs 2+ campuses for this test");
  const first = filterStudentRecords(STUDENTS, { campus: [campuses[0]] });
  const second = filterStudentRecords(STUDENTS, { campus: [campuses[1]] });
  const both = filterStudentRecords(STUDENTS, { campus: campuses.slice(0, 2) });
  assert.ok(first.length > 0 && second.length > 0);
  assert.equal(both.length, first.length + second.length);
  assert.ok(both.every((r) => campuses.slice(0, 2).includes(r.campus)));

  // Legacy single-value callers keep working.
  assert.equal(
    filterStudentRecords(STUDENTS, { campus: campuses[0] }).length,
    first.length,
  );

  const colleges = [...new Set(STUDENTS.map((r) => r.college).filter(Boolean))];
  const collegePair = filterStudentRecords(STUDENTS, {
    college: colleges.slice(0, 2),
  });
  assert.ok(
    collegePair.length > 0 &&
      collegePair.every((r) => colleges.slice(0, 2).includes(r.college)),
  );

  const courses = [...new Set(STUDENTS.map((r) => r.course).filter(Boolean))];
  const coursePair = filterStudentRecords(STUDENTS, {
    course: courses.slice(0, 2),
  });
  assert.ok(
    coursePair.length > 0 &&
      coursePair.every((r) => courses.slice(0, 2).includes(r.course)),
  );

  const yearPair = filterStudentRecords(STUDENTS, {
    yearLevel: ["1st Year", "2nd Year"],
  });
  assert.ok(
    yearPair.length > 0 &&
      yearPair.every((r) => ["1st Year", "2nd Year"].includes(r.yearLevel)),
  );
  assert.equal(
    filterStudentRecords(STUDENTS, { yearLevel: "1st Year" }).length,
    filterStudentRecords(STUDENTS, { yearLevel: ["1st Year"] }).length,
  );

  const terms = filterStudentRecords(STUDENTS, { semester: ["1st", "2nd"] });
  const one = filterStudentRecords(STUDENTS, { semester: "1st" });
  assert.ok(terms.length >= one.length && one.length > 0);
  assert.ok(
    terms.every((r) =>
      (r.terms || []).some((t) => ["1st", "2nd"].includes(t.semester)),
    ),
  );

  // Dimensions compose: campus AND semester both apply.
  const composed = filterStudentRecords(STUDENTS, {
    campus: [campuses[0]],
    semester: ["1st"],
  });
  assert.ok(
    composed.length <= Math.min(first.length, one.length) &&
      composed.every(
        (r) =>
          r.campus === campuses[0] &&
          (r.terms || []).some((t) => t.semester === "1st"),
      ),
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

test("employee filters: personnel type / office / department / appointment / position are multi-select ORs", () => {
  const base = filterEmployeeRecords(EMPLOYEES, {});
  assert.ok(base.length > 0);

  const offices = [...new Set(EMPLOYEES.map((r) => r.office).filter(Boolean))];
  assert.ok(offices.length >= 2, "sample needs 2+ offices for this test");
  const first = filterEmployeeRecords(EMPLOYEES, { office: [offices[0]] });
  const second = filterEmployeeRecords(EMPLOYEES, { office: [offices[1]] });
  const both = filterEmployeeRecords(EMPLOYEES, { office: offices.slice(0, 2) });
  assert.ok(first.length > 0 && second.length > 0);
  assert.equal(both.length, first.length + second.length);
  assert.ok(both.every((r) => offices.slice(0, 2).includes(r.office)));

  // Legacy single-value callers keep working.
  assert.equal(
    filterEmployeeRecords(EMPLOYEES, { office: offices[0] }).length,
    first.length,
  );

  const types = [
    ...new Set(EMPLOYEES.map((r) => r.personnelType).filter(Boolean)),
  ];
  const typePair = filterEmployeeRecords(EMPLOYEES, {
    personnelType: types.slice(0, 2),
  });
  assert.ok(
    typePair.length > 0 &&
      typePair.every((r) => types.slice(0, 2).includes(r.personnelType)),
  );

  const statuses = [
    ...new Set(EMPLOYEES.map((r) => r.appointmentStatus).filter(Boolean)),
  ];
  const statusPair = filterEmployeeRecords(EMPLOYEES, {
    appointmentStatus: statuses.slice(0, 2),
  });
  assert.ok(
    statusPair.length > 0 &&
      statusPair.every((r) => statuses.slice(0, 2).includes(r.appointmentStatus)),
  );
  assert.equal(
    filterEmployeeRecords(EMPLOYEES, { appointmentStatus: statuses[0] }).length,
    filterEmployeeRecords(EMPLOYEES, { appointmentStatus: [statuses[0]] }).length,
  );

  const levels = [
    ...new Set(EMPLOYEES.map((r) => r.positionLevel).filter(Boolean)),
  ];
  const levelPair = filterEmployeeRecords(EMPLOYEES, {
    positionLevel: levels.slice(0, 2),
  });
  assert.ok(
    levelPair.length > 0 &&
      levelPair.every((r) => levels.slice(0, 2).includes(r.positionLevel)),
  );

  const departments = [
    ...new Set(EMPLOYEES.map((r) => r.department).filter(Boolean)),
  ];
  const deptPair = filterEmployeeRecords(EMPLOYEES, {
    department: departments.slice(0, 2),
  });
  assert.ok(
    deptPair.length > 0 &&
      deptPair.every((r) => departments.slice(0, 2).includes(r.department)),
  );

  // Dimensions compose: office AND appointment both apply.
  const composed = filterEmployeeRecords(EMPLOYEES, {
    office: [offices[0]],
    appointmentStatus: [statuses[0]],
  });
  const single = filterEmployeeRecords(EMPLOYEES, {
    appointmentStatus: [statuses[0]],
  });
  assert.ok(
    composed.length <= Math.min(first.length, single.length) &&
      composed.every(
        (r) => r.office === offices[0] && r.appointmentStatus === statuses[0],
      ),
  );

  // Academic year is a multi-select OR across the appointment history.
  const years = [
    ...new Set(EMPLOYEES.flatMap((r) => r.years || []).filter(Boolean)),
  ].sort();
  assert.ok(years.length >= 2, "sample needs 2+ years for this test");
  const yearOne = filterEmployeeRecords(EMPLOYEES, { schoolYear: [years[0]] });
  const yearTwo = filterEmployeeRecords(EMPLOYEES, { schoolYear: [years[1]] });
  const yearBoth = filterEmployeeRecords(EMPLOYEES, {
    schoolYear: years.slice(0, 2),
  });
  assert.ok(yearOne.length > 0 && yearTwo.length > 0);
  assert.ok(yearBoth.length >= Math.max(yearOne.length, yearTwo.length));
  assert.ok(
    yearBoth.every((r) =>
      years.slice(0, 2).some((y) => (r.years || []).includes(y)),
    ),
  );
  // Legacy single-value callers keep working.
  assert.equal(
    filterEmployeeRecords(EMPLOYEES, { schoolYear: years[0] }).length,
    yearOne.length,
  );
});
