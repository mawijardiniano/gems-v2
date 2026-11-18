import { ageGroupOf, ageGroupOptions, AGE_GROUP_ORDER } from "./ageGroups.js";
import {
  sexOf,
  emptyCounts,
  addCounts,
  SEXES,
  toList,
  activeFilterCount,
  uniqueFieldOptions,
  GENDER_IDENTITY_ORDER,
  genderIdentityRows,
  pct,
  groupBy,
} from "./statsCore.js";

/* Shared counting helpers live in statsCore.js; re-exported so importers of
   this module keep working unchanged. */
export { sexOf, activeFilterCount, uniqueFieldOptions, GENDER_IDENTITY_ORDER };

export const YEAR_LEVEL_ORDER = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

/* Campuses that host classes (the live page hardcodes the same three). */
export const CAMPUS_ORDER = ["Boac", "Gasan", "Sta. Cruz", "Torrijos"];

/* Student type categories - the same demographic rows the API reports. */
export const STUDENT_TYPE_ORDER = [
  "Scholar",
  "Person with Disability (PWD)",
  "Indigenous Peoples (IP)",
  "Low Income",
  "Middle Income",
  "High Income",
];

/* Display order for the academic-level breakdown. */
export const LEVEL_ORDER = [
  "Undergraduate",
  "Graduate (Masters)",
  "Graduate (Doctoral)",
];

export const EMPTY_STUDENT_FILTERS = {
  campus: [],
  college: [],
  course: [],
  yearLevel: [],
  studentType: "",
  demographics: [],
  schoolYear: "",
  semester: [],
  ageGroups: [],
  sexes: [],
};

/** Demographic Profile category match - the six student types plus Solo Parent
    (sample data only; the live database has no solo parent field). */
export function matchesDemographic(record, category) {
  if (category === "Solo Parent") return record?.soloParent === true;
  return matchesStudentType(record, category);
}

/** Does a record belong to one of the six student type categories? */
export function matchesStudentType(record, studentType) {
  switch (studentType) {
    case "Scholar":
      return record?.scholar === true;
    case "Person with Disability (PWD)":
      return record?.pwd === true;
    case "Indigenous Peoples (IP)":
      return record?.indigenous === true;
    case "Low Income":
    case "Middle Income":
    case "High Income":
      return record?.income === studentType;
    default:
      return true;
  }
}

/** Apply every selected filter - campus, college, program, year level, student
    type and (through the term history) academic year/semester. */
export function filterStudentRecords(records = [], filters = {}) {
  /* Campus / college / program / year level / semester accept either a single
     value (legacy callers) or an array (multi-select UI); either means OR. */
  const toList = (value) =>
    Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const campuses = toList(filters.campus);
  const colleges = toList(filters.college);
  const courses = toList(filters.course);
  const yearLevels = toList(filters.yearLevel);
  const semesters =
    filters.semesters !== undefined ? toList(filters.semesters) : toList(filters.semester);
  const { studentType, schoolYear } = filters;
  const ageGroups = Array.isArray(filters.ageGroups) ? filters.ageGroups : [];
  const sexes = Array.isArray(filters.sexes) ? filters.sexes : [];

  return records.filter((record) => {
    if (sexes.length && !sexes.includes(sexOf(record))) return false;
    if (ageGroups.length && !ageGroups.includes(ageGroupOf(record))) {
      return false;
    }
    if (campuses.length && !campuses.includes(record.campus)) return false;
    if (colleges.length && !colleges.includes(record.college)) return false;
    if (courses.length && !courses.includes(record.course)) return false;
    if (yearLevels.length && !yearLevels.includes(record.yearLevel))
      return false;
    if (studentType && !matchesStudentType(record, studentType)) return false;
    if (
      Array.isArray(filters.demographics) &&
      filters.demographics.length &&
      !filters.demographics.some((d) => matchesDemographic(record, d))
    ) {
      return false;
    }
    if (schoolYear || semesters.length) {
      const terms = record.terms || [];
      const enrolled = terms.some(
        (term) =>
          (!schoolYear || term.school_year === schoolYear) &&
          (!semesters.length || semesters.includes(term.semester)),
      );
      if (!enrolled) return false;
    }
    return true;
  });
}

/* == Aggregation ====================================================== */

/** Same three-bucket rule the API uses for academic level. */
export function studentLevelOf(record) {
  const college = record?.college || "";
  const course = record?.course || "";
  const yearLevel = record?.yearLevel || "";
  const isGraduate = college === "Graduate School" || /graduate/i.test(college);
  const isDoctoral = /doctor/i.test(course) || /doctor/i.test(yearLevel);
  const isMasters =
    !isDoctoral &&
    (isGraduate || /master/i.test(course) || /master/i.test(yearLevel));
  if (isDoctoral) return "Graduate (Doctoral)";
  if (isMasters) return "Graduate (Masters)";
  return "Undergraduate";
}

/** Count each sex once per student type category (categories overlap). */
function studentTypeRows(records, nameKey) {
  return STUDENT_TYPE_ORDER.map((type) => {
    const counts = emptyCounts();
    records.forEach((record) => {
      if (matchesStudentType(record, type)) addCounts(counts, sexOf(record));
    });
    return {
      [nameKey]: type,
      Female: counts.Female,
      Male: counts.Male,
      total: counts.total,
      pctFemale: pct(counts.Female, counts.total),
    };
  });
}

/** Solo parents are a demographic row only - the live API has no field for it
    yet, so it is not offered as a filter. */
function soloParentRow(records) {
  const counts = emptyCounts();
  records.forEach((record) => {
    if (record?.soloParent === true) addCounts(counts, sexOf(record));
  });
  return {
    label: "Solo Parent",
    Female: counts.Female,
    Male: counts.Male,
    total: counts.total,
  };
}

/* The gender-identity values the database stores in gadData.gender_preference.
   "Not specified" is appended only when the dataset has such records. */

/** Every academic year in a dataset, newest first (filter option list). */
function sampleSchoolYears(records = []) {
  const years = new Set();
  records.forEach((record) => {
    (record.terms || []).forEach((term) => years.add(term.school_year));
  });
  return [...years].sort().reverse();
}

/**
 * Build the same response shape as
 * `/api/analytics/gender-statistics?type=students` from sample student
 * records, so the page and its charts work unchanged.
 *
 * `allRecords` feeds the filter option lists (schoolYears, semesters, campuses,
 * yearLevels, studentTypes). The live API does the same: it reports every
 * academic year found in ProfileTerm, not just the years that survive the
 * filter. Keeping the options unfiltered also lets the page recover when the
 * selected academic year does not exist in the sample dataset (for example a
 * live year such as 2026-2027), instead of getting stuck on an empty result.
 */
export function computeStudentStats(records = [], allRecords = records) {
  const totals = emptyCounts();
  records.forEach((record) => addCounts(totals, sexOf(record)));

  /* LGBTQIA+ is a gender-identity count, not a sex bucket, so it is reported
     beside the Female/Male totals instead of inside them. */
  const lgbtqia = records.filter(
    (record) => record?.genderIdentity === "LGBTQIA+",
  ).length;

  /* Term history: a student counts once per academic year they enrolled in. */
  const perYear = new Map();
  records.forEach((record) => {
    (record.terms || []).forEach((term) => {
      const year = term.school_year;
      if (!perYear.has(year)) {
        perYear.set(year, { counts: emptyCounts(), seen: new Set() });
      }
      const bucket = perYear.get(year);
      if (bucket.seen.has(record.id)) return;
      bucket.seen.add(record.id);
      addCounts(bucket.counts, sexOf(record));
    });
  });

  const byAcademicYear = [...perYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([school_year, bucket]) => ({
      school_year,
      Female: bucket.counts.Female,
      Male: bucket.counts.Male,
      total: bucket.counts.total,
    }));

  const semesterSet = new Set();
  allRecords.forEach((record) => {
    (record.terms || []).forEach((term) => semesterSet.add(term.semester));
  });

  return {
    type: "students",
    sample: true,
    totals: {
      Female: totals.Female,
      Male: totals.Male,
      total: totals.total,
      pctFemale: pct(totals.Female, totals.total),
      pctMale: pct(totals.Male, totals.total),
      lgbtqia,
      pctLgbtqia: pct(lgbtqia, totals.total),
    },
    byCollege: groupBy(records, (r) => r.college, "college"),
    byProgram: groupBy(records, (r) => r.course, "program").slice(0, 10),
    byLevel: groupBy(records, studentLevelOf, "level", LEVEL_ORDER),
    byYearLevel: groupBy(
      records,
      (r) => r.yearLevel,
      "year_level",
      YEAR_LEVEL_ORDER,
    ).filter((row) => row.year_level !== "Unspecified"),
    byAgeGroup: groupBy(
      records,
      (r) => ageGroupOf(r),
      "age_group",
      AGE_GROUP_ORDER,
    ).filter((row) => row.age_group !== "Unspecified"),
    ageGroups: ageGroupOptions(allRecords),
    sexes: SEXES,
    byStudentType: studentTypeRows(records, "type"),
    demographics: [
      ...studentTypeRows(records, "label").map(({ label, Female, Male, total }) => ({
        label,
        Female,
        Male,
        total,
      })),
      soloParentRow(records),
    ],
    byGenderIdentity: genderIdentityRows(records),
    /* Civil status and religion are PII. The live route returns them from the
       vault via `piiBreakdown`; this keeps the same row shape so the cards
       render identically with the sample toggle on. */
    civilData: groupBy(records, (r) => r.civilStatus, "name"),
    religionData: groupBy(records, (r) => r.religion, "name"),
    byAcademicYear,
    schoolYears: sampleSchoolYears(allRecords),
    semesters: ["1st", "2nd", "Summer"].filter((s) => semesterSet.has(s)),
    yearLevels: YEAR_LEVEL_ORDER,
    studentTypes: STUDENT_TYPE_ORDER,
    demographicOptions: [...STUDENT_TYPE_ORDER, "Solo Parent"],
    campuses: CAMPUS_ORDER,
  };
}