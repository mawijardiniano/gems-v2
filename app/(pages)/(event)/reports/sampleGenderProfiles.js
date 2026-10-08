import {
  SAMPLE_EMPLOYEE_PROFILE_COUNT as SAMPLE_EMPLOYEE_COUNT,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS as SAMPLE_EMPLOYEE_RECORDS,
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_PROFILE_COUNT as SAMPLE_STUDENT_COUNT,
  SAMPLE_STUDENT_PROFILE_RECORDS as SAMPLE_STUDENT_RECORDS,
} from "../gender-statistics/components/sampleProfileRecords.js";
import {
  computeEmployeeStats,
  filterEmployeeRecords,
} from "../gender-statistics/components/employeeStats.js";
import {
  REPORT_KINDS,
  generateQuickReport,
  quickReportFilename,
} from "../gender-statistics/components/quickReports.js";
import {
  computeStudentStats,
  filterStudentRecords,
} from "../gender-statistics/components/studentStats.js";
import {
  STUDENT_REPORT_KINDS,
  generateStudentQuickReport,
  studentReportFilename,
} from "../gender-statistics/components/quickReportsStudents.js";

export const SAMPLE_GENDER_PROFILE_TYPES = ["students", "employees"];

export const SAMPLE_QUICK_REPORTS = {
  students: {
    source: "students",
    kind: STUDENT_REPORT_KINDS.STUDENT_PROFILE,
    label: "Gender Profile (Students)",
  },
  employees: {
    source: "employees",
    kind: REPORT_KINDS.PROFILES,
    label: "Gender Profile (Employees)",
  },
  "employees-position-level": {
    source: "employees",
    kind: REPORT_KINDS.POSITION_LEVEL,
    label: "Personnel by Position Level",
  },
  "employees-gender-gap": {
    source: "employees",
    kind: REPORT_KINDS.GENDER_GAP,
    label: "Gender Gap Analysis (Faculty & Personnel)",
  },
  "students-enrollment": {
    source: "students",
    kind: STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM,
    label: "Enrollment by Program",
  },
  "students-gender-gap": {
    source: "students",
    kind: STUDENT_REPORT_KINDS.GENDER_GAP,
    label: "Gender Gap Analysis (Students)",
  },
  "students-intersectional": {
    source: "students",
    kind: STUDENT_REPORT_KINDS.INTERSECTIONAL,
    label: "Intersectional Analysis",
  },
  "students-multi-year": {
    source: "students",
    kind: STUDENT_REPORT_KINDS.MULTI_YEAR,
    label: "Comparative Multi-Year Enrollment",
    /* A comparison across the whole sample window: narrowing it to a single
       academic year leaves one row and nothing to compare. */
    allYears: true,
  },
};

export const isSampleGenderProfile = (type) =>
  SAMPLE_GENDER_PROFILE_TYPES.includes(type);

export const isSampleQuickReport = (type) => Boolean(SAMPLE_QUICK_REPORTS[type]);

/* Reports that always span the whole sample window, so the academic-year
   filter does not apply to them. */
export const isSampleAllYearsReport = (type) =>
  Boolean(SAMPLE_QUICK_REPORTS[type]?.allYears);

/* The academic year a sample report is built with: the whole window ("") for
   the all-years reports, otherwise the selected year - and the whole window
   again when nothing (or an unknown year) is selected. */
export const resolvedSampleSchoolYear = (type, schoolYear = "") =>
  isSampleAllYearsReport(type) ? "" : sampleReportSchoolYear(schoolYear);

const NUM = (value) => value.toLocaleString("en-US");

export const SAMPLE_REPORT_SCHOOL_YEARS = [...SAMPLE_SCHOOL_YEARS];

/* Semesters the sample term history actually carries (1st, 2nd, Summer),
   listed in the canonical order the statistics modules use and derived from
   the records so the reports can never drift from the generator. */
export const SAMPLE_REPORT_SEMESTERS = ["1st", "2nd", "Summer"].filter(
  (semester) =>
    SAMPLE_STUDENT_RECORDS.some((record) =>
      (record.terms || []).some((term) => term.semester === semester),
    ),
);

export function sampleReportSchoolYear(schoolYear = "") {
  return SAMPLE_REPORT_SCHOOL_YEARS.includes(schoolYear) ? schoolYear : "";
}

/* Only the semesters the sample data has; anything else reads as no
   selection. */
export function sampleReportSemester(semester = "") {
  return SAMPLE_REPORT_SEMESTERS.includes(semester) ? semester : "";
}

/* The semester a sample report is built with: all semesters ("") for the
   all-years report, otherwise the selected one - and all semesters again when
   nothing (or an unknown value) is selected. Employee reports never carry a
   semester because the personnel history has no semester dimension. */
export const resolvedSampleSemester = (type, semester = "") =>
  isSampleAllYearsReport(type) ? "" : sampleReportSemester(semester);

export function sampleGenderProfileSummary(
  type,
  schoolYear = "",
  semester = "",
) {
  const base =
    type === "employees"
      ? `Sample dataset - ${NUM(SAMPLE_EMPLOYEE_COUNT)} employees (university-wide)`
      : `Sample dataset - ${NUM(SAMPLE_STUDENT_COUNT)} students (university-wide)`;
  const year = sampleReportSchoolYear(schoolYear);
  if (type === "employees") {
    /* Employees have no semester history - the year is all they can carry. */
    return year ? `${base} | Academic Year: ${year}` : base;
  }
  const parts = [];
  if (year) parts.push(`Academic Year: ${year}`);
  const term = sampleReportSemester(semester);
  if (term) parts.push(`Semester: ${term}`);
  return parts.length ? `${base}; ${parts.join("; ")}` : base;
}

export function sampleReportRecords(source, filters = {}) {
  const schoolYear = sampleReportSchoolYear(filters.schoolYear);
  if (source === "employees") {
    return filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, { schoolYear });
  }
  /* Students also narrow by semester through the term history. */
  const semester = sampleReportSemester(filters.semester);
  return filterStudentRecords(SAMPLE_STUDENT_RECORDS, { schoolYear, semester });
}

export function sampleReportData(source, filters = {}) {
  const records = sampleReportRecords(source, filters);
  return source === "employees"
    ? computeEmployeeStats(records, SAMPLE_EMPLOYEE_RECORDS)
    : computeStudentStats(records, SAMPLE_STUDENT_RECORDS);
}

function sampleReportFilename(entry) {
  return entry.source === "employees"
    ? quickReportFilename(entry.kind, true)
    : studentReportFilename(entry.kind, true);
}

export async function generateSampleQuickReport(type, filters = {}) {
  const entry = SAMPLE_QUICK_REPORTS[type];
  if (!entry) throw new Error(`Unknown gender profile type: ${type}`);
  const schoolYear = resolvedSampleSchoolYear(type, filters.schoolYear);
  const semester = resolvedSampleSemester(type, filters.semester);
  const options = {
    isSample: true,
    filterSummary: sampleGenderProfileSummary(entry.source, schoolYear, semester),
  };
  return entry.source === "employees"
    ? generateQuickReport(
        entry.kind,
        sampleReportData("employees", { schoolYear }),
        options,
      )
    : generateStudentQuickReport(
        entry.kind,
        sampleReportData("students", { schoolYear, semester }),
        options,
      );
}

export async function generateSampleGenderProfile(type, filters = {}) {
  return generateSampleQuickReport(type, filters);
}

export async function downloadSampleQuickReport(type, filters = {}) {
  const entry = SAMPLE_QUICK_REPORTS[type];
  if (!entry) throw new Error(`Unknown gender profile type: ${type}`);
  const doc = await generateSampleQuickReport(type, filters);
  doc.save(sampleReportFilename(entry));
  return doc;
}

export async function downloadSampleGenderProfile(type, filters = {}) {
  return downloadSampleQuickReport(type, filters);
}