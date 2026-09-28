import { test } from "node:test";
import assert from "node:assert";

import { REPORT_KINDS } from "../app/(pages)/(event)/gender-statistics/components/quickReports.js";
import {
  STUDENT_REPORT_KINDS,
  buildYearOverYearTable,
} from "../app/(pages)/(event)/gender-statistics/components/quickReportsStudents.js";
import {
  SAMPLE_GENDER_PROFILE_TYPES,
  SAMPLE_QUICK_REPORTS,
  SAMPLE_REPORT_SCHOOL_YEARS,
  SAMPLE_REPORT_SEMESTERS,
  downloadSampleGenderProfile,
  downloadSampleQuickReport,
  generateSampleGenderProfile,
  generateSampleQuickReport,
  isSampleAllYearsReport,
  isSampleGenderProfile,
  isSampleQuickReport,
  resolvedSampleSchoolYear,
  resolvedSampleSemester,
  sampleGenderProfileSummary,
  sampleReportData,
  sampleReportRecords,
  sampleReportSchoolYear,
  sampleReportSemester,
} from "../app/(pages)/(event)/reports/sampleGenderProfiles.js";
import { SAMPLE_EMPLOYEE_COUNT } from "../app/(pages)/(event)/gender-statistics/components/employeeSampleRecords.js";
import { SAMPLE_STUDENT_COUNT } from "../app/(pages)/(event)/gender-statistics/components/studentSampleRecords.js";

/* The Reports module (…/reports/content.jsx) renders its sample-based reports
   in the browser with these helpers instead of the live APIs, so the PDFs stay
   complete even when the database holds little data. */

test("isSampleGenderProfile: only the two gender profiles use sample data", () => {
  assert.deepStrictEqual(SAMPLE_GENDER_PROFILE_TYPES, ["students", "employees"]);
  assert.ok(isSampleGenderProfile("students"));
  assert.ok(isSampleGenderProfile("employees"));
  for (const other of ["gar", "gpb-matrix", "milestones", "projects-events", "", undefined]) {
    assert.ok(!isSampleGenderProfile(other));
  }
});

test("SAMPLE_QUICK_REPORTS: one registry entry per sample-backed report type", () => {
  assert.deepStrictEqual(Object.keys(SAMPLE_QUICK_REPORTS).sort(), [
    "employees",
    "employees-gender-gap",
    "employees-position-level",
    "students",
    "students-enrollment",
    "students-gender-gap",
    "students-intersectional",
    "students-multi-year",
  ]);

  for (const entry of Object.values(SAMPLE_QUICK_REPORTS)) {
    assert.ok(entry.kind, "every entry maps to a quick-report kind");
    assert.ok(entry.label, "every entry carries a display label");
    assert.ok(
      ["employees", "students"].includes(entry.source),
      "every entry names its sample dataset",
    );
  }

  assert.strictEqual(
    SAMPLE_QUICK_REPORTS.students.kind,
    STUDENT_REPORT_KINDS.STUDENT_PROFILE,
  );
  assert.strictEqual(SAMPLE_QUICK_REPORTS.employees.kind, REPORT_KINDS.PROFILES);
  assert.strictEqual(
    SAMPLE_QUICK_REPORTS["employees-position-level"].kind,
    REPORT_KINDS.POSITION_LEVEL,
  );
  assert.strictEqual(
    SAMPLE_QUICK_REPORTS["employees-gender-gap"].kind,
    REPORT_KINDS.GENDER_GAP,
  );
  assert.strictEqual(
    SAMPLE_QUICK_REPORTS["students-enrollment"].kind,
    STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM,
  );
  assert.strictEqual(
    SAMPLE_QUICK_REPORTS["students-gender-gap"].kind,
    STUDENT_REPORT_KINDS.GENDER_GAP,
  );
  assert.strictEqual(
    SAMPLE_QUICK_REPORTS["students-intersectional"].kind,
    STUDENT_REPORT_KINDS.INTERSECTIONAL,
  );
  assert.strictEqual(
    SAMPLE_QUICK_REPORTS["students-multi-year"].kind,
    STUDENT_REPORT_KINDS.MULTI_YEAR,
  );

  /* Only the comparative multi-year report always spans every sample year. */
  assert.strictEqual(SAMPLE_QUICK_REPORTS["students-multi-year"].allYears, true);
  for (const [type, entry] of Object.entries(SAMPLE_QUICK_REPORTS)) {
    if (type === "students-multi-year") continue;
    assert.ok(!entry.allYears, `${type} must keep the academic-year filter`);
  }
});

test("isSampleQuickReport: true for every registry entry and nothing else", () => {
  for (const type of Object.keys(SAMPLE_QUICK_REPORTS)) {
    assert.ok(isSampleQuickReport(type));
  }
  for (const other of ["gar", "gpb-matrix", "milestones", "projects-events", "", undefined]) {
    assert.ok(!isSampleQuickReport(other));
  }
});

test("sampleGenderProfileSummary: names the sample dataset and its size", () => {
  assert.strictEqual(
    sampleGenderProfileSummary("employees"),
    "Sample dataset - 1,016 employees (university-wide)",
  );
  assert.strictEqual(
    sampleGenderProfileSummary("students"),
    "Sample dataset - 3,425 students (university-wide)",
  );
});

test("SAMPLE_REPORT_SCHOOL_YEARS: the five-year window the sample data covers", () => {
  assert.deepStrictEqual(SAMPLE_REPORT_SCHOOL_YEARS, [
    "2020-2021",
    "2021-2022",
    "2022-2023",
    "2023-2024",
    "2024-2025",
  ]);
});

test("sampleReportSchoolYear: only years the sample data has are applied", () => {
  assert.strictEqual(sampleReportSchoolYear("2023-2024"), "2023-2024");
  /* A live year the sample window does not cover reads as no selection. */
  for (const other of ["", "2026-2027", null, undefined]) {
    assert.strictEqual(sampleReportSchoolYear(other), "");
  }
});

test("SAMPLE_REPORT_SEMESTERS: the terms the sample history carries", () => {
  assert.deepStrictEqual(SAMPLE_REPORT_SEMESTERS, ["1st", "2nd", "Summer"]);
});

test("sampleReportSemester: only semesters the sample data has are applied", () => {
  for (const semester of SAMPLE_REPORT_SEMESTERS) {
    assert.strictEqual(sampleReportSemester(semester), semester);
  }
  /* Anything the term history never carries reads as no selection. */
  for (const other of ["", "3rd", "First", null, undefined]) {
    assert.strictEqual(sampleReportSemester(other), "");
  }
});

test("isSampleAllYearsReport: only the comparative multi-year report has no year filter", () => {
  assert.ok(isSampleAllYearsReport("students-multi-year"));

  for (const other of Object.keys(SAMPLE_QUICK_REPORTS)) {
    if (other === "students-multi-year") continue;
    assert.ok(!isSampleAllYearsReport(other), `${other} must keep the year filter`);
  }
  for (const other of ["gar", "gpb-matrix", "milestones", "projects-events", "", undefined]) {
    assert.ok(!isSampleAllYearsReport(other));
  }
});

test("resolvedSampleSchoolYear: the multi-year report ignores the selected year", () => {
  assert.strictEqual(resolvedSampleSchoolYear("students-multi-year", "2020-2021"), "");
  assert.strictEqual(resolvedSampleSchoolYear("students", "2020-2021"), "2020-2021");
  /* An unknown year still falls back to the whole window, exactly as before. */
  assert.strictEqual(resolvedSampleSchoolYear("employees", "2026-2027"), "");

  /* Built while a year is selected for another report, the multi-year report
     must keep the whole-sample figures. The year filter keeps only that year's
     cohort, and because the year table is rebuilt from each student's term
     history, that cohort would skew every later year of the comparison. */
  const full = sampleReportData("students");
  const resolved = sampleReportData("students", {
    schoolYear: resolvedSampleSchoolYear("students-multi-year", "2020-2021"),
  });
  assert.deepStrictEqual(resolved.byAcademicYear, full.byAcademicYear);
  assert.strictEqual(resolved.totals.total, SAMPLE_STUDENT_COUNT);

  const skewed = sampleReportData("students", { schoolYear: "2020-2021" });
  assert.notDeepStrictEqual(skewed.byAcademicYear, full.byAcademicYear);

  /* With every year present, the year-over-year table keeps its change columns
     and its average row. */
  const { body } = buildYearOverYearTable(resolved.byAcademicYear);
  assert.strictEqual(body.length, SAMPLE_REPORT_SCHOOL_YEARS.length + 1);
  assert.strictEqual(body[0][5], "-");
  assert.notStrictEqual(body[1][5], "-");
});

test("resolvedSampleSemester: the multi-year report ignores the selected semester", () => {
  assert.strictEqual(resolvedSampleSemester("students-multi-year", "2nd"), "");
  assert.strictEqual(resolvedSampleSemester("students", "2nd"), "2nd");
  /* An unknown value still falls back to all semesters, exactly as before. */
  assert.strictEqual(resolvedSampleSemester("students", "3rd"), "");

  /* Built while a semester is selected for another report, the multi-year
     report must keep the whole-sample figures. */
  const full = sampleReportData("students");
  const resolved = sampleReportData("students", {
    schoolYear: resolvedSampleSchoolYear("students-multi-year", "2022-2023"),
    semester: resolvedSampleSemester("students-multi-year", "1st"),
  });
  assert.deepStrictEqual(resolved.byAcademicYear, full.byAcademicYear);
  assert.strictEqual(resolved.totals.total, SAMPLE_STUDENT_COUNT);

  /* The same selection applied to a single-year student report does narrow. */
  const narrowed = sampleReportData("students", {
    schoolYear: "2024-2025",
    semester: "Summer",
  });
  assert.strictEqual(narrowed.totals.total, 202);
  assert.notDeepStrictEqual(narrowed.byAcademicYear, full.byAcademicYear);
});

test("sampleReportRecords: a year narrows each dataset to that snapshot", () => {
  assert.strictEqual(sampleReportRecords("students").length, SAMPLE_STUDENT_COUNT);
  assert.strictEqual(sampleReportRecords("employees").length, SAMPLE_EMPLOYEE_COUNT);

  for (const year of SAMPLE_REPORT_SCHOOL_YEARS) {
    const students = sampleReportRecords("students", { schoolYear: year });
    assert.ok(students.length > 0, `no sample students enrolled in ${year}`);
    assert.ok(
      students.every((record) =>
        record.terms.some((term) => term.school_year === year),
      ),
      `a student outside ${year} survived the filter`,
    );

    const employees = sampleReportRecords("employees", { schoolYear: year });
    assert.ok(employees.length > 0, `no sample employees on board in ${year}`);
    assert.ok(
      employees.every((record) => record.years.includes(year)),
      `an employee outside ${year} survived the filter`,
    );
  }
});

test("sampleReportRecords: a semester narrows the student term history", () => {
  const year = "2022-2023";
  const yearOnly = sampleReportRecords("students", { schoolYear: year });
  assert.strictEqual(yearOnly.length, 3185);

  const subsets = {
    "1st": sampleReportRecords("students", { schoolYear: year, semester: "1st" }),
    "2nd": sampleReportRecords("students", { schoolYear: year, semester: "2nd" }),
    Summer: sampleReportRecords("students", { schoolYear: year, semester: "Summer" }),
  };

  assert.strictEqual(subsets["1st"].length, 3179);
  assert.strictEqual(subsets["2nd"].length, 2878);
  assert.strictEqual(subsets.Summer.length, 182);

  for (const [semester, records] of Object.entries(subsets)) {
    records.forEach((record) => {
      assert.ok(
        record.terms.some(
          (term) => term.school_year === year && term.semester === semester,
        ),
        `a student without a ${semester} term in ${year} survived the filter`,
      );
    });
  }

  /* Every semester narrows, and the three terms together cover the year. */
  const union = new Set(
    Object.values(subsets)
      .flat()
      .map((record) => record.id),
  );
  assert.strictEqual(union.size, 3185);

  /* Employees have no semester dimension: passing one changes nothing. */
  assert.deepStrictEqual(
    sampleReportRecords("employees", { schoolYear: year, semester: "2nd" }),
    sampleReportRecords("employees", { schoolYear: year }),
  );
});

test("sampleReportData: the year narrows the figures and keeps every option", () => {
  const allStudents = sampleReportData("students");
  assert.strictEqual(allStudents.totals.total, SAMPLE_STUDENT_COUNT);

  const oldest = sampleReportData("students", { schoolYear: "2020-2021" });
  assert.ok(oldest.totals.total > 0);
  assert.ok(oldest.totals.total < allStudents.totals.total);

  /* The year select must keep every choice even while one year is selected. */
  assert.deepStrictEqual(oldest.schoolYears, allStudents.schoolYears);

  const employees = sampleReportData("employees", { schoolYear: "2024-2025" });
  assert.ok(employees.totals.total > 0);
  assert.ok(employees.totals.total <= SAMPLE_EMPLOYEE_COUNT);

  /* An unknown year falls back to the whole window instead of emptying out. */
  assert.strictEqual(
    sampleReportData("students", { schoolYear: "2026-2027" }).totals.total,
    SAMPLE_STUDENT_COUNT,
  );
});

test("sampleReportData: a semester narrows the figures and keeps every option", () => {
  const allStudents = sampleReportData("students");
  const summer = sampleReportData("students", {
    schoolYear: "2024-2025",
    semester: "Summer",
  });

  assert.strictEqual(summer.totals.total, 202);
  assert.ok(summer.totals.total < allStudents.totals.total);

  /* The option lists must survive the semester filter, exactly like the year
     list does, otherwise the filter can never be widened again. */
  assert.deepStrictEqual(summer.schoolYears, allStudents.schoolYears);
  assert.deepStrictEqual(summer.semesters, SAMPLE_REPORT_SEMESTERS);
});

test("sampleGenderProfileSummary: appends the selected academic year", () => {
  assert.strictEqual(
    sampleGenderProfileSummary("employees", "2022-2023"),
    "Sample dataset - 1,016 employees (university-wide) | Academic Year: 2022-2023",
  );
  assert.strictEqual(
    sampleGenderProfileSummary("students", "2022-2023"),
    "Sample dataset - 3,425 students (university-wide); Academic Year: 2022-2023",
  );
  assert.strictEqual(
    sampleGenderProfileSummary("students", "2026-2027"),
    "Sample dataset - 3,425 students (university-wide)",
  );
});

test("sampleGenderProfileSummary: appends the selected semester for students", () => {
  assert.strictEqual(
    sampleGenderProfileSummary("students", "2022-2023", "2nd"),
    "Sample dataset - 3,425 students (university-wide); Academic Year: 2022-2023; Semester: 2nd",
  );
  assert.strictEqual(
    sampleGenderProfileSummary("students", "", "Summer"),
    "Sample dataset - 3,425 students (university-wide); Semester: Summer",
  );
  /* An unknown semester is not named, and employees never carry one. */
  assert.strictEqual(
    sampleGenderProfileSummary("students", "2022-2023", "3rd"),
    "Sample dataset - 3,425 students (university-wide); Academic Year: 2022-2023",
  );
  assert.strictEqual(
    sampleGenderProfileSummary("employees", "2022-2023", "2nd"),
    "Sample dataset - 1,016 employees (university-wide) | Academic Year: 2022-2023",
  );
});

for (const type of Object.keys(SAMPLE_QUICK_REPORTS)) {
  test(`generateSampleQuickReport: renders a complete "${type}" PDF`, async () => {
    const doc = await generateSampleQuickReport(type);
    const buffer = Buffer.from(doc.output("arraybuffer"));

    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
    assert.ok(buffer.length > 2000, "PDF should not be empty");
    assert.ok(doc.getNumberOfPages() >= 1);
  });
}

test("generateSampleQuickReport: renders a year-narrowed PDF for every profile", async () => {
  for (const type of SAMPLE_GENDER_PROFILE_TYPES) {
    const doc = await generateSampleQuickReport(type, {
      schoolYear: "2020-2021",
    });
    const buffer = Buffer.from(doc.output("arraybuffer"));

    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
    assert.ok(buffer.length > 2000, "PDF should not be empty");
  }
});

test("generateSampleQuickReport: renders a year-and-semester PDF for student reports", async () => {
  const studentReports = [
    "students",
    "students-enrollment",
    "students-gender-gap",
    "students-intersectional",
  ];
  for (const type of studentReports) {
    const doc = await generateSampleQuickReport(type, {
      schoolYear: "2024-2025",
      semester: "2nd",
    });
    const buffer = Buffer.from(doc.output("arraybuffer"));

    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
    assert.ok(buffer.length > 2000, "PDF should not be empty");
  }
});

test("generateSampleGenderProfile: still renders the two original profiles", async () => {
  for (const type of SAMPLE_GENDER_PROFILE_TYPES) {
    const doc = await generateSampleGenderProfile(type);
    const buffer = Buffer.from(doc.output("arraybuffer"));
    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
  }
});

test("generateSampleQuickReport: rejects types without a sample report", async () => {
  await assert.rejects(
    () => generateSampleQuickReport("gar"),
    /Unknown gender profile type/,
  );
});

test("download helpers: exposed for the reports page buttons", () => {
  assert.strictEqual(typeof downloadSampleGenderProfile, "function");
  assert.strictEqual(typeof downloadSampleQuickReport, "function");
});