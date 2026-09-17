/* Sample student records for the Gender Statistics demo dataset.

   Why records instead of pre-built tables? Pre-aggregated tables cannot answer
   filter combinations such as "College of Engineering + 2nd Year + Scholar",
   because the cross-tabs were never stored. This module expands the curated
   student totals into individual records, so every filter - campus, college,
   program, year level, student type and academic year - can be applied and then
   re-aggregated by computeStudentStats().

   Generation is fully deterministic (no randomness), so the sample dataset and
   its snapshot in ../data/sample-students.json are stable across builds.

   Curated headline totals are preserved exactly: 3,439 students
   (2,097 female / 1,328 male / 14 other), the 14-college and 36-program tables,
   3,060 undergraduates / 312 masters / 67 doctoral, year levels 1st-4th only
   (5th/6th year are not offered), and the six student-type categories. */

import { CAMPUS_ORDER } from "./studentStats.js";

/* Programs per college with exact sex counts (the byProgram table). */
export const COLLEGE_PROGRAM_TARGETS = {
  "Graduate School": [
    { program: "Master of Arts in Education", Female: 128, Male: 44, Other: 1 },
    { program: "Doctor of Education", Female: 41, Male: 26, Other: 0 },
    { program: "Master in Public Administration", Female: 52, Male: 38, Other: 1 },
    { program: "Master in Information Technology", Female: 34, Male: 14, Other: 0 },
  ],
  "College of Agriculture": [
    { program: "Bachelor of Science in Agriculture", Female: 118, Male: 94, Other: 2 },
    { program: "Bachelor in Agricultural Technology", Female: 62, Male: 61, Other: 0 },
  ],
  "College of Allied Health Sciences": [
    { program: "Bachelor of Science in Nursing", Female: 298, Male: 62, Other: 2 },
    { program: "Bachelor of Science in Midwifery", Female: 87, Male: 26, Other: 1 },
  ],
  "College of Arts and Social Sciences": [
    { program: "Bachelor of Arts in Communication", Female: 68, Male: 30, Other: 0 },
    { program: "Bachelor of Arts in English Language Studies", Female: 55, Male: 27, Other: 0 },
    { program: "Bachelor of Science in Social Work", Female: 47, Male: 25, Other: 0 },
  ],
  "College of Business and Accountancy": [
    { program: "Bachelor of Science in Accountancy", Female: 118, Male: 62, Other: 1 },
    { program: "Bachelor of Science in Accounting Information System", Female: 42, Male: 28, Other: 0 },
    { program: "Bachelor of Science in Business Administration", Female: 78, Male: 24, Other: 1 },
    { program: "Bachelor of Science in Entrepreneurship", Female: 46, Male: 12, Other: 0 },
    { program: "Bachelor of Science in Tourism Management", Female: 36, Male: 9, Other: 0 },
  ],
  "College of Criminal Justice Education": [
    { program: "Bachelor of Science in Criminology", Female: 82, Male: 158, Other: 1 },
    { program: "Bachelor of Science in Law Enforcement Administration", Female: 23, Male: 31, Other: 0 },
  ],
  "College of Education": [
    { program: "Bachelor of Elementary Education", Female: 88, Male: 18, Other: 0 },
    { program: "Bachelor of Secondary Education", Female: 96, Male: 28, Other: 1 },
    { program: "Bachelor of Culture and Arts Education", Female: 24, Male: 6, Other: 0 },
    { program: "Bachelor of Technology and Livelihood Education", Female: 27, Male: 9, Other: 0 },
    { program: "Certificate in Teachers Professional Education", Female: 10, Male: 1, Other: 0 },
  ],
  "College of Engineering": [
    { program: "Bachelor of Science in Civil Engineering", Female: 22, Male: 48, Other: 0 },
    { program: "Bachelor of Science in Computer Engineering", Female: 18, Male: 32, Other: 1 },
    { program: "Bachelor of Science in Electrical Engineering", Female: 14, Male: 26, Other: 0 },
    { program: "Bachelor of Science in Electronics Engineering", Female: 12, Male: 21, Other: 0 },
    { program: "Bachelor of Science in Mechanical Engineering", Female: 14, Male: 18, Other: 0 },
  ],
  "College of Environmental Studies": [
    { program: "Bachelor of Science in Environmental Science", Female: 40, Male: 34, Other: 1 },
  ],
  "College of Fisheries and Aquatic Sciences": [
    { program: "Bachelor of Science in Fisheries", Female: 88, Male: 74, Other: 1 },
  ],
  "College of Governance": [
    { program: "Bachelor in Public Administration", Female: 66, Male: 38, Other: 0 },
    { program: "Bachelor of Arts in Political Science", Female: 52, Male: 28, Other: 0 },
  ],
  "College of Industrial Technology": [
    { program: "Bachelor of Science in Industrial Technology", Female: 48, Male: 36, Other: 0 },
  ],
  "College of Information and Computing Sciences": [
    { program: "Bachelor of Science in Information Technology", Female: 34, Male: 82, Other: 0 },
    { program: "Bachelor of Science in Information Systems", Female: 21, Male: 48, Other: 0 },
  ],
  "Laboratory School": [
    { program: "Senior-High School", Female: 8, Male: 10, Other: 0 },
  ],
};

/* Year levels - undergraduates only (the Graduate School has no year level).
   Per-sex counts add up to the 1,842 / 1,206 / 12 undergraduate totals. */
const YEAR_LEVEL_TARGETS = [
  { yearLevel: "1st Year", Female: 532, Male: 378, Other: 4 },
  { yearLevel: "2nd Year", Female: 498, Male: 348, Other: 4 },
  { yearLevel: "3rd Year", Female: 458, Male: 285, Other: 2 },
  { yearLevel: "4th Year", Female: 354, Male: 195, Other: 2 },
];

/* Overlapping demographic flags - the three income bands are exclusive per
   record, the scholar/PWD/IP flags are not. */
const SCHOLAR_TARGETS = [{ Female: 486, Male: 402, Other: 4 }];
const PWD_TARGETS = [{ Female: 31, Male: 22, Other: 0 }];
const IP_TARGETS = [{ Female: 24, Male: 19, Other: 0 }];
const INCOME_TARGETS = [
  { income: "Low Income", Female: 689, Male: 512, Other: 3 },
  { income: "Middle Income", Female: 1102, Male: 687, Other: 9 },
  { income: "High Income", Female: 306, Male: 129, Other: 2 },
];

/* Term history. Every student is enrolled in both regular semesters of every
   academic year from their first year through 2024-2025, which reproduces the
   byAcademicYear curve (591 / 1,363 / 2,363 / 3,439). Summer terms are not
   part of the sample dataset. */
export const SAMPLE_SCHOOL_YEARS = ["2021-2022", "2022-2023", "2023-2024", "2024-2025"];
const SEMESTERS_PER_YEAR = ["1st", "2nd"];

/* First academic year of each cohort (index into SAMPLE_SCHOOL_YEARS). */
const START_YEAR_BY_YEAR_LEVEL = {
  "4th Year": 0,
  "3rd Year": 1,
  "2nd Year": 2,
  "1st Year": 3,
};
const DOCTORAL_START_SPLIT = 40; /* first 40 doctoral students began in 2021-2022 */
const MASTERS_START_SPLIT = 150; /* first 150 masters students began in 2023-2024 */
const SEX_KEYS = ["Female", "Male", "Other"];

/** Expand `{ Female, Male, Other }` targets into one value list per sex. */
function sexValues(targets, key, sex) {
  return targets.flatMap((target) => Array(target[sex] || 0).fill(target[key]));
}

/* Spread values across one sex records using a fixed-stride walk of the pool,
   so a dimension is represented inside every college block instead of filling
   one block at a time. The step (5) is coprime with every pool size used here
   (1,842 / 1,206 / 12 / 2,097 / 1,328 / 14), so when values.length equals the
   pool size the walk is a complete permutation and the curated totals stay
   exact. Each dimension gets its own stride - a shared stride would make two
   dimensions correlate (every scholar landing in the same income band, for
   example). */
const SPREAD_STEPS = {
  yearLevel: 5,
  scholar: 11,
  pwd: 13,
  indigenous: 17,
  income: 19,
};

function spreadAssign(records, sex, values, key, step) {
  if (!values.length) return;
  const pool = records.filter((record) => record.sex === sex);
  values.forEach((value, index) => {
    const target = pool[(index * step) % pool.length];
    target[key] = value;
  });
}

/**
 * Expand the curated sample totals into individual student records.
 * Deterministic: the same 3,439 records on every build.
 */
export function buildSampleStudentRecords() {
  const records = [];

  /* 1. College + program + sex skeleton - program marginals are exact, and a
        college block mixes sexes instead of grouping them. */
  Object.entries(COLLEGE_PROGRAM_TARGETS).forEach(([college, programs]) => {
    const block = [];
    programs.forEach((program) => {
      const pools = {
        Female: program.Female || 0,
        Male: program.Male || 0,
        Other: program.Other || 0,
      };
      const total = pools.Female + pools.Male + pools.Other;
      const remaining = { ...pools };
      for (let i = 0; i < total; i += 1) {
        const sex = SEX_KEYS.filter((s) => remaining[s] > 0).sort(
          (a, b) => remaining[b] / pools[b] - remaining[a] / pools[a],
        )[0];
        remaining[sex] -= 1;
        block.push({
          college,
          course: program.program,
          sex,
          graduate: college === "Graduate School",
        });
      }
    });
    records.push(...block);
  });

  /* 2. Year level - undergraduates only (exact totals per sex). */
  const undergraduates = records.filter((record) => !record.graduate);
  SEX_KEYS.forEach((sex) => {
    spreadAssign(
      undergraduates,
      sex,
      sexValues(YEAR_LEVEL_TARGETS, "yearLevel", sex),
      "yearLevel",
      SPREAD_STEPS.yearLevel,
    );
  });

  /* 3. Campus - round robin, so every college is present on every campus. */
  records.forEach((record, index) => {
    record.campus = CAMPUS_ORDER[index % CAMPUS_ORDER.length];
  });

  /* 4. Student type flags (exact counts; income is exclusive per record). */
  SEX_KEYS.forEach((sex) => {
    spreadAssign(
      records,
      sex,
      sexValues(SCHOLAR_TARGETS, "scholar", sex).map(() => true),
      "scholar",
      SPREAD_STEPS.scholar,
    );
    spreadAssign(
      records,
      sex,
      sexValues(PWD_TARGETS, "pwd", sex).map(() => true),
      "pwd",
      SPREAD_STEPS.pwd,
    );
    spreadAssign(
      records,
      sex,
      sexValues(IP_TARGETS, "indigenous", sex).map(() => true),
      "indigenous",
      SPREAD_STEPS.indigenous,
    );
    spreadAssign(
      records,
      sex,
      sexValues(INCOME_TARGETS, "income", sex),
      "income",
      SPREAD_STEPS.income,
    );
  });

  /* 5. Term history - from the first year of the cohort through 2024-2025. */
  let doctoralIndex = 0;
  let mastersIndex = 0;
  records.forEach((record) => {
    let startIndex;
    if (record.graduate) {
      if (/doctor/i.test(record.course)) {
        startIndex = doctoralIndex < DOCTORAL_START_SPLIT ? 0 : 1;
        doctoralIndex += 1;
      } else {
        startIndex = mastersIndex < MASTERS_START_SPLIT ? 2 : 3;
        mastersIndex += 1;
      }
    } else {
      startIndex = START_YEAR_BY_YEAR_LEVEL[record.yearLevel];
    }

    record.startYear = SAMPLE_SCHOOL_YEARS[startIndex];
    record.terms = [];
    for (let year = startIndex; year < SAMPLE_SCHOOL_YEARS.length; year += 1) {
      SEMESTERS_PER_YEAR.forEach((semester) => {
        record.terms.push({ school_year: SAMPLE_SCHOOL_YEARS[year], semester });
      });
    }
  });

  return records.map((record, index) => ({
    id: `SAMPLE-${String(index + 1).padStart(4, "0")}`,
    sex: record.sex,
    campus: record.campus,
    college: record.college,
    course: record.course,
    yearLevel: record.yearLevel || null,
    scholar: record.scholar === true,
    pwd: record.pwd === true,
    indigenous: record.indigenous === true,
    income: record.income || null,
    startYear: record.startYear,
    terms: record.terms,
  }));
}

/* Built once per module load and shared by the page and the tests. */
export const SAMPLE_STUDENT_RECORDS = buildSampleStudentRecords();

export const SAMPLE_STUDENT_COUNT = SAMPLE_STUDENT_RECORDS.length;