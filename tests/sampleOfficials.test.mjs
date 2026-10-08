import test from "node:test";
import assert from "node:assert/strict";

import { computeEmployeeStats } from "../app/(pages)/(event)/gender-statistics/components/employeeStats.js";
import { SAMPLE_EMPLOYEE_PROFILE_RECORDS as EMPLOYEES } from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";

const LEVELS = [
  "University President",
  "Vice President",
  "Directors",
  "Deans",
  "Department Chairs",
];

test("sample employees include every key official level", () => {
  const stats = computeEmployeeStats(EMPLOYEES);
  for (const level of LEVELS) {
    const row = stats.byPositionLevel.find((r) => r.level === level);
    assert.ok(row && row.total > 0, `${level} has no records`);
  }
});

test("employee total is unchanged and position levels re-sum to it", () => {
  assert.equal(EMPLOYEES.length, 685);
  const stats = computeEmployeeStats(EMPLOYEES);
  const sum = stats.byPositionLevel.reduce((n, r) => n + r.total, 0);
  assert.equal(sum, EMPLOYEES.length);
});

test("deans and chairs are Faculty; president/VPs/directors are Administrative Staff", () => {
  for (const r of EMPLOYEES) {
    if (r.positionLevel === "Deans" || r.positionLevel === "Department Chairs") {
      assert.equal(r.personnelType, "Faculty");
    }
    if (["University President", "Vice President", "Directors"].includes(r.positionLevel)) {
      assert.equal(r.personnelType, "Administrative Staff");
    }
  }
});
