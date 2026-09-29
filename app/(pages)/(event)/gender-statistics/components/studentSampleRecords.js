

import { CAMPUS_ORDER } from "./studentStats.js";

import { assignStartYears, birthdayValues } from "./sampleCohorts.js";


/* Programs per college with exact sex counts (the byProgram table). */
export const COLLEGE_PROGRAM_TARGETS = {
  "Graduate School": [
    { program: "Master of Arts in Education", Female: 128, Male: 44 },
    { program: "Doctor of Education", Female: 41, Male: 26 },
    { program: "Master in Public Administration", Female: 52, Male: 38 },
    { program: "Master in Information Technology", Female: 34, Male: 14 },
  ],
  "College of Agriculture": [
    { program: "Bachelor of Science in Agriculture", Female: 118, Male: 94 },
    { program: "Bachelor in Agricultural Technology", Female: 62, Male: 61 },
  ],
  "College of Allied Health Sciences": [
    { program: "Bachelor of Science in Nursing", Female: 298, Male: 62 },
    { program: "Bachelor of Science in Midwifery", Female: 87, Male: 26 },
  ],
  "College of Arts and Social Sciences": [
    { program: "Bachelor of Arts in Communication", Female: 68, Male: 30 },
    { program: "Bachelor of Arts in English Language Studies", Female: 55, Male: 27 },
    { program: "Bachelor of Science in Social Work", Female: 47, Male: 25 },
  ],
  "College of Business and Accountancy": [
    { program: "Bachelor of Science in Accountancy", Female: 118, Male: 62 },
    { program: "Bachelor of Science in Accounting Information System", Female: 42, Male: 28 },
    { program: "Bachelor of Science in Business Administration", Female: 78, Male: 24 },
    { program: "Bachelor of Science in Entrepreneurship", Female: 46, Male: 12 },
    { program: "Bachelor of Science in Tourism Management", Female: 36, Male: 9 },
  ],
  "College of Criminal Justice Education": [
    { program: "Bachelor of Science in Criminology", Female: 82, Male: 158 },
    { program: "Bachelor of Science in Law Enforcement Administration", Female: 23, Male: 31 },
  ],
  "College of Education": [
    { program: "Bachelor of Elementary Education", Female: 88, Male: 18 },
    { program: "Bachelor of Secondary Education", Female: 96, Male: 28 },
    { program: "Bachelor of Culture and Arts Education", Female: 24, Male: 6 },
    { program: "Bachelor of Technology and Livelihood Education", Female: 27, Male: 9 },
    { program: "Certificate in Teachers Professional Education", Female: 10, Male: 1 },
  ],
  "College of Engineering": [
    { program: "Bachelor of Science in Civil Engineering", Female: 22, Male: 48 },
    { program: "Bachelor of Science in Computer Engineering", Female: 18, Male: 32 },
    { program: "Bachelor of Science in Electrical Engineering", Female: 14, Male: 26 },
    { program: "Bachelor of Science in Electronics Engineering", Female: 12, Male: 21 },
    { program: "Bachelor of Science in Mechanical Engineering", Female: 14, Male: 18 },
  ],
  "College of Environmental Studies": [
    { program: "Bachelor of Science in Environmental Science", Female: 40, Male: 34 },
  ],
  "College of Fisheries and Aquatic Sciences": [
    { program: "Bachelor of Science in Fisheries", Female: 88, Male: 74 },
  ],
  "College of Governance": [
    { program: "Bachelor in Public Administration", Female: 66, Male: 38 },
    { program: "Bachelor of Arts in Political Science", Female: 52, Male: 28 },
  ],
  "College of Industrial Technology": [
    { program: "Bachelor of Science in Industrial Technology", Female: 48, Male: 36 },
  ],
  "College of Information and Computing Sciences": [
    { program: "Bachelor of Science in Information Technology", Female: 34, Male: 82 },
    { program: "Bachelor of Science in Information Systems", Female: 21, Male: 48 },
  ],
  "Laboratory School": [
    { program: "Senior-High School", Female: 8, Male: 10 },
  ],
};


const YEAR_LEVEL_TARGETS = [
  { yearLevel: "1st Year", Female: 532, Male: 378 },
  { yearLevel: "2nd Year", Female: 498, Male: 348 },
  { yearLevel: "3rd Year", Female: 458, Male: 285 },
  { yearLevel: "4th Year", Female: 354, Male: 195 },
];


const SCHOLAR_TARGETS = [{ Female: 486, Male: 402 }];
const PWD_TARGETS = [{ Female: 31, Male: 22 }];
const IP_TARGETS = [{ Female: 24, Male: 19 }];
const SOLO_PARENT_TARGETS = [{ Female: 62, Male: 20 }];
const INCOME_TARGETS = [
  { income: "Low Income", Female: 689, Male: 512 },
  { income: "Middle Income", Female: 1102, Male: 687 },
  { income: "High Income", Female: 306, Male: 129 },
];


const LGBTQIA_TARGETS = [{ Female: 54, Male: 32 }];

/* Civil status - every value the profile enum accepts, with exact per-sex
   totals (2,097 Female / 1,328 Male). */
const CIVIL_STATUS_TARGETS = [
  { civilStatus: "Single", Female: 1700, Male: 1150 },
  { civilStatus: "Married", Female: 300, Male: 130 },
  { civilStatus: "Widow", Female: 20, Male: 8 },
  { civilStatus: "Legally Separated Marriage", Female: 12, Male: 6 },
  { civilStatus: "Separated", Female: 25, Male: 12 },
  { civilStatus: "Living In/Common Law", Female: 30, Male: 18 },
  { civilStatus: "Annulled", Female: 10, Male: 4 },
];

/* Religion - the largest affiliations from the profile enum, with exact
   per-sex totals. */
const RELIGION_TARGETS = [
  { religion: "Roman Catholic", Female: 1400, Male: 900 },
  { religion: "Iglesia ni Cristo (Church of Christ)", Female: 150, Male: 100 },
  {
    religion:
      "Iglesia Evangelica Metodista en las Islas Filipinas (IEMELIF)",
    Female: 40,
    Male: 25,
  },
  {
    religion: "United Church of Christ in the Philippines (UCCP)",
    Female: 60,
    Male: 35,
  },
  { religion: "Baptist Church", Female: 70, Male: 40 },
  { religion: "Assemblies of God", Female: 55, Male: 35 },
  { religion: "Seventh-day Adventist Church", Female: 45, Male: 30 },
  {
    religion: "Aglipayan Church (Philippine Independent Church)",
    Female: 80,
    Male: 45,
  },
  { religion: "Victory Christian Fellowship", Female: 30, Male: 20 },
  { religion: "Jesus Is Lord Church (JIL)", Female: 35, Male: 22 },
  { religion: "El Shaddai", Female: 20, Male: 10 },
  {
    religion: "The Church of Jesus Christ of Latter-day Saints",
    Female: 15,
    Male: 8,
  },
  { religion: "Jehovah’s Witnesses", Female: 12, Male: 6 },
  { religion: "Other", Female: 85, Male: 52 },
];

/* Age - one row per dashboard decade bucket (`ages` cycle the records through
   the bucket, the counts are exact per sex). Students skew young; the older
   rows cover graduate students. See birthdayValues() in sampleCohorts.js for
   how an age becomes a birthday. */
const AGE_TARGETS = [
  { ages: [16, 17, 18, 19], Female: 700, Male: 480 },
  { ages: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29], Female: 1150, Male: 730 },
  { ages: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39], Female: 180, Male: 90 },
  { ages: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49], Female: 67, Male: 28 },
];


/* Five academic years of history. The employee sample reports the same window
   (see employeeSampleRecords.js), so both pages cover 2020-2021 to 2024-2025. */
export const SAMPLE_SCHOOL_YEARS = [
  "2020-2021",
  "2021-2022",
  "2022-2023",
  "2023-2024",
  "2024-2025",
];
/* Deterministic semester mix for the term history: every student is on the
   rolls for the 1st semester of each year, about one in ten sits out the 2nd
   semester of a given year, a smaller group attends the Summer term, and a
   tiny late-entry cohort joins in the 2nd semester of its start year. The
   rules are index-based like the demographic spread, so the dataset stays
   deterministic and the curated per-year totals are untouched - every student
   still holds at least one term in each year from their start year on. */
const SEMESTER_SKIP_STEP = 10; /* (index + year offset) % 10 === 3 -> no 2nd */
const SUMMER_STEP = 17; /* (index + year offset) % 17 === 5 -> Summer term */
const LATE_ENTRY_STEP = 41; /* index % 41 === 7 -> 2nd-semester entry */

/* How many students of each sex were already enrolled when each sample year
   started: 2,900 of the 3,425 students were on the rolls by 2020-2021, and the
   remaining cohorts join one year at a time, so the newest year holds the whole
   population. The start years are scattered across the population (not assigned
   per year level), which keeps every academic year a complete snapshot - 1st to
   4th year and graduate students all appear in 2020-2021 too. */
const START_YEAR_TARGETS = [
  { startYear: SAMPLE_SCHOOL_YEARS[0], Female: 1775, Male: 1125 },
  { startYear: SAMPLE_SCHOOL_YEARS[1], Female: 90, Male: 65 },
  { startYear: SAMPLE_SCHOOL_YEARS[2], Female: 80, Male: 50 },
  { startYear: SAMPLE_SCHOOL_YEARS[3], Female: 82, Male: 48 },
  { startYear: SAMPLE_SCHOOL_YEARS[4], Female: 70, Male: 40 },
];

/* Growth profile per college: how much of the college's enrolment sits in the
   newer years. Positive = the college grew over the window (computing, health
   sciences and engineering take on students every year), negative = it ran
   down, 0 = steady. The split weights each year by
   `yearShare × (1 + growth × (yearIndex - 2))`, so the oldest and the newest
   year swing the most and the colleges change places from year to year. */
export const COLLEGE_GROWTH = {
  "College of Information and Computing Sciences": 0.45,
  "College of Engineering": 0.35,
  "College of Allied Health Sciences": 0.3,
  "College of Criminal Justice Education": 0.25,
  "Laboratory School": 0.2,
  "College of Business and Accountancy": 0.15,
  "College of Governance": 0.15,
  "Graduate School": 0.1,
  "College of Industrial Technology": 0.05,
  "College of Arts and Social Sciences": 0,
  "College of Fisheries and Aquatic Sciences": -0.1,
  "College of Environmental Studies": -0.15,
  "College of Education": -0.2,
  "College of Agriculture": -0.25,
};
const SEX_KEYS = ["Female", "Male"];

/** Expand `{ Female, Male }` targets into one value list per sex. */
function sexValues(targets, key, sex) {
  return targets.flatMap((target) => Array(target[sex] || 0).fill(target[key]));
}


const SPREAD_STEPS = {
  yearLevel: 5,
  scholar: 11,
  pwd: 13,
  indigenous: 17,
  income: 19,
  soloParent: 23,
  genderIdentity: 29,
  civilStatus: 31,
  religion: 37,
  age: 41,
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
 * Deterministic: the same 3,425 records on every build.
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
      };
      const total = pools.Female + pools.Male;
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
          /* Gender identity starts from the record's own sex; the LGBTQIA+
             overlay below replaces it for the targeted records. */
          genderIdentity: sex,
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
      sexValues(SOLO_PARENT_TARGETS, "soloParent", sex).map(() => true),
      "soloParent",
      SPREAD_STEPS.soloParent,
    );
    spreadAssign(
      records,
      sex,
      sexValues(INCOME_TARGETS, "income", sex),
      "income",
      SPREAD_STEPS.income,
    );
    spreadAssign(
      records,
      sex,
      sexValues(LGBTQIA_TARGETS, "genderIdentity", sex).map(() => "LGBTQIA+"),
      "genderIdentity",
      SPREAD_STEPS.genderIdentity,
    );
  });

  /* 5. Profile demographics - civil status, religion and birthday (exact
        per-sex totals), so the dashboards' demographics panels render from the
        sample the same way they render from the live profiles. */
  SEX_KEYS.forEach((sex) => {
    spreadAssign(
      records,
      sex,
      sexValues(CIVIL_STATUS_TARGETS, "civilStatus", sex),
      "civilStatus",
      SPREAD_STEPS.civilStatus,
    );
    spreadAssign(
      records,
      sex,
      sexValues(RELIGION_TARGETS, "religion", sex),
      "religion",
      SPREAD_STEPS.religion,
    );
    spreadAssign(
      records,
      sex,
      birthdayValues(AGE_TARGETS, sex),
      "birthday",
      SPREAD_STEPS.age,
    );
  });

  /* 6. Start year - each year gets its curated cohort size and every college
        grows at its own pace, so the per-college tables change from year to
        year while every year stays a complete snapshot. */
  assignStartYears(records, SEX_KEYS, {
    years: SAMPLE_SCHOOL_YEARS,
    targets: START_YEAR_TARGETS,
    growthByGroup: COLLEGE_GROWTH,
    groupKey: "college",
  });

  /* 7. Term history - from the record's start year through the newest sample
        year (2024-2025), with a deterministic per-year semester mix. Every
        record keeps at least one term: a late entrant's first term is the 2nd
        semester of the year they joined. */
  records.forEach((record, index) => {
    const startIndex = SAMPLE_SCHOOL_YEARS.indexOf(record.startYear);
    record.startYear = SAMPLE_SCHOOL_YEARS[startIndex];
    const lastYearIndex = SAMPLE_SCHOOL_YEARS.length - 1;
    const lateEntry = index % LATE_ENTRY_STEP === 7;
    record.terms = [];
    for (let year = startIndex; year <= lastYearIndex; year += 1) {
      const offset = year - startIndex;
      const isStartYear = offset === 0;
      const joinedLate = isStartYear && lateEntry;
      /* A late entrant misses the 1st semester of the year they joined. */
      if (!joinedLate) {
        record.terms.push({
          school_year: SAMPLE_SCHOOL_YEARS[year],
          semester: "1st",
        });
      }
      const sitsOutSecond =
        !joinedLate && (index + offset) % SEMESTER_SKIP_STEP === 3;
      if (!sitsOutSecond) {
        record.terms.push({
          school_year: SAMPLE_SCHOOL_YEARS[year],
          semester: "2nd",
        });
      }
      if ((index + offset) % SUMMER_STEP === 5) {
        record.terms.push({
          school_year: SAMPLE_SCHOOL_YEARS[year],
          semester: "Summer",
        });
      }
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
    soloParent: record.soloParent === true,
    genderIdentity: record.genderIdentity,
    income: record.income || null,
    civilStatus: record.civilStatus,
    religion: record.religion,
    birthday: record.birthday,
    startYear: record.startYear,
    terms: record.terms,
  }));
}

/* Built once per module load and shared by the page and the tests. */
export const SAMPLE_STUDENT_RECORDS = buildSampleStudentRecords();

export const SAMPLE_STUDENT_COUNT = SAMPLE_STUDENT_RECORDS.length;