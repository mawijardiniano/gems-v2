import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OFFICE_GROWTH,
  SAMPLE_EMPLOYEE_RECORDS,
  buildSampleEmployeeRecords,
} from "../app/(pages)/(event)/gender-statistics/components/employeeSampleRecords.js";
import { SAMPLE_SCHOOL_YEARS } from "../app/(pages)/(event)/gender-statistics/components/studentSampleRecords.js";
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

  assert.strictEqual(first.length, 1016);
  assert.deepStrictEqual(first, second, "generator must be deterministic");

  const fields = [
    "id",
    "office",
    "sex",
    "personnelType",
    "positionLevel",
    "appointmentStatus",
    "department",
    "startYear",
    "years",
  ];
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
    assert.strictEqual(
      Boolean(record.academicRank),
      record.personnelType === "Faculty",
      "only faculty records carry an academic rank",
    );
    assert.ok(
      record.income === null ||
        ["Low Income", "Middle Income", "High Income"].includes(record.income),
    );
    /* Five years of service: the history starts at the start year, ends at the
       newest sample year and has no gaps. */
    assert.strictEqual(record.years[0], record.startYear);
    assert.strictEqual(record.years[record.years.length - 1], "2024-2025");
    assert.deepStrictEqual(
      record.years,
      SAMPLE_SCHOOL_YEARS.slice(SAMPLE_SCHOOL_YEARS.indexOf(record.startYear)),
      `non-contiguous appointment history on ${record.id}`,
    );
  });
});

test("every academic year keeps a near-complete roster", () => {
  SAMPLE_SCHOOL_YEARS.forEach((schoolYear) => {
    const onboard = SAMPLE_EMPLOYEE_RECORDS.filter((record) =>
      record.years.includes(schoolYear),
    );

    /* 2020-2021 already staffs 848 of the 1,016 employees. */
    assert.ok(
      onboard.length >= 848,
      `${schoolYear} holds a near-complete roster`,
    );
    assert.strictEqual(
      new Set(onboard.map((record) => record.office)).size,
      20,
      `${schoolYear} covers every office`,
    );
    assert.strictEqual(
      new Set(onboard.map((record) => record.personnelType)).size,
      3,
      `${schoolYear} covers every personnel type`,
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
    { Female: 0, Male: 0, offices: {} },
  );

  assert.strictEqual(counts.Female, 612);
  assert.strictEqual(counts.Male, 404);

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
  assert.deepStrictEqual(computed.byAcademicYear, snapshot.byAcademicYear);
  assert.deepStrictEqual(computed.schoolYears, snapshot.schoolYears);
  assert.deepStrictEqual(computed.demographics, snapshot.demographics);
});

test("computeEmployeeStats: the academic years grow to the full roster", () => {
  const stats = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);

  assert.deepStrictEqual(
    stats.byAcademicYear.map((row) => [row.school_year, row.total]),
    [
      ["2020-2021", 848],
      ["2021-2022", 897],
      ["2022-2023", 936],
      ["2023-2024", 977],
      ["2024-2025", 1016],
    ],
  );
  assert.deepStrictEqual(stats.schoolYears, [
    "2024-2025",
    "2023-2024",
    "2022-2023",
    "2021-2022",
    "2020-2021",
  ]);
  /* Every year on board adds up to the committed headcount in the newest one. */
  assert.strictEqual(
    stats.byAcademicYear[stats.byAcademicYear.length - 1].total,
    stats.totals.total,
  );
});

test("computeEmployeeStats: position levels nest inside the personnel category", () => {
  const stats = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);

  assert.strictEqual(
    stats.byPositionLevel.reduce((sum, row) => sum + row.total, 0),
    1016,
  );
  assert.strictEqual(
    stats.byCategory.reduce((sum, row) => sum + row.total, 0),
    1016,
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

test("computeEmployeeStats: Security Guard appears in the appointment breakdown", () => {
  const stats = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);
  const guard = stats.byAppointment.find((row) => row.status === "Security Guard");

  assert.ok(guard, "Security Guard must be a personnel-by-appointment row");
  assert.strictEqual(guard.Female, 6);
  assert.strictEqual(guard.Male, 32);
  assert.strictEqual(guard.total, 38);

  /* The appointment partition still adds up to the full personnel list. */
  assert.strictEqual(
    stats.byAppointment.reduce((sum, row) => sum + row.total, 0),
    stats.totals.total,
  );
});

test("computeEmployeeStats: Solo Parent row and gender identity breakdown", () => {
  const stats = computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS);

  assert.deepStrictEqual(
    stats.demographics.find((row) => row.label === "Solo Parent"),
    { label: "Solo Parent", Female: 20, Male: 7, total: 27 },
  );

  assert.deepStrictEqual(stats.byGenderIdentity, [
    { name: "Male", value: 392 },
    { name: "Female", value: 594 },
    { name: "LGBTQIA+", value: 30 },
  ]);
  assert.strictEqual(stats.totals.lgbtqia, 30);
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

test("offices grow at their own pace across the sample years", () => {
  const headcount = (office, schoolYear) =>
    SAMPLE_EMPLOYEE_RECORDS.filter(
      (record) => record.office === office && record.years.includes(schoolYear),
    ).length;

  /* Pinned counts: the GAD Unit and HRMU are the young offices, education and
     agriculture barely move. */
  assert.strictEqual(headcount("GAD Unit", "2020-2021"), 9);
  assert.strictEqual(headcount("GAD Unit", "2024-2025"), 13);
  assert.strictEqual(headcount("HRMU", "2020-2021"), 9);
  assert.strictEqual(headcount("HRMU", "2024-2025"), 17);
  assert.strictEqual(headcount("College of Education", "2020-2021"), 216);
  assert.strictEqual(headcount("College of Education", "2024-2025"), 228);

  const growth = (office) =>
    headcount(office, "2024-2025") / headcount(office, "2020-2021");
  assert.ok(growth("HRMU") > growth("College of Education"));
  assert.ok(growth("College of Engineering") > growth("College of Education"));

  /* Every growth profile belongs to an office that exists - a typo would
     silently flatten that office's trend. */
  Object.keys(OFFICE_GROWTH).forEach((office) =>
    assert.ok(
      SAMPLE_EMPLOYEE_RECORDS.some((record) => record.office === office),
      `${office} is not a sample office`,
    ),
  );
});

// ─── Filters ─────────────────────────────────────────────────────────

test("filterEmployeeRecords: every dimension narrows the dataset", () => {
  const records = SAMPLE_EMPLOYEE_RECORDS;

  const faculty = filterEmployeeRecords(records, { personnelType: "Faculty" });
  assert.strictEqual(faculty.length, 414);
  assert.ok(faculty.every((record) => record.personnelType === "Faculty"));

  const engineering = filterEmployeeRecords(records, {
    office: "College of Engineering",
  });
  assert.strictEqual(engineering.length, 53);

  const deans = filterEmployeeRecords(records, { positionLevel: "Deans" });
  assert.strictEqual(deans.length, 30);

  /* Academic year narrows through the appointment history. */
  const oldestYear = filterEmployeeRecords(records, {
    schoolYear: "2020-2021",
  });
  assert.strictEqual(oldestYear.length, 848);
  assert.ok(oldestYear.every((record) => record.years.includes("2020-2021")));

  const currentYear = filterEmployeeRecords(records, {
    schoolYear: "2024-2025",
  });
  assert.strictEqual(currentYear.length, 1016);

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
  assert.strictEqual(regular.length, 494);

  const guards = filterEmployeeRecords(records, {
    appointmentStatus: "Security Guard",
  });
  assert.strictEqual(guards.length, 38);
  assert.ok(
    guards.every((record) => record.appointmentStatus === "Security Guard"),
  );
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
