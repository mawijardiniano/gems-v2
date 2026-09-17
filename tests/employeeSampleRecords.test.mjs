import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSampleEmployeeRecords,
  SAMPLE_EMPLOYEE_RECORDS,
} from "../app/(pages)/(event)/gender-statistics/components/employeeSampleRecords.js";
import {
  EMPTY_EMPLOYEE_FILTERS,
  activeFilterCount,
  computeEmployeeStats,
  departmentOptions,
  filterEmployeeRecords,
} from "../app/(pages)/(event)/gender-statistics/components/employeeStats.js";

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
      "sample-employees.json",
    ),
    "utf8",
  ),
);

// ─── Generator ───────────────────────────────────────────────────────

test("buildSampleEmployeeRecords: deterministic and complete", () => {
  const first = buildSampleEmployeeRecords();
  const second = buildSampleEmployeeRecords();

  assert.strictEqual(first.length, 1026);
  assert.deepStrictEqual(first, second, "generator must be deterministic");

  const fields = [
    "id",
    "office",
    "sex",
    "personnelType",
    "positionLevel",
    "appointmentStatus",
    "department",
  ];
  first.forEach((record) => {
    fields.forEach((field) => {
      assert.ok(record[field], `${field} missing on ${record.id}`);
    });
    assert.ok(["Female", "Male", "Other"].includes(record.sex));
    assert.strictEqual(
      Boolean(record.academicRank),
      record.personnelType === "Faculty",
      "only faculty records carry an academic rank",
    );
    assert.ok(
      record.income === null ||
        ["Low Income", "Middle Income", "High Income"].includes(record.income),
    );
  });
});

test("buildSampleEmployeeRecords: sex and office marginals match the curated table", () => {
  const counts = SAMPLE_EMPLOYEE_RECORDS.reduce(
    (acc, record) => {
      acc[record.sex] += 1;
      acc.offices[record.office] = (acc.offices[record.office] || 0) + 1;
      return acc;
    },
    { Female: 0, Male: 0, Other: 0, offices: {} },
  );

  assert.strictEqual(counts.Female, 612);
  assert.strictEqual(counts.Male, 404);
  assert.strictEqual(counts.Other, 10);

  snapshot.byOffice.forEach((row) => {
    assert.strictEqual(
      counts.offices[row.office],
      row.total,
      `${row.office} headcount`,
    );
  });
});

test("computeEmployeeStats: reproduces the committed snapshot exactly", () => {
  const computed = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);
  assert.deepStrictEqual(computed.totals, snapshot.totals);
  assert.deepStrictEqual(computed.byOffice, snapshot.byOffice);
  assert.deepStrictEqual(computed.byCategory, snapshot.byCategory);
  assert.deepStrictEqual(computed.byPositionLevel, snapshot.byPositionLevel);
  assert.deepStrictEqual(computed.byAcademicRank, snapshot.byAcademicRank);
  assert.deepStrictEqual(computed.byAppointment, snapshot.byAppointment);
  assert.deepStrictEqual(computed.demographics, snapshot.demographics);
});

test("computeEmployeeStats: position levels nest inside the personnel category", () => {
  const stats = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);

  assert.strictEqual(
    stats.byPositionLevel.reduce((sum, row) => sum + row.total, 0),
    1026,
  );
  assert.strictEqual(
    stats.byCategory.reduce((sum, row) => sum + row.total, 0),
    1026,
  );

  [
    "University President",
    "Vice President",
    "Directors",
    "Administrative Personnel",
  ].forEach((level) => {
    const faculty = filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, {
      positionLevel: level,
      personnelType: "Faculty",
    });
    assert.strictEqual(faculty.length, 0, `${level} must not hold faculty`);
  });
});

test("computeEmployeeStats: academic ranks cover exactly the faculty", () => {
  const stats = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);
  const rankTotal = stats.byAcademicRank.reduce(
    (sum, row) => sum + row.total,
    0,
  );
  const faculty = filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, {
    personnelType: "Faculty",
  });
  assert.strictEqual(rankTotal, faculty.length);
});

// ─── Filters ─────────────────────────────────────────────────────────

test("filterEmployeeRecords: every dimension narrows the dataset", () => {
  const records = SAMPLE_EMPLOYEE_RECORDS;

  const faculty = filterEmployeeRecords(records, { personnelType: "Faculty" });
  assert.strictEqual(faculty.length, 419);
  assert.ok(faculty.every((record) => record.personnelType === "Faculty"));

  const engineering = filterEmployeeRecords(records, {
    office: "College of Engineering",
  });
  assert.strictEqual(engineering.length, 53);

  const deans = filterEmployeeRecords(records, { positionLevel: "Deans" });
  assert.strictEqual(deans.length, 30);

  const nursing = filterEmployeeRecords(records, {
    department: "Department of Nursing",
  });
  assert.ok(nursing.length > 0);
  assert.ok(nursing.every((r) => r.department === "Department of Nursing"));
  assert.ok(
    nursing.every((r) => r.office === "College of Allied Health Sciences"),
  );

  const regular = filterEmployeeRecords(records, {
    appointmentStatus: "Regular",
  });
  assert.strictEqual(regular.length, 499);
});

test("filterEmployeeRecords: filters compose and subsets re-sum", () => {
  const subset = filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, {
    personnelType: "Faculty",
    office: "College of Education",
  });
  const stats = computeEmployeeStats(subset);

  assert.strictEqual(stats.totals.total, subset.length);
  assert.strictEqual(
    stats.byAppointment.reduce((sum, row) => sum + row.total, 0),
    subset.length,
  );
  assert.strictEqual(
    stats.byPositionLevel.reduce((sum, row) => sum + row.total, 0),
    subset.length,
  );
  assert.ok(subset.every((record) => record.office === "College of Education"));
  assert.ok(subset.every((record) => record.personnelType === "Faculty"));
});

test("filterEmployeeRecords: impossible combinations return an empty dataset", () => {
  const subset = filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, {
    office: "College of Engineering",
    personnelType: "Job Order/Contractual",
  });
  assert.deepStrictEqual(subset, []);
  assert.strictEqual(computeEmployeeStats(subset).totals.total, 0);
});

test("filterEmployeeRecords: no filters returns the full dataset", () => {
  const all = filterEmployeeRecords(
    SAMPLE_EMPLOYEE_RECORDS,
    EMPTY_EMPLOYEE_FILTERS,
  );
  assert.strictEqual(all.length, SAMPLE_EMPLOYEE_RECORDS.length);
  assert.strictEqual(activeFilterCount(EMPTY_EMPLOYEE_FILTERS), 0);
  assert.strictEqual(
    activeFilterCount({
      personnelType: "Faculty",
      office: "College of Education",
    }),
    2,
  );
});

test("departmentOptions: narrows to the selected office", () => {
  const engineering = departmentOptions(
    SAMPLE_EMPLOYEE_RECORDS,
    "College of Engineering",
  );
  assert.deepStrictEqual(engineering, [
    "Department of Civil Engineering",
    "Department of Electrical Engineering",
    "Department of Mechanical Engineering",
  ]);

  const everything = departmentOptions(SAMPLE_EMPLOYEE_RECORDS);
  assert.ok(everything.length > engineering.length);
  assert.ok(everything.includes("GAD Office"));
});

test("filterEmployeeRecords: four filters combine", () => {
  const mixed = filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, {
    personnelType: "Faculty",
    office: "College of Education",
    department: "Department of Secondary Education",
    appointmentStatus: "Regular",
  });

  assert.ok(mixed.length > 0);
  assert.ok(
    mixed.every(
      (record) =>
        record.personnelType === "Faculty" &&
        record.office === "College of Education" &&
        record.department === "Department of Secondary Education" &&
        record.appointmentStatus === "Regular",
    ),
  );
});
