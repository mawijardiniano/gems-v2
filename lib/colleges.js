export const COLLEGES = [
  "Graduate School",
  "College of Agriculture",
  "College of Allied Health Sciences",
  "College of Arts and Social Sciences",
  "College of Business and Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Environmental Studies",
  "College of Fisheries and Aquatic Sciences",
  "College of Governance",
  "College of Industrial Technology",
  "College of Information and Computing Sciences",
];

export const COLLEGE_TO_PROGRAMS = {
  "Graduate School": [
    "Doctor of Education",
    "Master in Information Technology",
    "Master in Public Administration",
    "Master of Arts in Education",
  ],
  "College of Agriculture": [
    "Bachelor in Agricultural Technology",
    "Bachelor of Science in Agriculture",
  ],
  "College of Allied Health Sciences": [
    "Bachelor of Science in Midwifery",
    "Bachelor of Science in Nursing",
  ],
  "College of Arts and Social Sciences": [
    "Bachelor of Arts in Communication",
    "Bachelor of Arts in English Language Studies",
    "Bachelor of Science in Social Work",
  ],
  "College of Business and Accountancy": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Accounting Information System",
    "Bachelor of Science in Business Administration",
    "Bachelor of Science in Entrepreneurship",
    "Bachelor of Science in Tourism Management",
  ],
  "College of Criminal Justice Education": [
    "Bachelor of Science in Criminology",
    "Bachelor of Science in Law Enforcement Administration",
  ],
  "College of Education": [
    "Bachelor of Culture and Arts Education",
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education",
    "Bachelor of Technology and Livelihood Education",
    "Certificate in Teachers Professional Education",
  ],
  "College of Engineering": [
    "Bachelor of Science in Civil Engineering",
    "Bachelor of Science in Computer Engineering",
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
    "Bachelor of Science in Mechanical Engineering",
  ],
  "College of Environmental Studies": [
    "Bachelor of Science in Environmental Science",
  ],
  "College of Fisheries and Aquatic Sciences": [
    "Bachelor of Science in Fisheries",
  ],
  "College of Governance": [
    "Bachelor in Public Administration",
    "Bachelor of Arts in Political Science",
  ],
  "College of Industrial Technology": [
    "Bachelor of Science in Industrial Technology",
  ],
  "College of Information and Computing Sciences": [
    "Bachelor of Science in Information Systems",
    "Bachelor of Science in Information Technology",
  ],
  "Laboratory School": ["Senior-High School"],
};

export const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "6th Year",
];

export const SCOPED_ROLES = ["Dean", "GAD Coordinator"];

/* Canonical list of MarSU colleges and offices used for GAD project
   entries and monitoring filters (colleges first, then offices/units) */
export const OFFICE_OPTIONS = [
  ...COLLEGES,
  "Office of the University President",
  "Office of the Vice President for Academic Affairs",
  "Office of the Vice President for Administration and Finance",
  "Office of the Vice President for Research and Extension",
  "Office of the Vice President for Student Affairs and Services",
  "GAD Unit",
  "HRMU",
];

/* Normalize office names for matching — older GPB entries were free text,
   so values may use "&", the "Offices under the..." wording or odd casing */
export const normalizeOffice = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/^offices under the\s+/, "")
    .replace(/offices under the\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

/* Responsible offices are stored as a list, but older GPB rows saved a single
   free-text value — normalize either shape into a clean array of strings. */
export const toOfficeArray = (value) => {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "value" in value
      ? value.value
      : value;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((o) => String(o || "").trim()).filter(Boolean);
};

/* Canonical options plus any legacy value already saved on the record, so an
   old free-text entry stays visible and selectable. */
export const officeOptionList = (selected) => {
  const extras = toOfficeArray(selected).filter(
    (v) => !OFFICE_OPTIONS.some((o) => normalizeOffice(o) === normalizeOffice(v)),
  );
  return [...extras, ...OFFICE_OPTIONS];
};