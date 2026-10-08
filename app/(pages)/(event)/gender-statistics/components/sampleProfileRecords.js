/**
 * Named sample profiles (one student per 2026-2027 enrollment head + 685
 * employees) with term histories over 2022-2023 to 2026-2027.
 * Client-safe and deterministic (seeded PRNG): dashboards, reports and user lists
 * all read from this module. scripts/generate-sample-profiles.mjs adds
 * addresses and validates the profiles before writing data/sample-profiles.json.
 */
import { COLLEGE_TO_PROGRAMS } from "../../../../../lib/colleges.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const EMPLOYEE_TOTAL = 685;
/* Five academic years ending on the active 2026-2027 school year. */
const SCHOOL_YEARS = [
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
];
const ACTIVE_TERM = { school_year: "2026-2027", semester: "1st" };
/* Birthdays are pinned relative to the active school year's start. */
const BIRTH_BASE_YEAR = 2026;

/* Index rules for late entrants, skipped 2nd semesters and summer terms */
const SEMESTER_SKIP_STEP = 10;
const SUMMER_STEP = 17;
const LATE_ENTRY_STEP = 41;

/* Fixture start-year targets (Female, Male per start year), scaled below */
/* Student start years are derived from each student's 2026-2027 year level. */
/* Fixture employee sex ratio (612F / 404M), scaled below */
const EMPLOYEE_SEX_WEIGHTS = [612, 404];
/* Employees on board when the window opens (2020-2021), then the hires that
   join in each later school year, scaled below. */
const EMPLOYEE_START_WEIGHTS = [560, 30, 30, 35, 30];
const LGBTQIA_RATE = 0.04;

/* 2026-2027 enrollment per campus / college / program as [course, Male,
   Female] - the active-year headcount the sample reproduces exactly. Majors and
   strands live in the course name ("Program - Major") because
   academic_information has no separate field for them. Grade 11 (1st
   Trimester) is stored as a "1st" term: the term enum has no trimester. */
const TARGET_GROUPS_A = [
  ["Boac", "College of Allied Health Sciences", [
    ["Bachelor of Science in Midwifery", 15, 156],
    ["Bachelor of Science in Nursing", 119, 412],
  ]],
  ["Boac", "College of Arts and Social Sciences", [
    ["Bachelor of Arts in Communication", 76, 174],
    ["Bachelor of Arts in English Language Studies", 36, 119],
    ["Bachelor of Arts in English Language Studies - English Language Studies", 6, 25],
    ["Bachelor of Science in Social Work", 76, 263],
  ]],
  ["Boac", "College of Business and Accountancy", [
    ["Bachelor of Science in Accountancy", 26, 105],
    ["Bachelor of Science in Business Administration - Financial Management", 92, 337],
    ["Bachelor of Science in Business Administration - Human Resource Management", 59, 299],
    ["Bachelor of Science in Business Administration - Marketing Management", 131, 305],
    ["Bachelor of Science in Entrepreneurship", 54, 66],
    ["Bachelor of Science in Entrepreneurship - Entrepreneurial Management", 40, 75],
  ]],
  ["Boac", "College of Criminal Justice Education", [
    ["Bachelor of Science in Criminology", 175, 111],
    ["Bachelor of Science in Law Enforcement Administration", 14, 9],
  ]],
  ["Boac", "College of Education", [
    ["Bachelor of Culture and Arts Education", 57, 77],
    ["Bachelor of Secondary Education - English", 4, 14],
    ["Bachelor of Secondary Education - Mathematics", 19, 44],
    ["Bachelor of Secondary Education - Music, Arts, Physical & Health Education (MAPHE)", 1, 0],
    ["Bachelor of Secondary Education - Science", 25, 87],
    ["Bachelor of Secondary Education - Social Studies", 22, 81],
    ["Bachelor of Technology and Livelihood Education", 1, 0],
    ["Bachelor of Technology and Livelihood Education - Home Economics", 26, 111],
  ]],
  ["Boac", "College of Engineering", [
    ["Bachelor of Science in Civil Engineering", 235, 254],
    ["Bachelor of Science in Computer Engineering", 84, 121],
    ["Bachelor of Science in Electrical Engineering", 119, 48],
    ["Bachelor of Science in Electronics Engineering", 63, 61],
    ["Bachelor of Science in Mechanical Engineering", 136, 40],
  ]],
  ["Boac", "College of Environmental Studies", [
    ["Bachelor of Science in Environmental Science", 60, 81],
  ]],
  ["Boac", "College of Governance", [
    ["Bachelor in Public Administration", 192, 216],
  ]],
];

const TARGET_GROUPS_B = [
  ["Boac", "College of Industrial Technology", [
    ["Bachelor of Industrial Technology - Architectural Drafting Technology", 62, 41],
    ["Bachelor of Industrial Technology - Automotive Technology", 47, 3],
    ["Bachelor of Industrial Technology - Culinary Technology", 63, 102],
    ["Bachelor of Industrial Technology - Electrical Technology", 155, 3],
    ["Bachelor of Industrial Technology - Mechanical Technology", 50, 1],
    ["Bachelor of Industrial Technology - Welding and Fabrication Technology", 35, 6],
    ["Bachelor of Science in Industrial Technology - Automotive Technology", 135, 3],
    ["Bachelor of Science in Industrial Technology - Drafting Technology", 140, 103],
    ["Bachelor of Science in Industrial Technology - Electrical Technology", 242, 6],
    ["Bachelor of Science in Industrial Technology - Food Technology", 99, 139],
    ["Bachelor of Science in Industrial Technology - Mechanical Technology", 107, 2],
    ["Bachelor of Science in Industrial Technology - Welding and Fabrication Technology", 81, 2],
  ]],
  ["Boac", "College of Information and Computing Sciences", [
    ["Bachelor of Science in Information Systems", 250, 196],
    ["Bachelor of Science in Information Technology", 457, 298],
  ]],
  ["Boac", "Laboratory School", [
    ["Junior High School", 55, 104],
    ["Senior-High School (Grade 12) - STEM Strand", 15, 21],
    ["Senior-High School (Grade 11)", 41, 88],
    ["Senior-High School (Grade 11) - HUMSS Strand", 0, 1],
    ["Senior-High School (Grade 11) - STEM Strand", 3, 4],
  ]],
  ["Boac", "Graduate School", [
    ["Master in Information Technology", 6, 6],
    ["Master in Public Administration", 2, 5],
    ["Master in Public Administration - Organization Studies", 25, 27],
    ["Master of Arts in Education - Educational Management", 17, 27],
    ["Master of Arts in Education - Language Teaching", 5, 18],
    ["Master of Arts in Education - Mathematics Teaching", 3, 6],
    ["Master of Arts in Education - Science (Biology) Teaching", 3, 4],
    ["Master of Arts in Education - Science (Physics) Teaching", 0, 1],
    ["Doctor of Education - Curriculum Development and Management", 7, 10],
  ]],
  ["Sta. Cruz", "College of Business and Accountancy", [
    ["Bachelor of Science in Tourism Management", 88, 314],
  ]],
  ["Sta. Cruz", "College of Education", [
    ["Bachelor of Elementary Education", 8, 48],
    ["Bachelor of Elementary Education - General Education", 10, 54],
  ]],
  ["Sta. Cruz", "College of Governance", [
    ["Bachelor of Arts in Political Science", 86, 67],
  ]],
  ["Sta. Cruz", "College of Information and Computing Sciences", [
    ["Bachelor of Science in Information Systems", 79, 113],
  ]],
  ["Torrijos", "College of Agriculture", [
    ["Bachelor of Science in Agriculture", 154, 116],
    ["Bachelor of Science in Agriculture - Animal Science", 1, 0],
  ]],
  ["Gasan", "College of Fisheries and Aquatic Sciences", [
    ["Bachelor of Science in Fisheries", 192, 156],
    ["Bachelor of Science in Fisheries - Aquaculture", 1, 0],
  ]],
];
const STUDENT_TARGETS = [...TARGET_GROUPS_A, ...TARGET_GROUPS_B].flatMap(
  ([campus, college, rows]) =>
    rows.map(([course, male, female]) => ({
      campus,
      college,
      course,
      male,
      female,
    })),
);
const STUDENT_TOTAL = STUDENT_TARGETS.reduce(
  (sum, t) => sum + t.male + t.female,
  0,
);

const COLLEGE_WEIGHTS = [
  ["College of Information and Computing Sciences", 14],
  ["College of Engineering", 12],
  ["College of Allied Health Sciences", 12],
  ["College of Business and Accountancy", 12],
  ["College of Education", 12],
  ["College of Criminal Justice Education", 9],
  ["College of Arts and Social Sciences", 7],
  ["College of Agriculture", 5],
  ["College of Governance", 4],
  ["College of Industrial Technology", 4],
  ["College of Environmental Studies", 3],
  ["College of Fisheries and Aquatic Sciences", 3],
  ["Graduate School", 3],
];

const NON_COLLEGE_OFFICES = [
  "Office of the President",
  "University and Board Secretary",
  "Office of the Vice President for Administration and Finance",
  "Office of the Vice President for Academic Affairs",
  "Office of the Chief Administrative Officer",
  "Quality Assurance Office",
  "Planning Unit",
  "Human Resource and Management Unit",
  "Legal Unit",
  "Records Office",
  "Budget Office",
  "Internal Audit Unit",
  "Information Unit",
  "Procurement Unit",
  "Supply and Property Management Unit",
  "Accounting Office",
  "Cash Unit",
  "Registrar's Office",
  "Health Services Unit",
  "Research & Extension Office",
  "Learning Resource Center",
  "General Services Unit",
  "Project Management Unit",
  "Business Affairs Office",
  "Motorpool",
  "Information and Communication Technology Unit",
  "Security Services",
  "Gasan Campus",
  "Torrijos Campus",
  "Santa Cruz Campus",
];
const CAMPUS_OFFICES = ["Gasan Campus", "Torrijos Campus", "Santa Cruz Campus"];

/* Key officials carved out of the generated employees (by index), so the
   employee total never changes. Level names match POSITION_LEVEL_ORDER in
   employeeStats.js; status/appointment follow the live enums. */
const OFFICIALS = [
  {
    level: "University President",
    office: "Office of the President",
    status: "Non-teaching Personnel",
    appointment: "Coterminous",
  },
  ...[
    "Office of the Vice President for Administration and Finance",
    "Office of the Vice President for Academic Affairs",
    "Office of the Chief Administrative Officer",
  ].map((office) => ({
    level: "Vice President",
    office,
    status: "Non-teaching Personnel",
    appointment: "Coterminous",
  })),
  ...[
    "University and Board Secretary",
    "Quality Assurance Office",
    "Planning Unit",
    "Human Resource and Management Unit",
    "Registrar's Office",
    "Research & Extension Office",
    "Learning Resource Center",
    "Information and Communication Technology Unit",
  ].map((office) => ({
    level: "Directors",
    office,
    status: "Non-teaching Personnel",
    appointment: "Regular",
  })),
  ...COLLEGE_WEIGHTS.map(([office]) => ({
    level: "Deans",
    office,
    status: "Faculty",
    appointment: "Regular",
  })),
  ...COLLEGE_WEIGHTS.slice(0, 10).map(([office]) => ({
    level: "Department Chairs",
    office,
    status: "Faculty",
    appointment: "Regular",
  })),
];

const APPOINTMENT_WEIGHTS = {
  "Non-teaching Personnel": [
    ["Regular", 40],
    ["Temporary", 5],
    ["Coterminous", 5],
    ["Casual", 15],
    ["Job Order", 15],
    ["Contract of Service (Skilled)", 15],
    ["Utility Worker", 5],
  ],
  Faculty: [
    ["Regular", 40],
    ["Temporary", 10],
    ["University Lecturer", 15],
    ["Part-time Lecturer", 20],
    ["Clinical Instructor", 5],
    ["Adjunct", 10],
  ],
};

const RELIGIONS = [
  ["Roman Catholic", 80],
  ["Aglipayan Church (Philippine Independent Church)", 3],
  ["Iglesia ni Cristo (Church of Christ)", 4],
  ["United Church of Christ in the Philippines (UCCP)", 2],
  ["Baptist Church", 2],
  ["Seventh-day Adventist Church", 2],
  ["Jesus Is Lord Church (JIL)", 2],
  ["Victory Christian Fellowship", 1],
  ["Other", 4],
];
const BLOOD_TYPES = [
  ["O+", 36],
  ["A+", 24],
  ["B+", 22],
  ["AB+", 6],
  ["O-", 3],
  ["A-", 2],
  ["B-", 2],
  ["AB-", 1],
  ["Unknown", 4],
];
const PWD_TYPES = [
  "Psychosocial Disability",
  "Chronic Illness",
  "Learning Disability",
  "Visual Disability",
  "Hearing Disability",
  "Physical Disability",
  "Speech and Language Impairment",
];

const FEMALE_NAMES = [
  "Maria", "Ana", "Angelica", "Jasmine", "Kristine", "Mary Grace", "Joanna",
  "Rhea", "Michelle", "Carla", "Jenny", "Liza", "Cherry", "Rose Ann", "Maricel",
  "Jessa", "Katrina", "Nicole", "Princess", "Shiela", "Aileen", "Bernadette",
  "Camille", "Divina", "Elaine", "Faith", "Grace", "Hazel", "Irene", "Jocelyn",
  "Kimberly", "Lea", "Mikaela", "Noemi", "Ofelia", "Patricia", "Queenie",
  "Rowena", "Sheryl", "Trisha", "Vanessa", "Wendy", "Yvonne", "Zenaida",
  "Alyssa", "Beatriz", "Charmaine", "Denise", "Erika", "Fe", "Gemma", "Hannah",
  "Ivy", "Jhoanna", "Kyla", "Lorraine", "Marites", "Nerissa", "Precious",
  "Rizza",
];
const MALE_NAMES = [
  "Juan", "Jose", "Mark", "John Paul", "Christian", "Jericho", "Kevin", "Rey",
  "Carlo", "Angelo", "Michael", "Joshua", "Daniel", "Paolo", "Ramil", "Jun",
  "Arnel", "Benjie", "Cedric", "Dennis", "Edgar", "Fernando", "Gilbert",
  "Harold", "Ian", "Jayson", "Kenneth", "Lester", "Marvin", "Nathaniel",
  "Oscar", "Patrick", "Rommel", "Sherwin", "Tristan", "Vincent", "Wilfredo",
  "Xavier", "Yñigo", "Zandro", "Alvin", "Bryan", "Christopher", "Dominic",
  "Emmanuel", "Francis", "Gerald", "Henry", "Ivan", "Jomar", "Karl", "Leo",
  "Mico", "Noel", "Rodel", "Rolando", "Ronnie", "Samuel", "Teddy", "Victor",
];
const SURNAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
  "Torres", "Tomas", "Andrada", "Castillo", "Aquino", "Villanueva", "Ramos",
  "Dela Cruz", "Mercado", "Navarro", "Salazar", "Fernandez", "Lopez",
  "Gonzales", "Flores", "Rivera", "Morales", "Domingo", "Soriano", "Valdez",
  "Pascual", "Manalo", "Marasigan", "Magsino", "Lim", "Dela Peña", "Nuñez",
  "Zapanta", "Sison", "Rosales", "Perez", "Alcantara", "Evangelista",
  "Aguilar", "Buenaventura", "Calma", "Dimaano", "Españo", "Famisan",
  "Galang", "Hernandez", "Ibañez", "Jimenez", "Lacson", "Macalintal",
  "Natividad", "Obligacion", "Panganiban", "Quiambao", "Retuya", "Servando",
  "Tolentino", "Umali", "Vergara", "Yap", "Zafra", "Angeles", "Bacolod",
  "Catapang", "Dizon", "Estrella", "Fajardo", "Guevarra", "Hizon", "Inocencio",
  "Javier", "Lucero", "Malabanan", "Nepomuceno", "Oliva", "Padilla", "Real",
  "Silvestre", "Tabuena", "Urbano", "Velasco", "Zulueta", "Abad", "Basa",
  "Capistrano", "Diaz", "Elepaño", "Fulgencio", "Gutierrez",
];

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250501);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const pad = (n, size) => String(n).padStart(size, "0");

function weighted(entries) {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/* Largest-remainder apportionment: integer shares that sum to `total` */
function apportion(weights, total) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w * total) / sum);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, left)
    .forEach(([, i]) => {
      out[i] += 1;
    });
  return out;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const slug = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const objectId = (n) => `67f0a1b2c3d4${n.toString(16).padStart(12, "0")}`;


/* ------------------------------------------------------------------ */
/* Person builder (shared by students and employees)                   */
/* ------------------------------------------------------------------ */

const seenNameBirthday = new Set();
let personSeq = 0;

function buildPerson({ sex, age, status }) {
  personSeq += 1;
  let first;
  let middle;
  let last;
  let birthday;
  let key;
  do {
    first = pick(sex === "Female" ? FEMALE_NAMES : MALE_NAMES);
    if (chance(0.2)) {
      const second = pick(sex === "Female" ? FEMALE_NAMES : MALE_NAMES);
      if (second !== first) first = `${first} ${second}`;
    }
    last = pick(SURNAMES);
    do {
      middle = pick(SURNAMES);
    } while (middle === last);
    birthday = `${BIRTH_BASE_YEAR - age}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`;
    key = `${first}|${middle}|${last}|${birthday}`.toLowerCase();
  } while (seenNameBirthday.has(key));
  seenNameBirthday.add(key);

  const civil_status =
    age < 25
      ? "Single"
      : weighted([
          ["Single", 60],
          ["Married", 32],
          ["Separated", 3],
          ["Living In/Common Law", 3],
          ["Widow", 2],
        ]);
  const religion = weighted(RELIGIONS);
  const isPWD = chance(0.03);

  const gadData = {
    sexAtBirth: sex,
    gender_preference: chance(LGBTQIA_RATE) ? "LGBTQIA+" : sex,
    isPWD,
    isIndigenousPerson: chance(0.02),
    socioEconomicStatus: weighted([
      ["Low Income", 60],
      ["Middle Income", 33],
      ["High Income", 7],
    ]),
    headOfHousehold: `${pick(MALE_NAMES)} ${pick(SURNAMES)[0]}. ${last}`,
  };
  if (isPWD) gadData.pwd_type = pick(PWD_TYPES);

  return {
    first,
    middle,
    last,
    seq: personSeq,
    personal: {
      first_name: first,
      middle_name: middle,
      last_name: last,
      civil_status,
      religion,
      religion_other: religion === "Other" ? "Born Again Christian" : "",
      nationality: "Filipino",
      currentStatus: status,
      birthday,
      bloodType: weighted(BLOOD_TYPES),
    },
    gadData,
    contact: {
      email: `${slug(first.split(" ")[0])}.${slug(last)}.${pad(personSeq, 5)}@sample.gems.test`,
      mobileNumber: `0917${pad(personSeq, 7)}`,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

const YEAR_LABELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const AGE_BUCKETS = [
  [[16, 19], 1180],
  [[20, 29], 1880],
  [[30, 39], 270],
  [[40, 49], 95],
];

const LAST_IDX = SCHOOL_YEARS.length - 1;

/* One spec per 2026-2027 student, taken straight from the target table so the
   active-year headcount per campus/college/program/sex is exact. */
function studentSpecs() {
  const specs = [];
  STUDENT_TARGETS.forEach((target) => {
    const people = [
      ...Array(target.female).fill("Female"),
      ...Array(target.male).fill("Male"),
    ];
    people.forEach((sex) => specs.push({ ...target, sex }));
  });
  return shuffle(specs);
}

function buildStudents() {
  return studentSpecs().map(({ sex, campus, college, course }, i) => {
    const graduate = college === "Graduate School";
    const school = college === "Laboratory School";
    const [minAge, maxAge] = graduate
      ? [23, 45]
      : school
        ? course.startsWith("Junior")
          ? [12, 15]
          : [16, 18]
        : weighted(AGE_BUCKETS);
    const person = buildPerson({
      sex,
      age: int(minAge, maxAge),
      status: "Student",
    });
    const _id = objectId(person.seq);
    const isScholar = chance(0.25) ? "Yes" : "No";

    /* Work backwards from the 2026-2027 standing: a student now in year L
       enrolled L years earlier (one more when irregular). Graduate and
       Laboratory School students carry no college year level. */
    const hasLevel = !graduate && !school;
    const currentLevel = hasLevel
      ? weighted([[0, 30], [1, 25], [2, 25], [3, 20]])
      : 0;
    const back = hasLevel
      ? Math.min(LAST_IDX, currentLevel + (chance(0.1) ? 1 : 0))
      : weighted([[0, 40], [1, 30], [2, 20], [3, 10]]);
    const startIdx = LAST_IDX - back;
    const student_id = `${SCHOOL_YEARS[startIdx].slice(0, 4)}-${pad(person.seq, 5)}`;
    const lateEntry = back > 0 && i % LATE_ENTRY_STEP === 7;

    const academic = (year_level) => {
      const info = { student_id, campus, college, course, isScholar };
      if (year_level) info.year_level = year_level;
      return { academic_information: info };
    };

    const profile_terms = [];
    for (let y = 0; startIdx + y < SCHOOL_YEARS.length; y += 1) {
      const school_year = SCHOOL_YEARS[startIdx + y];
      const isLastYear = startIdx + y === SCHOOL_YEARS.length - 1;
      const year_level = hasLevel
        ? YEAR_LABELS[Math.max(0, currentLevel - (back - y))]
        : undefined;
      const semesters = [];
      if (!(y === 0 && lateEntry)) semesters.push("1st");
      if (!isLastYear) {
        if ((y === 0 && lateEntry) || (i + y) % SEMESTER_SKIP_STEP !== 3) {
          semesters.push("2nd");
        }
        if ((i + y) % SUMMER_STEP === 5) semesters.push("Summer");
      }
      semesters.forEach((semester) =>
        profile_terms.push({
          profile_id: _id,
          school_year,
          semester,
          affiliation: academic(year_level),
        }),
      );
    }

    const current = profile_terms[profile_terms.length - 1].affiliation;
    return {
      _id,
      personal: person.personal,
      gadData: person.gadData,
      affiliation: JSON.parse(JSON.stringify(current)),
      contact: person.contact,
      fullName: [person.first, person.middle, person.last].join(" "),
      active_term: { ...ACTIVE_TERM },
      profile_terms,
      _meta: { startYear: SCHOOL_YEARS[startIdx] },
    };
  });
}

/* ------------------------------------------------------------------ */
/* Employees                                                           */
/* ------------------------------------------------------------------ */

function buildEmployees() {
  const [females, males] = apportion(EMPLOYEE_SEX_WEIGHTS, EMPLOYEE_TOTAL);
  const sexes = shuffle([
    ...Array(females).fill("Female"),
    ...Array(males).fill("Male"),
  ]);

  /* Pass 1: draw every random value exactly as before so the seeded
     sequence is unchanged. */
  const rolled = sexes.map((sex, i) => {
    const person = buildPerson({
      sex,
      age: int(22, 64),
      status: "Employee",
    });
    const rolledStatus = chance(0.55) ? "Faculty" : "Non-teaching Personnel";
    const rolledOffice =
      rolledStatus === "Faculty"
        ? chance(0.88)
          ? weighted(COLLEGE_WEIGHTS.filter(([c]) => c !== "Graduate School"))
          : pick(CAMPUS_OFFICES)
        : pick(NON_COLLEGE_OFFICES);
    const employeeId = `EMP-${int(2000, 2026)}-${pad(i + 1, 4)}`;
    const rolledAppointment = weighted(APPOINTMENT_WEIGHTS[rolledStatus]);
    return {
      person,
      rolledStatus,
      rolledOffice,
      employeeId,
      rolledAppointment,
    };
  });

  /* Pass 2: give each official to the next unused record that already has
     the same personnel status and a non-job-order appointment, so the
     Faculty / Administrative / Job Order totals never change. */
  const officialAt = new Map();
  for (const official of OFFICIALS) {
    const idx = rolled.findIndex(
      (entry, k) =>
        !officialAt.has(k) &&
        entry.rolledStatus === official.status &&
        entry.rolledAppointment === official.appointment,
    );
    if (idx !== -1) officialAt.set(idx, official);
  }

  /* Pass 3: appointment history. Key officials are on board for the whole
     window; everyone else joins in the year their cohort is hired, so the
     headcount grows year over year. Runs after every pass-1 draw, so the
     people, offices and sexes above are unchanged. */
  const startIdxOf = new Map();
  const regular = rolled.map((_, k) => k).filter((k) => !officialAt.has(k));
  const cohortSizes = apportion(EMPLOYEE_START_WEIGHTS, regular.length);
  const cohortYears = [];
  cohortSizes.forEach((size, startIdx) => {
    for (let n = 0; n < size; n += 1) cohortYears.push(startIdx);
  });
  shuffle(cohortYears);
  regular.forEach((k, n) => startIdxOf.set(k, cohortYears[n]));

  return rolled.map((entry, i) => {
    const { person, rolledStatus, rolledOffice, employeeId, rolledAppointment } =
      entry;
    const _id = objectId(person.seq);
    const official = officialAt.get(i) || null;
    const employment_status = official ? official.status : rolledStatus;
    const employment_information = {
      employee_id: employeeId,
      office: official ? official.office : rolledOffice,
      employment_status,
      employment_appointment_status: rolledAppointment,
    };

    const startIdx = startIdxOf.get(i) ?? 0;
    const profile_terms = SCHOOL_YEARS.slice(startIdx).map((school_year) => ({
      profile_id: _id,
      school_year,
      semester: "1st",
      affiliation: { employment_information: { ...employment_information } },
    }));

    return {
      _id,
      personal: person.personal,
      gadData: person.gadData,
      affiliation: { employment_information },
      contact: person.contact,
      fullName: [person.first, person.middle, person.last].join(" "),
      active_term: { ...ACTIVE_TERM },
      profile_terms,
      _meta: {
        startYear: SCHOOL_YEARS[startIdx],
        officialLevel: official ? official.level : null,
      },
    };
  });
}

/* ------------------------------------------------------------------ */
/* Public exports                                                      */
/* ------------------------------------------------------------------ */

export const SAMPLE_SCHOOL_YEARS = SCHOOL_YEARS;
export const SAMPLE_STUDENT_TOTAL = STUDENT_TOTAL;

/* Full profiles (with `profile_terms`), built once per module load. */
export const SAMPLE_STUDENT_PROFILES = buildStudents();
export const SAMPLE_EMPLOYEE_PROFILES = buildEmployees();

const JOB_ORDER_STATUSES = [
  "Job Order",
  "Contract of Service (Skilled)",
  "Utility Worker",
];
const ACADEMIC_RANKS = [
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
const RANK_STEPS = [0, 0, 0, 1, 1, 2, 3, 3, 4, 5, 6, 7, 8, 1, 2, 4];

const hasFamily = (status) =>
  ["Married", "Separated", "Living In/Common Law", "Widow"].includes(status);

function termsOf(profile) {
  return profile.profile_terms.map((term) => ({
    school_year: term.school_year,
    semester: term.semester,
  }));
}

/* Flat records for the stats modules (studentStats / employeeStats). */
export const SAMPLE_STUDENT_PROFILE_RECORDS = SAMPLE_STUDENT_PROFILES.map(
  (profile, index) => {
    const info = profile.affiliation.academic_information;
    return {
      id: profile._id,
      fullName: profile.fullName,
      studentId: info.student_id,
      email: profile.contact.email,
      sex: profile.gadData.sexAtBirth,
      campus: info.campus,
      college: info.college,
      course: info.course,
      yearLevel: info.year_level || null,
      scholar: info.isScholar === "Yes",
      pwd: profile.gadData.isPWD === true,
      indigenous: profile.gadData.isIndigenousPerson === true,
      soloParent:
        hasFamily(profile.personal.civil_status) && index % 6 === 0,
      genderIdentity: profile.gadData.gender_preference,
      income: profile.gadData.socioEconomicStatus || null,
      civilStatus: profile.personal.civil_status,
      religion: profile.personal.religion,
      birthday: profile.personal.birthday,
      startYear: profile._meta.startYear,
      terms: termsOf(profile),
    };
  },
);

export const SAMPLE_EMPLOYEE_PROFILE_RECORDS = SAMPLE_EMPLOYEE_PROFILES.map(
  (profile, index) => {
    const info = profile.affiliation.employment_information;
    const faculty = info.employment_status === "Faculty";
    const jobOrder = JOB_ORDER_STATUSES.includes(
      info.employment_appointment_status,
    );
    const programs = COLLEGE_TO_PROGRAMS[info.office];
    const years = profile.profile_terms.map((term) => term.school_year);
    return {
      id: profile._id,
      fullName: profile.fullName,
      employeeId: info.employee_id,
      email: profile.contact.email,
      office: info.office,
      sex: profile.gadData.sexAtBirth,
      personnelType: faculty
        ? "Faculty"
        : jobOrder
          ? "Job Order/Contractual"
          : "Administrative Staff",
      positionLevel:
        profile._meta.officialLevel ||
        (faculty
          ? "Faculty"
          : jobOrder
            ? "Job Order/Contractual"
            : "Administrative Personnel"),
      academicRank: faculty
        ? ACADEMIC_RANKS[RANK_STEPS[index % RANK_STEPS.length]]
        : null,
      appointmentStatus: info.employment_appointment_status,
      department:
        faculty && programs?.length ? programs[index % programs.length] : null,
      startYear: years[0],
      years,
      scholar: false,
      pwd: profile.gadData.isPWD === true,
      indigenous: profile.gadData.isIndigenousPerson === true,
      soloParent:
        hasFamily(profile.personal.civil_status) && index % 6 === 0,
      genderIdentity: profile.gadData.gender_preference,
      income: profile.gadData.socioEconomicStatus || null,
      civilStatus: profile.personal.civil_status,
      religion: profile.personal.religion,
      birthday: profile.personal.birthday,
    };
  },
);

export const SAMPLE_STUDENT_PROFILE_COUNT =
  SAMPLE_STUDENT_PROFILE_RECORDS.length;
export const SAMPLE_EMPLOYEE_PROFILE_COUNT =
  SAMPLE_EMPLOYEE_PROFILE_RECORDS.length;

/* Row shaped like /api/profile/list items, so the user-list tables render
   sample profiles unchanged. */
export function toSampleListRow(profile) {
  return {
    _id: profile._id,
    fullName: profile.fullName,
    active_term: profile.active_term,
    profile_terms: profile.profile_terms,
    personal_info_id: {
      personal: profile.personal,
      gadData: profile.gadData,
      affiliation: profile.affiliation,
      contact: profile.contact,
    },
  };
}

export const SAMPLE_STUDENT_LIST_ROWS =
  SAMPLE_STUDENT_PROFILES.map(toSampleListRow);
export const SAMPLE_EMPLOYEE_LIST_ROWS =
  SAMPLE_EMPLOYEE_PROFILES.map(toSampleListRow);

