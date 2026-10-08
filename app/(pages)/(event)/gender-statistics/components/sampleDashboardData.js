/**
 * Sample-data mirror of GET /api/analytics/dashboard.
 *
 * The role dashboards (president, planning director, admin and dean) all render
 * the same snapshot / gender panel / demographics payload the API returns. When
 * their "Sample data" toggle is on, this module rebuilds that payload from the
 * named sample profiles in sampleProfileRecords.js,
 * applying the same filters the API accepts so every card and chart keeps its
 * shape without touching the database.
 *
 * Two deliberate differences from the live route, both documented on the
 * functions below:
 *   - employees are matched on the school year through their appointment
 *     history (the sample stores years, not terms), so a semester filter
 *     narrows students only;
 *   - the sample only holds Female / Male sexes, so the "Other" gender bucket
 *     stays at zero.
 */

import {
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_PROFILE_RECORDS as SAMPLE_STUDENT_RECORDS,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS as SAMPLE_EMPLOYEE_RECORDS,
} from "./sampleProfileRecords.js";
import { APPOINTMENT_ORDER, CATEGORY_ORDER } from "./employeeStats.js";

const UNKNOWN = "Unknown";

export const SAMPLE_SEMESTERS = ["1st", "2nd", "Summer"];

/* School years newest first, the order the live filters API returns them in. */
export const SAMPLE_DASHBOARD_SCHOOL_YEARS = [...SAMPLE_SCHOOL_YEARS].reverse();

/* What the "showing sample data" banner reports. */
export const SAMPLE_DASHBOARD_POPULATION = {
  students: SAMPLE_STUDENT_RECORDS.length,
  employees: SAMPLE_EMPLOYEE_RECORDS.length,
};

/* Same ranking the API uses for year levels. */
const SORT_YEAR_ORDER = [
  "grade 11",
  "grade 12",
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
  "graduate",
  "graduates",
  "unknown",
];

function rankYearLevel(name) {
  const n = `${name || ""}`.trim().toLowerCase();
  const i = SORT_YEAR_ORDER.findIndex((t) => n === t || n.includes(t));
  return i === -1 ? SORT_YEAR_ORDER.length : i;
}

/* Identical to the API's age computation, so sample and live buckets line up. */
function calcAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age < 0 ? null : age;
}

function countToRows(counts) {
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function addGender(groups, cat, gender) {
  if (!groups[cat]) groups[cat] = { name: cat, Male: 0, Female: 0, Other: 0 };
  groups[cat][gender] = (groups[cat][gender] || 0) + 1;
}

/* Same three-bucket rule the API applies to sex at birth. */
function normalizeGender(value) {
  const s = String(value || "").toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

/**
 * Filter-option lists matching the live /api/analytics/filters response, built
 * from the sample dataset so every dropdown offered in sample mode can actually
 * match records.
 */
export function sampleDashboardFilterOptions() {
  const colleges = new Set();
  SAMPLE_STUDENT_RECORDS.forEach((record) => {
    if (record.college) colleges.add(record.college);
  });
  SAMPLE_EMPLOYEE_RECORDS.forEach((record) => {
    if (record.office) colleges.add(record.office);
  });

  const yearLevels = new Set();
  SAMPLE_STUDENT_RECORDS.forEach((record) => {
    if (record.yearLevel) yearLevels.add(record.yearLevel);
  });

  return {
    schoolYears: [...SAMPLE_DASHBOARD_SCHOOL_YEARS],
    semesters: [...SAMPLE_SEMESTERS],
    collegeOptions: [...colleges].sort((a, b) => a.localeCompare(b)),
    yearLevelOptions: [...yearLevels].sort((a, b) => a.localeCompare(b)),
    sexOptions: ["Female", "Male"],
    /* The sample's personnel categories stand in for the live employment
       statuses, and its appointment statuses for the live appointment column. */
    employmentStatuses: [...CATEGORY_ORDER],
    appointmentStatuses: [...APPOINTMENT_ORDER],
  };
}

/* ---------- Matching (mirrors the API's $match stages) -------------------- */

/* Students are narrowed through their term history, exactly like the live
   ProfileTerm lookup. They have no employment columns, so an employment or
   appointment filter excludes them - their live profiles fail the same match. */
function studentMatches(record, filters) {
  if (filters.college && record.college !== filters.college) return false;
  if (filters.year_level && record.yearLevel !== filters.year_level) {
    return false;
  }
  if (filters.employment || filters.appointment) return false;
  if (filters.school_year || filters.semester) {
    const terms = record.terms || [];
    const enrolled = terms.some(
      (term) =>
        (!filters.school_year || term.school_year === filters.school_year) &&
        (!filters.semester || term.semester === filters.semester),
    );
    if (!enrolled) return false;
  }
  return true;
}

/* Employees are narrowed through their appointment history; the sample stores
   one entry per school year, so a semester filter narrows students only. They
   have no academic year level, which excludes them when one is chosen. */
function employeeMatches(record, filters) {
  if (filters.college && record.office !== filters.college) return false;
  if (filters.year_level) return false;
  if (filters.employment && record.personnelType !== filters.employment) {
    return false;
  }
  if (filters.appointment && record.appointmentStatus !== filters.appointment) {
    return false;
  }
  if (
    filters.school_year &&
    !(record.years || []).includes(filters.school_year)
  ) {
    return false;
  }
  return true;
}


/**
 * Build the dashboard payload - same keys as GET /api/analytics/dashboard -
 * from the sample records under the same filter names the live request uses:
 * college, school_year, semester, sex, person_type, year_level, employment and
 * appointment.
 */
export function buildSampleDashboardData(filters = {}) {
  const f = {
    college: filters.college || "",
    school_year: filters.school_year || "",
    semester: filters.semester || "",
    sex: filters.sex || "",
    person_type: filters.person_type || "",
    year_level: filters.year_level || "",
    employment: filters.employment || "",
    appointment: filters.appointment || "",
  };

  const sexMatches = (record) => !f.sex || record.sex === f.sex;
  const students =
    f.person_type === "Employee"
      ? []
      : SAMPLE_STUDENT_RECORDS.filter(
          (record) => sexMatches(record) && studentMatches(record, f),
        );
  const employees =
    f.person_type === "Student"
      ? []
      : SAMPLE_EMPLOYEE_RECORDS.filter(
          (record) => sexMatches(record) && employeeMatches(record, f),
        );

  let total = 0;
  let femaleCount = 0;
  let maleCount = 0;
  let pwdCount = 0;
  let ipCount = 0;

  const ageCounts = {};
  const civilCounts = {};
  const religionCounts = {};
  const studentCollegeCounts = {};
  const studentCampusCounts = {};
  const studentYearLevelCounts = {};
  const employmentGroups = {};
  const appointmentGroups = {};
  const officeGroups = {};

  let genderFemale = 0;
  let genderMale = 0;
  const prefCounts = { Male: 0, Female: 0, "LGBTQIA+": 0 };
  let unspecifiedCount = 0;

  const empPrefCounts = { Male: 0, Female: 0, "LGBTQIA+": 0 };
  let empUnspecifiedCount = 0;
  let empFemale = 0;
  let empMale = 0;

  const studentYearGender = {};
  const studentProgramCounts = {};
  const studentYearCourse = {};

  const gender = (record) => normalizeGender(record.sex);

  /* Snapshot, gender panel and the shared demographics count every filtered
     record, students and employees alike - same as the live loop. */
  [...students, ...employees].forEach((record) => {
    total += 1;
    if (record.sex === "Female") femaleCount += 1;
    if (record.sex === "Male") maleCount += 1;
    if (record.pwd === true) pwdCount += 1;
    if (record.indigenous === true) ipCount += 1;

    if (record.sex === "Female") genderFemale += 1;
    if (record.sex === "Male") genderMale += 1;
    const pref = record.genderIdentity;
    if (pref === "Male") prefCounts.Male += 1;
    else if (pref === "Female") prefCounts.Female += 1;
    else if (pref === "LGBTQIA+") prefCounts["LGBTQIA+"] += 1;
    else unspecifiedCount += 1;

    const age = calcAge(record.birthday);
    if (age !== null) {
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}–${bucket + 9}`;
      ageCounts[label] = (ageCounts[label] || 0) + 1;
    }

    const civil = record.civilStatus || UNKNOWN;
    civilCounts[civil] = (civilCounts[civil] || 0) + 1;

    const religion = record.religion || UNKNOWN;
    religionCounts[religion] = (religionCounts[religion] || 0) + 1;
  });

  students.forEach((record) => {
    const collegeName = record.college || UNKNOWN;
    studentCollegeCounts[collegeName] =
      (studentCollegeCounts[collegeName] || 0) + 1;
    const campus = record.campus || UNKNOWN;
    studentCampusCounts[campus] = (studentCampusCounts[campus] || 0) + 1;

    const year = record.yearLevel || UNKNOWN;
    studentYearLevelCounts[year] = (studentYearLevelCounts[year] || 0) + 1;

    if (!studentYearGender[year]) {
      studentYearGender[year] = {
        label: year,
        Female: 0,
        Male: 0,
        Other: 0,
        total: 0,
      };
    }
    studentYearGender[year][gender(record)] =
      (studentYearGender[year][gender(record)] || 0) + 1;
    studentYearGender[year].total += 1;

    const program = record.course || UNKNOWN;
    studentProgramCounts[program] = (studentProgramCounts[program] || 0) + 1;

    if (!studentYearCourse[year]) studentYearCourse[year] = { name: year };
    studentYearCourse[year][program] =
      (studentYearCourse[year][program] || 0) + 1;
  });


  employees.forEach((record) => {
    const empStatus = record.personnelType || UNKNOWN;
    addGender(employmentGroups, empStatus, gender(record));
    const appt = record.appointmentStatus || UNKNOWN;
    addGender(appointmentGroups, appt, gender(record));
    const office = record.office || UNKNOWN;
    addGender(officeGroups, office, gender(record));

    if (record.sex === "Female") empFemale += 1;
    if (record.sex === "Male") empMale += 1;
    const empPref = record.genderIdentity;
    if (empPref === "Male") empPrefCounts.Male += 1;
    else if (empPref === "Female") empPrefCounts.Female += 1;
    else if (empPref === "LGBTQIA+") empPrefCounts["LGBTQIA+"] += 1;
    else empUnspecifiedCount += 1;
  });

  const preferenceRows = [
    { name: "Male", value: prefCounts.Male },
    { name: "Female", value: prefCounts.Female },
    { name: "LGBTQIA+", value: prefCounts["LGBTQIA+"] },
  ];

  const empPreferenceRows = [
    { name: "Male", value: empPrefCounts.Male },
    { name: "Female", value: empPrefCounts.Female },
    { name: "LGBTQIA+", value: empPrefCounts["LGBTQIA+"] },
  ];

  const studentYearGenderData = Object.values(studentYearGender).sort(
    (a, b) => rankYearLevel(a.label) - rankYearLevel(b.label),
  );

  const studentYearCourseData = Object.values(studentYearCourse).sort(
    (a, b) => rankYearLevel(a.name) - rankYearLevel(b.name),
  );

  const courseKeys = [
    ...new Set(
      studentYearCourseData.flatMap((row) =>
        Object.keys(row).filter((key) => key !== "name"),
      ),
    ),
  ].sort();

  return {
    snapshot: {
      total,
      femaleCount,
      maleCount,
      pwdCount,
      ipCount,
    },
    genderPanel: {
      genderData: [
        { name: "Female", value: genderFemale },
        { name: "Male", value: genderMale },
      ],
      preferenceData:
        unspecifiedCount > 0
          ? [
              ...preferenceRows,
              { name: "Not specified", value: unspecifiedCount },
            ]
          : preferenceRows,
    },
    studentYearGenderData,
    studentProgramData: countToRows(studentProgramCounts),
    studentYearCourseData,
    courseKeys,
    employeeGenderPanel: {
      genderData: [
        { name: "Female", value: empFemale },
        { name: "Male", value: empMale },
      ],
      preferenceData:
        empUnspecifiedCount > 0
          ? [
              ...empPreferenceRows,
              { name: "Not specified", value: empUnspecifiedCount },
            ]
          : empPreferenceRows,
    },
    demographics: {
      ageData: Object.entries(ageCounts)
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([name, value]) => ({ name, value })),
      civilData: countToRows(civilCounts),
      religionData: countToRows(religionCounts),
      studentCollegeData: countToRows(studentCollegeCounts),
      studentCampusData: countToRows(studentCampusCounts),
      studentYearLevelData: countToRows(studentYearLevelCounts).sort(
        (a, b) => rankYearLevel(a.name) - rankYearLevel(b.name),
      ),
      employmentData: Object.values(employmentGroups),
      appointmentData: Object.values(appointmentGroups),
      employeeOfficeData: Object.values(officeGroups),
    },
  };
}

