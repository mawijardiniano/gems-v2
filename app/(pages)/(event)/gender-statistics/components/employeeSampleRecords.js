
import { assignStartYears } from "./sampleCohorts.js";
import { SAMPLE_SCHOOL_YEARS } from "./studentSampleRecords.js";

const OFFICE_TARGETS = [
  { office: "College of Education", Female: 134, Male: 94 },
  { office: "College of Arts and Social Sciences", Female: 85, Male: 59 },
  { office: "College of Business and Accountancy", Female: 52, Male: 30 },
  { office: "College of Allied Health Sciences", Female: 39, Male: 11 },
  {
    office: "Office of the Vice President for Administration and Finance",
    Female: 31,
    Male: 12,
  },
  { office: "College of Agriculture", Female: 27, Male: 20 },
  {
    office: "Office of the Vice President for Student Affairs and Services",
    Female: 25,
    Male: 8,
  },
  { office: "College of Criminal Justice Education", Female: 22, Male: 16 },
  { office: "College of Information and Computing Sciences", Female: 22, Male: 23 },
  { office: "Office of the Vice President for Academic Affairs", Female: 22, Male: 8 },
  { office: "Office of the Vice President for Research and Extension", Female: 20, Male: 6 },
  { office: "College of Governance", Female: 20, Male: 14 },
  { office: "College of Engineering", Female: 18, Male: 35 },
  { office: "Office of the University President", Female: 18, Male: 9 },
  { office: "College of Fisheries and Aquatic Sciences", Female: 16, Male: 17 },
  { office: "College of Industrial Technology", Female: 14, Male: 19 },
  { office: "Graduate School", Female: 13, Male: 8 },
  { office: "HRMU", Female: 12, Male: 5 },
  { office: "GAD Unit", Female: 11, Male: 2 },
  { office: "College of Environmental Studies", Female: 11, Male: 8 },
];

const CATEGORY_TARGETS = [
  { personnelType: "Faculty", Female: 230, Male: 184 },
  { personnelType: "Administrative Staff", Female: 357, Male: 210 },
  { personnelType: "Job Order/Contractual", Female: 25, Male: 10 },
];


const LEVEL_TARGETS = {
  Faculty: [
    { positionLevel: "Deans", Female: 22, Male: 8 },
    { positionLevel: "Department Chairs", Female: 35, Male: 15 },
    { positionLevel: "Faculty", Female: 173, Male: 161 },
  ],
  "Administrative Staff": [
    { positionLevel: "University President", Female: 0, Male: 1 },
    { positionLevel: "Vice President", Female: 2, Male: 2 },
    { positionLevel: "Directors", Female: 5, Male: 3 },
    { positionLevel: "Administrative Personnel", Female: 350, Male: 204 },
  ],
  "Job Order/Contractual": [
    { positionLevel: "Job Order/Contractual", Female: 25, Male: 10 },
  ],
};

/* Academic ranks apply to Faculty personnel only (419 in total). */
const RANK_TARGETS = [
  { academicRank: "Instructor I", Female: 62, Male: 41 },
  { academicRank: "Instructor II", Female: 44, Male: 30 },
  { academicRank: "Instructor III", Female: 30, Male: 22 },
  { academicRank: "Assistant Professor I", Female: 28, Male: 25 },
  { academicRank: "Assistant Professor II", Female: 22, Male: 20 },
  { academicRank: "Assistant Professor III", Female: 16, Male: 15 },
  { academicRank: "Assistant Professor IV", Female: 10, Male: 11 },
  { academicRank: "Associate Professor", Female: 12, Male: 12 },
  { academicRank: "Professor", Female: 6, Male: 8 },
];

/* Appointment statuses — curated totals preserved exactly (1,016). The
   Security Guard row is carved out of the civilian statuses (Casual, Contract
   of Service, Utility Worker) so every sex total still matches the
   byOffice / byCategory partitions. */
const APPOINTMENT_TARGETS = [
  { appointmentStatus: "Regular", Female: 310, Male: 184 },
  { appointmentStatus: "Temporary", Female: 80, Male: 60 },
  { appointmentStatus: "Coterminous", Female: 35, Male: 30 },
  { appointmentStatus: "Casual", Female: 38, Male: 45 },
  { appointmentStatus: "Job Order", Female: 20, Male: 7 },
  { appointmentStatus: "Contract of Service (Skilled)", Female: 60, Male: 14 },
  { appointmentStatus: "Utility Worker", Female: 3, Male: 2 },
  { appointmentStatus: "Security Guard", Female: 6, Male: 32 },
  { appointmentStatus: "University Lecturer", Female: 25, Male: 12 },
  { appointmentStatus: "Part-time Lecturer", Female: 20, Male: 10 },
  { appointmentStatus: "Clinical Instructor", Female: 10, Male: 5 },
  { appointmentStatus: "Adjunct", Female: 5, Male: 3 },
];

/* Overlapping demographic flags — the first three are exclusive per record. */
const SCHOLAR_TARGETS = [{ Female: 40, Male: 25 }];
const PWD_TARGETS = [{ Female: 12, Male: 10 }];
const IP_TARGETS = [{ Female: 30, Male: 22 }];
const SOLO_PARENT_TARGETS = [{ Female: 20, Male: 7 }];
const INCOME_TARGETS = [
  { income: "Low Income", Female: 210, Male: 160 },
  { income: "Middle Income", Female: 300, Male: 190 },
  { income: "High Income", Female: 62, Male: 44 },
];

/* Gender identity — the Male / Female / LGBTQIA+ values the database stores in
   gadData.gender_preference. Every record defaults to its own sex; these
   targets overlay the LGBTQIA+ count on top of that. */
const LGBTQIA_TARGETS = [{ Female: 18, Male: 12 }];

/* Appointment history — how many employees of each sex were already on board
   when each sample year started. An employee stays on board from `startYear`
   through the newest sample year, so 905 of the 1,016 employees staffed the
   university in 2020-2021 and the roster fills in one cohort at a time. The
   start years are scattered across the whole roster, so every year keeps every
   office, personnel type and appointment status. The window mirrors the
   student sample. */
const START_YEAR_TARGETS = [
  { startYear: SAMPLE_SCHOOL_YEARS[0], Female: 520, Male: 385 },
  { startYear: SAMPLE_SCHOOL_YEARS[1], Female: 30, Male: 5 },
  { startYear: SAMPLE_SCHOOL_YEARS[2], Female: 20, Male: 5 },
  { startYear: SAMPLE_SCHOOL_YEARS[3], Female: 22, Male: 5 },
  { startYear: SAMPLE_SCHOOL_YEARS[4], Female: 20, Male: 4 },
];

/* Growth profile per office: how much of the office's staff arrived late in the
   window. Positive = the office grew (the GAD Unit and HRMU only filled up in
   the recent years), negative = it ran down, 0 = steady. Weights each year by
   `yearShare × (1 + growth × (yearIndex - 2))`, so offices change places between
   years instead of growing in lockstep. */
export const OFFICE_GROWTH = {
  "GAD Unit": 0.4,
  HRMU: 0.3,
  "College of Information and Computing Sciences": 0.35,
  "College of Engineering": 0.3,
  "College of Allied Health Sciences": 0.25,
  "College of Criminal Justice Education": 0.2,
  "Graduate School": 0.15,
  "Office of the Vice President for Research and Extension": 0.1,
  "College of Business and Accountancy": 0.05,
  "College of Arts and Social Sciences": 0,
  "College of Environmental Studies": -0.05,
  "College of Industrial Technology": -0.1,
  "College of Fisheries and Aquatic Sciences": -0.15,
  "College of Education": -0.2,
  "College of Agriculture": -0.25,
};

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

const SEX_KEYS = ["Female", "Male"];

/** Expand `{ Female, Male }` targets into one value list per sex. */
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
  const perSex = { Female: null, Male: null };

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
      { Female: [], Male: [] },
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
 * Expand the curated sample totals into individual employee records, each with
 * a five-year appointment history (2020-2021 through 2024-2025) that keeps
 * every office, personnel type and appointment status in every year.
 * Deterministic: the same 1,016 records on every build.
 */
export function buildSampleEmployeeRecords() {
  const records = [];

  /* 1. Office + sex skeleton — sex × office marginals are exact. */
  OFFICE_TARGETS.forEach((target) => {
    const pools = {
      Female: target.Female || 0,
      Male: target.Male || 0,
    };
    const total = pools.Female + pools.Male;
    const remaining = { ...pools };
    /* Pick the sex whose remaining share is largest, so each office block is
       mixed rather than grouped by sex. */
    for (let i = 0; i < total; i += 1) {
      const sex = SEX_KEYS.filter((s) => remaining[s] > 0).sort(
        (a, b) => remaining[b] / pools[b] - remaining[a] / pools[a],
      )[0];
      remaining[sex] -= 1;
      /* Gender identity starts from the record's own sex; the LGBTQIA+ overlay
         below replaces it for the targeted records. */
      records.push({ office: target.office, sex, genderIdentity: sex });
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
      sexValues(SOLO_PARENT_TARGETS, "soloParent", sex).map(() => true),
      "soloParent",
    );
    spreadAssign(
      records,
      sex,
      sexValues(INCOME_TARGETS, "income", sex),
      "income",
    );
    spreadAssign(
      records,
      sex,
      sexValues(LGBTQIA_TARGETS, "genderIdentity", sex).map(() => "LGBTQIA+"),
      "genderIdentity",
    );
  });

  /* 8. Appointment history - each year gets its curated cohort size and every
     office grows at its own pace, then the years of service follow from the
     start year. */
  assignStartYears(records, SEX_KEYS, {
    years: SAMPLE_SCHOOL_YEARS,
    targets: START_YEAR_TARGETS,
    growthByGroup: OFFICE_GROWTH,
    groupKey: "office",
  });
  records.forEach((record) => {
    record.years = SAMPLE_SCHOOL_YEARS.slice(
      SAMPLE_SCHOOL_YEARS.indexOf(record.startYear),
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
    startYear: record.startYear,
    years: record.years,
    scholar: record.scholar === true,
    pwd: record.pwd === true,
    indigenous: record.indigenous === true,
    soloParent: record.soloParent === true,
    genderIdentity: record.genderIdentity,
    income: record.income || null,
  }));
}

/* Built once per module load and shared by the page and the tests. */
export const SAMPLE_EMPLOYEE_RECORDS = buildSampleEmployeeRecords();

export const SAMPLE_EMPLOYEE_COUNT = SAMPLE_EMPLOYEE_RECORDS.length;

