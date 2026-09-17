/* Sample employee records for the Gender Statistics demo dataset.

   Why records instead of pre-built tables? Pre-aggregated tables (the original
   data/sample-employees.json) cannot answer filter combinations such as
   "Faculty + College of Education + Regular", because the cross-tabs were never
   stored. This module expands the same curated totals into individual records,
   so every filter — including the sample-only Department and Position Level
   dimensions — can be applied and then re-aggregated by computeEmployeeStats().

   Generation is fully deterministic (no randomness), so the sample dataset and
   its snapshot in ../data/sample-employees.json are stable across builds.

   The sex × office marginals and the 1,026 / 612 / 404 / 10 headline totals are
   preserved exactly from the original curated tables. The position-level table
   was rebuilt to nest under the personnel category (the old table had 656
   "Faculty" positions against only 419 faculty personnel), which is the one
   demo breakdown that intentionally changed. */

/* Sex counts per office — identical to the original curated byOffice table. */
const OFFICE_TARGETS = [
  { office: "College of Education", Female: 134, Male: 94, Other: 2 },
  { office: "College of Arts and Social Sciences", Female: 85, Male: 59, Other: 2 },
  { office: "College of Business and Accountancy", Female: 52, Male: 30, Other: 1 },
  { office: "College of Allied Health Sciences", Female: 39, Male: 11, Other: 1 },
  {
    office: "Office of the Vice President for Administration and Finance",
    Female: 31,
    Male: 12,
    Other: 0,
  },
  { office: "College of Agriculture", Female: 27, Male: 20, Other: 0 },
  {
    office: "Office of the Vice President for Student Affairs and Services",
    Female: 25,
    Male: 8,
    Other: 1,
  },
  { office: "College of Criminal Justice Education", Female: 22, Male: 16, Other: 0 },
  { office: "College of Information and Computing Sciences", Female: 22, Male: 23, Other: 1 },
  { office: "Office of the Vice President for Academic Affairs", Female: 22, Male: 8, Other: 1 },
  { office: "Office of the Vice President for Research and Extension", Female: 20, Male: 6, Other: 0 },
  { office: "College of Governance", Female: 20, Male: 14, Other: 0 },
  { office: "College of Engineering", Female: 18, Male: 35, Other: 0 },
  { office: "Office of the University President", Female: 18, Male: 9, Other: 1 },
  { office: "College of Fisheries and Aquatic Sciences", Female: 16, Male: 17, Other: 0 },
  { office: "College of Industrial Technology", Female: 14, Male: 19, Other: 0 },
  { office: "Graduate School", Female: 13, Male: 8, Other: 0 },
  { office: "HRMU", Female: 12, Male: 5, Other: 0 },
  { office: "GAD Unit", Female: 11, Male: 2, Other: 0 },
  { office: "College of Environmental Studies", Female: 11, Male: 8, Other: 0 },
];

/* Personnel categories (byCategory) — totals preserved exactly. */
const CATEGORY_TARGETS = [
  { personnelType: "Faculty", Female: 230, Male: 184, Other: 5 },
  { personnelType: "Administrative Staff", Female: 357, Male: 210, Other: 4 },
  { personnelType: "Job Order/Contractual", Female: 25, Male: 10, Other: 1 },
];

/* Position levels nest under the personnel category, so filtering by Personnel
   Type never shows an impossible pairing (e.g. faculty at admin level).
   Per-category sex counts add up to that category's totals. */
const LEVEL_TARGETS = {
  Faculty: [
    { positionLevel: "Deans", Female: 22, Male: 8, Other: 0 },
    { positionLevel: "Department Chairs", Female: 35, Male: 15, Other: 0 },
    { positionLevel: "Faculty", Female: 173, Male: 161, Other: 5 },
  ],
  "Administrative Staff": [
    { positionLevel: "University President", Female: 0, Male: 1, Other: 0 },
    { positionLevel: "Vice President", Female: 2, Male: 2, Other: 0 },
    { positionLevel: "Directors", Female: 5, Male: 3, Other: 0 },
    { positionLevel: "Administrative Personnel", Female: 350, Male: 204, Other: 4 },
  ],
  "Job Order/Contractual": [
    { positionLevel: "Job Order/Contractual", Female: 25, Male: 10, Other: 1 },
  ],
};

/* Academic ranks apply to Faculty personnel only (419 in total). */
const RANK_TARGETS = [
  { academicRank: "Instructor I", Female: 62, Male: 41, Other: 1 },
  { academicRank: "Instructor II", Female: 44, Male: 30, Other: 1 },
  { academicRank: "Instructor III", Female: 30, Male: 22, Other: 0 },
  { academicRank: "Assistant Professor I", Female: 28, Male: 25, Other: 1 },
  { academicRank: "Assistant Professor II", Female: 22, Male: 20, Other: 1 },
  { academicRank: "Assistant Professor III", Female: 16, Male: 15, Other: 0 },
  { academicRank: "Assistant Professor IV", Female: 10, Male: 11, Other: 0 },
  { academicRank: "Associate Professor", Female: 12, Male: 12, Other: 1 },
  { academicRank: "Professor", Female: 6, Male: 8, Other: 0 },
];

/* Appointment statuses — curated totals preserved exactly (1,026). */
const APPOINTMENT_TARGETS = [
  { appointmentStatus: "Regular", Female: 310, Male: 184, Other: 5 },
  { appointmentStatus: "Temporary", Female: 80, Male: 60, Other: 0 },
  { appointmentStatus: "Coterminous", Female: 35, Male: 30, Other: 0 },
  { appointmentStatus: "Casual", Female: 42, Male: 65, Other: 1 },
  { appointmentStatus: "Job Order", Female: 20, Male: 7, Other: 0 },
  { appointmentStatus: "Contract of Service (Skilled)", Female: 60, Male: 25, Other: 2 },
  { appointmentStatus: "Utility Worker", Female: 5, Male: 3, Other: 0 },
  { appointmentStatus: "University Lecturer", Female: 25, Male: 12, Other: 1 },
  { appointmentStatus: "Part-time Lecturer", Female: 20, Male: 10, Other: 1 },
  { appointmentStatus: "Clinical Instructor", Female: 10, Male: 5, Other: 0 },
  { appointmentStatus: "Adjunct", Female: 5, Male: 3, Other: 0 },
];

/* Overlapping demographic flags — the first three are exclusive per record. */
const SCHOLAR_TARGETS = [{ Female: 40, Male: 25, Other: 0 }];
const PWD_TARGETS = [{ Female: 12, Male: 10, Other: 1 }];
const IP_TARGETS = [{ Female: 30, Male: 22, Other: 2 }];
const INCOME_TARGETS = [
  { income: "Low Income", Female: 210, Male: 160, Other: 3 },
  { income: "Middle Income", Female: 300, Male: 190, Other: 5 },
  { income: "High Income", Female: 62, Male: 44, Other: 2 },
];

/* Sample-only dimension: departments inside each office. Nothing in the live
   database stores a department, so this exists purely for the demo. */
const DEPARTMENTS_BY_OFFICE = {
  "College of Education": [
    "Department of Elementary Education",
    "Department of Secondary Education",
    "Department of Professional Education",
  ],
  "College of Arts and Social Sciences": [
    "Department of Communication",
    "Department of English",
    "Department of Social Work",
  ],
  "College of Business and Accountancy": [
    "Department of Accountancy",
    "Department of Business Administration",
    "Department of Tourism Management",
  ],
  "College of Allied Health Sciences": [
    "Department of Nursing",
    "Department of Midwifery",
  ],
  "College of Agriculture": [
    "Department of Crop Science",
    "Department of Animal Science",
  ],
  "College of Criminal Justice Education": [
    "Department of Criminology",
    "Department of Law Enforcement Administration",
  ],
  "College of Information and Computing Sciences": [
    "Department of Information Technology",
    "Department of Information Systems",
  ],
  "College of Governance": [
    "Department of Public Administration",
    "Department of Political Science",
  ],
  "College of Engineering": [
    "Department of Civil Engineering",
    "Department of Electrical Engineering",
    "Department of Mechanical Engineering",
  ],
  "College of Fisheries and Aquatic Sciences": ["Department of Fisheries"],
  "College of Industrial Technology": ["Department of Industrial Technology"],
  "College of Environmental Studies": ["Department of Environmental Science"],
  "Graduate School": ["Graduate Studies Office"],
  "Office of the University President": [
    "Office of the President",
    "Internal Audit Office",
  ],
  "Office of the Vice President for Academic Affairs": [
    "Academic Affairs Office",
    "Registrar's Office",
    "Library Services",
  ],
  "Office of the Vice President for Administration and Finance": [
    "Accounting Office",
    "Cashiering Office",
    "Human Resource Management Office",
  ],
  "Office of the Vice President for Research and Extension": [
    "Research Office",
    "Extension Office",
  ],
  "Office of the Vice President for Student Affairs and Services": [
    "Student Affairs Office",
    "Guidance Office",
    "Sports Development Office",
  ],
  "HRMU": ["Human Resource Management Unit"],
  "GAD Unit": ["GAD Office"],
};

const SEX_KEYS = ["Female", "Male", "Other"];

/** Expand `{ Female, Male, Other }` targets into one value list per sex. */
function sexValues(targets, key, sex) {
  return targets.flatMap((target) =>
    Array(target[sex] || 0).fill(target[key]),
  );
}

/* Spread values across one sex's records at even intervals, so a dimension is
   represented across offices instead of clustered at the front. Requires
   values.length <= records of that sex, which the curated targets satisfy. */
function spreadAssign(records, sex, values, key) {
  if (!values.length) return;
  const pool = records.filter((record) => record.sex === sex);
  const stride = pool.length / values.length;
  values.forEach((value, index) => {
    const target = pool[Math.min(pool.length - 1, Math.floor(index * stride))];
    target[key] = value;
  });
}

/* Split every target's per-sex count across the personnel categories in
   proportion to each category's size, so each status appears in every category
   instead of piling up in one. Rounding is balanced both ways: every status
   keeps its exact curated sex totals AND every category receives exactly the
   number of statuses its records need (no record is left without a status). */
function assignProportionalByCategory(records, targets, key) {
  const categories = [...new Set(records.map((record) => record.personnelType))];
  const groups = new Map(
    categories.map((category) => [
      category,
      records.filter((record) => record.personnelType === category),
    ]),
  );

  /* matrix[statusIndex][categoryIndex] = how many records of one sex get that
     status in that category. */
  const perSex = { Female: null, Male: null, Other: null };

  SEX_KEYS.forEach((sex) => {
    const sizes = categories.map(
      (category) =>
        groups.get(category).filter((record) => record.sex === sex).length,
    );
    const poolTotal = sizes.reduce((sum, size) => sum + size, 0);
    if (!poolTotal) return;

    /* Phase 1 — row sums (exact per status) via largest remainder. */
    const matrix = targets.map((target) => {
      const count = target[sex] || 0;
      const exact = sizes.map((size) => (count * size) / poolTotal);
      const row = exact.map((value) => Math.floor(value));
      let remainder = count - row.reduce((sum, n) => sum + n, 0);
      const byFraction = exact
        .map((value, index) => ({ index, frac: value - Math.floor(value) }))
        .sort((a, b) => b.frac - a.frac);
      let i = 0;
      while (remainder > 0) {
        row[byFraction[i % byFraction.length].index] += 1;
        remainder -= 1;
        i += 1;
      }
      return row;
    });

    /* Phase 2 — column sums (exact per category) by moving units between
       categories inside the same status, which keeps every row sum intact. */
    const columnTotals = () =>
      sizes.map((_, index) =>
        matrix.reduce((sum, row) => sum + row[index], 0),
      );

    for (let guard = 0; guard < 100000; guard += 1) {
      const totals = columnTotals();
      let under = -1;
      let over = -1;
      let maxDeficit = 0;
      let maxSurplus = 0;
      totals.forEach((total, index) => {
        const diff = sizes[index] - total;
        if (diff > maxDeficit) {
          maxDeficit = diff;
          under = index;
        }
        if (-diff > maxSurplus) {
          maxSurplus = -diff;
          over = index;
        }
      });
      if (under === -1 || over === -1 || maxDeficit === 0 || maxSurplus === 0) {
        break;
      }
      /* Move one unit from the fullest status in the over-supplied category. */
      let pick = -1;
      matrix.forEach((row, statusIndex) => {
        if (row[over] <= 0) return;
        if (pick === -1 || row[over] > matrix[pick][over]) pick = statusIndex;
      });
      if (pick === -1) break;
      matrix[pick][over] -= 1;
      matrix[pick][under] += 1;
    }

    perSex[sex] = matrix;
  });

  const queues = new Map(
    categories.map((category) => [
      category,
      { Female: [], Male: [], Other: [] },
    ]),
  );

  SEX_KEYS.forEach((sex) => {
    const matrix = perSex[sex];
    if (!matrix) return;
    matrix.forEach((row, statusIndex) => {
      row.forEach((count, categoryIndex) => {
        for (let i = 0; i < count; i += 1) {
          queues
            .get(categories[categoryIndex])
            [sex].push(targets[statusIndex][key]);
        }
      });
    });
  });

  categories.forEach((category) => {
    groups.get(category).forEach((record) => {
      record[key] = queues.get(category)[record.sex].shift();
    });
  });
}

/**
 * Expand the curated sample totals into individual employee records.
 * Deterministic: the same 1,026 records on every build.
 */
export function buildSampleEmployeeRecords() {
  const records = [];

  /* 1. Office + sex skeleton — sex × office marginals are exact. */
  OFFICE_TARGETS.forEach((target) => {
    const pools = {
      Female: target.Female || 0,
      Male: target.Male || 0,
      Other: target.Other || 0,
    };
    const total = pools.Female + pools.Male + pools.Other;
    const remaining = { ...pools };
    /* Pick the sex whose remaining share is largest, so each office block is
       mixed rather than grouped by sex. */
    for (let i = 0; i < total; i += 1) {
      const sex = SEX_KEYS.filter((s) => remaining[s] > 0).sort(
        (a, b) => remaining[b] / pools[b] - remaining[a] / pools[a],
      )[0];
      remaining[sex] -= 1;
      records.push({ office: target.office, sex });
    }
  });

  /* 2. Personnel category (exact totals per sex). */
  SEX_KEYS.forEach((sex) => {
    spreadAssign(
      records,
      sex,
      sexValues(CATEGORY_TARGETS, "personnelType", sex),
      "personnelType",
    );
  });

  /* 3. Position level, nested inside each category (exact totals per sex). */
  Object.entries(LEVEL_TARGETS).forEach(([category, targets]) => {
    const group = records.filter(
      (record) => record.personnelType === category,
    );
    SEX_KEYS.forEach((sex) => {
      spreadAssign(
        group,
        sex,
        sexValues(targets, "positionLevel", sex),
        "positionLevel",
      );
    });
  });

  /* 4. Academic rank — faculty records only (exact totals per sex). */
  const facultyRecords = records.filter(
    (record) => record.personnelType === "Faculty",
  );
  SEX_KEYS.forEach((sex) => {
    spreadAssign(
      facultyRecords,
      sex,
      sexValues(RANK_TARGETS, "academicRank", sex),
      "academicRank",
    );
  });

  /* 5. Appointment status — spread proportionally across categories so every
     category gets its share of Regular appointments (exact totals per sex). */
  assignProportionalByCategory(
    records,
    APPOINTMENT_TARGETS,
    "appointmentStatus",
  );

  /* 6. Departments — round robin within each office (sample-only dimension). */
  OFFICE_TARGETS.forEach(({ office }) => {
    const departments = DEPARTMENTS_BY_OFFICE[office] || ["Office"];
    records
      .filter((record) => record.office === office)
      .forEach((record, index) => {
        record.department = departments[index % departments.length];
      });
  });

  /* 7. Demographic flags (exact counts; income is exclusive per record). */
  SEX_KEYS.forEach((sex) => {
    spreadAssign(
      records,
      sex,
      sexValues(SCHOLAR_TARGETS, "scholar", sex).map(() => true),
      "scholar",
    );
    spreadAssign(
      records,
      sex,
      sexValues(PWD_TARGETS, "pwd", sex).map(() => true),
      "pwd",
    );
    spreadAssign(
      records,
      sex,
      sexValues(IP_TARGETS, "indigenous", sex).map(() => true),
      "indigenous",
    );
    spreadAssign(
      records,
      sex,
      sexValues(INCOME_TARGETS, "income", sex),
      "income",
    );
  });

  return records.map((record, index) => ({
    id: `SAMPLE-${String(index + 1).padStart(4, "0")}`,
    office: record.office,
    sex: record.sex,
    personnelType: record.personnelType,
    positionLevel: record.positionLevel,
    academicRank: record.academicRank || null,
    appointmentStatus: record.appointmentStatus,
    department: record.department,
    scholar: record.scholar === true,
    pwd: record.pwd === true,
    indigenous: record.indigenous === true,
    income: record.income || null,
  }));
}

/* Built once per module load and shared by the page and the tests. */
export const SAMPLE_EMPLOYEE_RECORDS = buildSampleEmployeeRecords();

export const SAMPLE_EMPLOYEE_COUNT = SAMPLE_EMPLOYEE_RECORDS.length;

