/* Employee gender-statistics helpers shared by the sample dataset and the
   filter panel on the employees page.

   Two jobs:
   1. Turn a list of sample employee records into the exact response shape the
      gender-statistics API returns, so the page (and the quick-report PDFs)
      render identically whether the data is live or sampled.
   2. Filter/option helpers for the filter panel.

   The sample records themselves live in ./employeeSampleRecords.js. */

/* Values the live database stores for employment_information.employment_status
   and employment_appointment_status (see models/employment_information.js). */
export const LIVE_PERSONNEL_TYPES = ["Faculty", "Non-teaching Personnel"];

export const LIVE_APPOINTMENT_STATUSES = [
  "Regular",
  "Temporary",
  "Coterminous",
  "Casual",
  "Job Order",
  "Contract of Service (Skilled)",
  "Utility Worker",
  "University Lecturer",
  "Part-time Lecturer",
  "Clinical Instructor",
  "Adjunct",
];

/* Display order for the sample breakdowns — keeps the tables in a familiar
   order (leadership first, then rank-and-file) instead of by headcount. */
export const CATEGORY_ORDER = [
  "Faculty",
  "Administrative Staff",
  "Job Order/Contractual",
];

export const POSITION_LEVEL_ORDER = [
  "University President",
  "Vice President",
  "Directors",
  "Deans",
  "Department Chairs",
  "Faculty",
  "Administrative Personnel",
  "Job Order/Contractual",
];

export const APPOINTMENT_ORDER = [
  "Regular",
  "Temporary",
  "Coterminous",
  "Casual",
  "Job Order",
  "Contract of Service (Skilled)",
  "Utility Worker",
  "University Lecturer",
  "Part-time Lecturer",
  "Clinical Instructor",
  "Adjunct",
];

export const ACADEMIC_RANK_ORDER = [
  "Instructor I",
  "Instructor II",
  "Instructor III",
  "Assistant Professor I",
  "Assistant Professor II",
  "Assistant Professor III",
  "Assistant Professor IV",
  "Associate Professor",
  "Professor",
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

/* ── Filtering ─────────────────────────────────────────────────────────── */

export const EMPTY_EMPLOYEE_FILTERS = {
  personnelType: "",
  office: "",
  department: "",
  appointmentStatus: "",
  positionLevel: "",
};

export function activeFilterCount(filters = {}) {
  return Object.values(filters).filter(Boolean).length;
}

export function filterEmployeeRecords(records = [], filters = {}) {
  const {
    personnelType,
    office,
    department,
    appointmentStatus,
    positionLevel,
  } = filters;

  return records.filter((record) => {
    if (personnelType && record.personnelType !== personnelType) return false;
    if (office && record.office !== office) return false;
    if (department && record.department !== department) return false;
    if (appointmentStatus && record.appointmentStatus !== appointmentStatus) {
      return false;
    }
    if (positionLevel && record.positionLevel !== positionLevel) return false;
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
}

/** Departments available for an office (all offices when none is selected). */
export function departmentOptions(records = [], office = "") {
  const scoped = office
    ? records.filter((record) => record.office === office)
    : records;
  return uniqueFieldOptions(scoped, "department").sort((a, b) =>
    a.localeCompare(b),
  );
}

/* ── Aggregation ───────────────────────────────────────────────────────── */

const DEMOGRAPHIC_ROWS = [
  { label: "Scholar", test: (r) => r?.scholar === true },
  { label: "Person with Disability (PWD)", test: (r) => r?.pwd === true },
  { label: "Indigenous Peoples (IP)", test: (r) => r?.indigenous === true },
  { label: "Low Income", test: (r) => r?.income === "Low Income" },
  { label: "Middle Income", test: (r) => r?.income === "Middle Income" },
  { label: "High Income", test: (r) => r?.income === "High Income" },
];

const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

function groupBy(records, keyFn, nameKey, order) {
  const counts = {};
  records.forEach((record) => {
    const key = keyFn(record) || "Unspecified";
    if (!counts[key]) counts[key] = emptyCounts();
    addCounts(counts[key], sexOf(record));
  });
  return toList(counts, nameKey, order);
}

/**
 * Build the same response shape as
 * `/api/analytics/gender-statistics?type=employees` from sample employee
 * records, so the page and the quick-report PDFs work unchanged.
 */
export function computeEmployeeStats(records = []) {
  const totals = emptyCounts();
  records.forEach((record) => addCounts(totals, sexOf(record)));

  return {
    type: "employees",
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
    byOffice: groupBy(records, (r) => r.office, "office").filter(
      (row) => row.office !== "Unspecified",
    ),
    byCategory: groupBy(
      records,
      (r) => r.personnelType,
      "category",
      CATEGORY_ORDER,
    ).filter((row) => row.category !== "Unspecified"),
    byPositionLevel: groupBy(
      records,
      (r) => r.positionLevel,
      "level",
      POSITION_LEVEL_ORDER,
    ).filter((row) => row.level !== "Unspecified"),
    byAcademicRank: groupBy(
      records,
      (r) => r.academicRank,
      "rank",
      ACADEMIC_RANK_ORDER,
    ).filter((row) => row.rank !== "Unspecified"),
    byAppointment: groupBy(
      records,
      (r) => r.appointmentStatus,
      "status",
      APPOINTMENT_ORDER,
    ).filter((row) => row.status !== "Unspecified"),
    demographics: DEMOGRAPHIC_ROWS.map((row) => {
      const counts = emptyCounts();
      records.forEach((record) => {
        if (row.test(record)) addCounts(counts, sexOf(record));
      });
      return {
        label: row.label,
        Female: counts.Female,
        Male: counts.Male,
        Other: counts.Other,
        total: counts.total,
      };
    }),
  };
}
