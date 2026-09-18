
export const YEAR_LEVEL_ORDER = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

/* Campuses that host classes (the live page hardcodes the same three). */
export const CAMPUS_ORDER = ["Boac", "Gasan", "Sta. Cruz"];

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

const SEXES = ["Female", "Male", "Other"];

export function sexOf(record) {
  return SEXES.includes(record?.sex) ? record.sex : "Other";
}

function emptyCounts() {
  return { Female: 0, Male: 0, Other: 0, total: 0 };
}

function addCounts(bucket, sex) {
  bucket[sex] = (bucket[sex] || 0) + 1;
  bucket.total += 1;
}

function orderIndex(order, value) {
  const idx = order.indexOf(value);
  return idx === -1 ? order.length : idx;
}

function toList(countsObj, nameKey, order) {
  const rows = Object.entries(countsObj).map(([name, c]) => ({
    [nameKey]: name,
    Female: c.Female || 0,
    Male: c.Male || 0,
    Other: c.Other || 0,
    total: c.total || 0,
    pctFemale: c.total ? Math.round(((c.Female || 0) / c.total) * 1000) / 10 : 0,
  }));

  if (order) {
    rows.sort(
      (a, b) =>
        orderIndex(order, a[nameKey]) - orderIndex(order, b[nameKey]) ||
        b.total - a.total,
    );
  } else {
    rows.sort((a, b) => b.total - a.total);
  }
  return rows;
}

/* == Filtering ========================================================= */

export const EMPTY_STUDENT_FILTERS = {
  campus: "",
  college: "",
  course: "",
  yearLevel: "",
  studentType: "",
  schoolYear: "",
  semester: "",
};

export function activeFilterCount(filters = {}) {
  return Object.values(filters).filter(Boolean).length;
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
  const { campus, college, course, yearLevel, studentType, schoolYear, semester } =
    filters;

  return records.filter((record) => {
    if (campus && record.campus !== campus) return false;
    if (college && record.college !== college) return false;
    if (course && record.course !== course) return false;
    if (yearLevel && record.yearLevel !== yearLevel) return false;
    if (studentType && !matchesStudentType(record, studentType)) return false;
    if (schoolYear || semester) {
      const terms = record.terms || [];
      const enrolled = terms.some(
        (term) =>
          (!schoolYear || term.school_year === schoolYear) &&
          (!semester || term.semester === semester),
      );
      if (!enrolled) return false;
    }
    return true;
  });
}

/** Distinct values of a record field, in the order they first appear. */
export function uniqueFieldOptions(records = [], key) {
  const seen = new Set();
  const values = [];
  records.forEach((record) => {
    const value = record?.[key];
    if (!value || seen.has(value)) return;
    seen.add(value);
    values.push(value);
  });
  return values;
}/* == Aggregation ====================================================== */

const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

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

function groupBy(records, keyFn, nameKey, order) {
  const counts = {};
  records.forEach((record) => {
    const key = keyFn(record) || "Unspecified";
    if (!counts[key]) counts[key] = emptyCounts();
    addCounts(counts[key], sexOf(record));
  });
  return toList(counts, nameKey, order);
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
      Other: counts.Other,
      total: counts.total,
      pctFemale: pct(counts.Female, counts.total),
    };
  });
}

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
      Other: bucket.counts.Other,
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
      Other: totals.Other,
      total: totals.total,
      pctFemale: pct(totals.Female, totals.total),
      pctMale: pct(totals.Male, totals.total),
      pctOther: pct(totals.Other, totals.total),
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
    byStudentType: studentTypeRows(records, "type"),
    demographics: studentTypeRows(records, "label").map(
      ({ label, Female, Male, Other, total }) => ({ label, Female, Male, Other, total }),
    ),
    byAcademicYear,
    schoolYears: sampleSchoolYears(allRecords),
    semesters: ["1st", "2nd", "Summer"].filter((s) => semesterSet.has(s)),
    yearLevels: YEAR_LEVEL_ORDER,
    studentTypes: STUDENT_TYPE_ORDER,
    campuses: CAMPUS_ORDER,
  };
}