import {
  SAMPLE_EMPLOYEE_COUNT,
  SAMPLE_EMPLOYEE_RECORDS,
} from "../gender-statistics/components/employeeSampleRecords.js";
import { computeEmployeeStats } from "../gender-statistics/components/employeeStats.js";
import {
  REPORT_KINDS,
  generateQuickReport,
  quickReportFilename,
} from "../gender-statistics/components/quickReports.js";
import {
  SAMPLE_STUDENT_COUNT,
  SAMPLE_STUDENT_RECORDS,
} from "../gender-statistics/components/studentSampleRecords.js";
import { computeStudentStats } from "../gender-statistics/components/studentStats.js";
import {
  STUDENT_REPORT_KINDS,
  generateStudentQuickReport,
  studentReportFilename,
} from "../gender-statistics/components/quickReportsStudents.js";

/* The Reports module shows two gender profiles that must never be rendered
   from the partially-filled live database. They reuse the Quick Reports from
   Gender Statistics → Employees / Students (Personnel Profile and Student
   Gender Profile), built in the browser from the same deterministic sample
   datasets, so every figure is complete and the PDF is stamped "Sample data". */

export const SAMPLE_GENDER_PROFILE_TYPES = ["students", "employees"];

export const isSampleGenderProfile = (type) =>
  SAMPLE_GENDER_PROFILE_TYPES.includes(type);

/* Locale is pinned so the "Filters applied" line is identical everywhere. */
const NUM = (value) => value.toLocaleString("en-US");

/** "Filters applied" line printed on the generated PDF. */
export function sampleGenderProfileSummary(type) {
  return type === "employees"
    ? `Sample dataset - ${NUM(SAMPLE_EMPLOYEE_COUNT)} employees (university-wide)`
    : `Sample dataset - ${NUM(SAMPLE_STUDENT_COUNT)} students (university-wide)`;
}

/**
 * Build (but do not save) the sample gender profile PDF for a report type.
 * Returns the jsPDF document so the caller can preview or save it.
 */
export async function generateSampleGenderProfile(type) {
  if (type === "employees") {
    return generateQuickReport(
      REPORT_KINDS.PROFILES,
      computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS),
      { isSample: true, filterSummary: sampleGenderProfileSummary(type) },
    );
  }
  if (type === "students") {
    return generateStudentQuickReport(
      STUDENT_REPORT_KINDS.STUDENT_PROFILE,
      computeStudentStats(SAMPLE_STUDENT_RECORDS),
      { isSample: true, filterSummary: sampleGenderProfileSummary(type) },
    );
  }
  throw new Error(`Unknown gender profile type: ${type}`);
}

/** Build the sample gender profile PDF and save it to the user's downloads. */
export async function downloadSampleGenderProfile(type) {
  const doc = await generateSampleGenderProfile(type);
  doc.save(
    type === "employees"
      ? quickReportFilename(REPORT_KINDS.PROFILES, true)
      : studentReportFilename(STUDENT_REPORT_KINDS.STUDENT_PROFILE, true),
  );
  return doc;
}
