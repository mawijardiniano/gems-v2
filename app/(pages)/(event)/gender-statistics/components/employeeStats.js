
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
  "Security Guard",
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

const SEXES = ["Female", "Male"];

export function sexOf(record) {
  return SEXES.includes(record?.sex) ? record.sex : "Female";
}

function emptyCounts() {
  return { Female: 0, Male: 0, total: 0 };
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


export const EMPTY_EMPLOYEE_FILTERS = {
  personnelType: "",
  office: "",
  department: "",
  appointmentStatus: "",
  positionLevel: "",
  schoolYear: "",
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
    schoolYear,
  } = filters;

  return records.filter((record) => {
    if (personnelType && record.personnelType !== personnelType) return false;
    if (office && record.office !== office) return false;
    if (department && record.department !== department) return false;
    if (appointmentStatus && record.appointmentStatus !== appointmentStatus) {
      return false;
    }
    if (positionLevel && record.positionLevel !== positionLevel) return false;
    /* Academic year narrows through the appointment history. */
    if (schoolYear && !(record.years || []).includes(schoolYear)) return false;
    return true;
  });
}

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

export function departmentOptions(records = [], office = "") {
  const scoped = office
    ? records.filter((record) => record.office === office)
    : records;
  return uniqueFieldOptions(scoped, "department").sort((a, b) =>
    a.localeCompare(b),
  );
}



const DEMOGRAPHIC_ROWS = [
  { label: "Scholar", test: (r) => r?.scholar === true },
  { label: "Person with Disability (PWD)", test: (r) => r?.pwd === true },
  { label: "Indigenous Peoples (IP)", test: (r) => r?.indigenous === true },
  { label: "Solo Parent", test: (r) => r?.soloParent === true },
  { label: "Low Income", test: (r) => r?.income === "Low Income" },
  { label: "Middle Income", test: (r) => r?.income === "Middle Income" },
  { label: "High Income", test: (r) => r?.income === "High Income" },
];

export const GENDER_IDENTITY_ORDER = ["Male", "Female", "LGBTQIA+"];

function genderIdentityRows(records = []) {
  const counts = new Map(GENDER_IDENTITY_ORDER.map((name) => [name, 0]));
  let unspecified = 0;
  records.forEach((record) => {
    const value = record?.genderIdentity;
    if (counts.has(value)) counts.set(value, counts.get(value) + 1);
    else unspecified += 1;
  });
  const rows = GENDER_IDENTITY_ORDER.map((name) => ({
    name,
    value: counts.get(name),
  }));
  if (unspecified > 0) rows.push({ name: "Not specified", value: unspecified });
  return rows;
}

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
 * records, so the page and its charts work unchanged.
 *
 * `allRecords` feeds the filter option lists (schoolYears), the way the live
 * API reports every year it holds rather than only the years that survive the
 * current filter.
 */
export function computeEmployeeStats(records = [], allRecords = records) {
  const totals = emptyCounts();
  records.forEach((record) => addCounts(totals, sexOf(record)));

  const lgbtqia = records.filter(
    (record) => record?.genderIdentity === "LGBTQIA+",
  ).length;

  /* Appointment history: an employee counts once per sample year they are on
     board (`years` runs from the start year through the newest sample year). */
  const perYear = new Map();
  records.forEach((record) => {
    (record.years || []).forEach((year) => {
      if (!perYear.has(year)) perYear.set(year, emptyCounts());
      addCounts(perYear.get(year), sexOf(record));
    });
  });

  const byAcademicYear = [...perYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([school_year, counts]) => ({
      school_year,
      Female: counts.Female,
      Male: counts.Male,
      total: counts.total,
    }));

  const schoolYears = [
    ...new Set(allRecords.flatMap((record) => record.years || [])),
  ]
    .sort()
    .reverse();

  return {
    type: "employees",
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
    byAcademicYear,
    schoolYears,
    byGenderIdentity: genderIdentityRows(records),
    demographics: DEMOGRAPHIC_ROWS.map((row) => {
      const counts = emptyCounts();
      records.forEach((record) => {
        if (row.test(record)) addCounts(counts, sexOf(record));
      });
      return {
        label: row.label,
        Female: counts.Female,
        Male: counts.Male,
        total: counts.total,
      };
    }),
  };
}
