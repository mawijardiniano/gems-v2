/* Checks an import row's affiliation against the GemsProfile schema, so a
   value the profile would refuse (an office, campus, college or employment
   status that is not in the schema's list) is reported at validate time
   instead of failing the row during migration. Kept apart from mapping.js,
   which stays free of database imports. */
import GemsProfile from "@/models/profile";
import employmentInformationSchema from "@/models/employment_information";
import academicInformationSchema from "@/models/academic_information";

/* Loose form of a value for matching: case, punctuation, "&" vs "and" and
   extra spaces do not matter ("budget office", "Research and Extension
   Office", "Registrars Office" all find their listed value). */
function looseKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[.,()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Common short forms and old names, keyed by looseKey. Values must be listed
   in the schema enum. */
const ALIASES = {
  office: {
    "op": "Office of the President",
    "hrmu": "Human Resource and Management Unit",
    "hrm unit": "Human Resource and Management Unit",
    "human resource management unit": "Human Resource and Management Unit",
    "hr": "Human Resource and Management Unit",
    "hrmo": "Human Resource and Management Unit",
    "registrar": "Registrar's Office",
    "office of the registrar": "Registrar's Office",
    "accounting": "Accounting Office",
    "budget": "Budget Office",
    "records": "Records Office",
    "cashier": "Cash Unit",
    "cash office": "Cash Unit",
    "ict": "Information and Communication Technology Unit",
    "ictu": "Information and Communication Technology Unit",
    "ict unit": "Information and Communication Technology Unit",
    "mis": "Information and Communication Technology Unit",
    "qao": "Quality Assurance Office",
    "rdeo": "Research & Extension Office",
    "research office": "Research & Extension Office",
    "lrc": "Learning Resource Center",
    "library": "Learning Resource Center",
    "gsu": "General Services Unit",
    "pmu": "Project Management Unit",
    "bao": "Business Affairs Office",
    "spmu": "Supply and Property Management Unit",
    "supply office": "Supply and Property Management Unit",
    "iau": "Internal Audit Unit",
    "security": "Security Services",
    "motor pool": "Motorpool",
    "clinic": "Health Services Unit",
    "sta cruz campus": "Santa Cruz Campus",
    "gs": "Graduate School",
    "ca": "College of Agriculture",
    "cahs": "College of Allied Health Sciences",
    "cass": "College of Arts and Social Sciences",
    "cba": "College of Business and Accountancy",
    "ccje": "College of Criminal Justice Education",
    "ced": "College of Education",
    "coed": "College of Education",
    "cen": "College of Engineering",
    "coe": "College of Engineering",
    "ces": "College of Environmental Studies",
    "cfas": "College of Fisheries and Aquatic Sciences",
    "cg": "College of Governance",
    "cit": "College of Industrial Technology",
    "cics": "College of Information and Computing Sciences",
  },
  college: {
    "gs": "Graduate School",
    "ca": "College of Agriculture",
    "cahs": "College of Allied Health Sciences",
    "cass": "College of Arts and Social Sciences",
    "cba": "College of Business and Accountancy",
    "ccje": "College of Criminal Justice Education",
    "ced": "College of Education",
    "coed": "College of Education",
    "cen": "College of Engineering",
    "coe": "College of Engineering",
    "ces": "College of Environmental Studies",
    "cfas": "College of Fisheries and Aquatic Sciences",
    "cg": "College of Governance",
    "cit": "College of Industrial Technology",
    "cics": "College of Information and Computing Sciences",
    "lab school": "Laboratory School",
  },
  campus: {
    "santa cruz": "Sta. Cruz",
    "sta cruz": "Sta. Cruz",
    "main": "Boac",
    "main campus": "Boac",
    "boac campus": "Boac",
    "gasan campus": "Gasan",
    "torrijos campus": "Torrijos",
    "santa cruz campus": "Sta. Cruz",
    "sta cruz campus": "Sta. Cruz",
  },
  employment_status: {
    "non teaching": "Non-teaching Personnel",
    "nonteaching": "Non-teaching Personnel",
    "non teaching staff": "Non-teaching Personnel",
    "staff": "Non-teaching Personnel",
    "teaching": "Faculty",
    "teaching personnel": "Faculty",
  },
  employment_appointment_status: {
    "jo": "Job Order",
    "cos": "Contract of Service (Skilled)",
    "contract of service": "Contract of Service (Skilled)",
    "permanent": "Regular",
    "co terminous": "Coterminous",
    "part time lecturer": "Part-time Lecturer",
    "parttime lecturer": "Part-time Lecturer",
  },
};

const ENUM_FIELDS = [
  ["employment_information", employmentInformationSchema, "office"],
  ["employment_information", employmentInformationSchema, "employment_status"],
  [
    "employment_information",
    employmentInformationSchema,
    "employment_appointment_status",
  ],
  ["academic_information", academicInformationSchema, "campus"],
  ["academic_information", academicInformationSchema, "college"],
];

/* field -> Map<looseKey, listed value>, built once from the schema enums
   and the alias table. */
const LOOKUP = new Map(
  ENUM_FIELDS.map(([, schema, field]) => {
    const allowed = schema.path(field)?.enumValues || [];
    const map = new Map(allowed.map((v) => [looseKey(v), v]));
    for (const [alias, value] of Object.entries(ALIASES[field] || {})) {
      if (allowed.includes(value) && !map.has(alias)) map.set(alias, value);
    }
    return [field, map];
  }),
);

/**
 * Rewrites listed affiliation values (office, campus, college, employment
 * status, appointment status) to the exact spelling the profile schema
 * accepts, matching without regard to case or punctuation and through the
 * alias table. Values that match nothing are left as they are, so
 * `affiliationSchemaErrors` still reports them. Mutates `mapped`; returns
 * `[{ field, from, to }]` for the values it changed.
 */
export function canonicalizeAffiliation(mapped) {
  const changes = [];
  const affiliation = mapped?.affiliation;
  if (!affiliation) return changes;
  for (const [section, , field] of ENUM_FIELDS) {
    const info = affiliation[section];
    const value = info?.[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const listed = LOOKUP.get(field)?.get(looseKey(value));
    if (listed && listed !== value) {
      info[field] = listed;
      changes.push({ field: `affiliation.${section}.${field}`, from: value, to: listed });
    }
  }
  return changes;
}

function fieldLabel(path) {
  const last = path.split(".").pop() || path;
  const words = last.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Returns validation errors for affiliation values the profile schema does
 * not accept. Only enum and type errors are reported: a missing value is not,
 * because on an update the stored profile supplies it, and the required
 * fields the import needs are already checked by `validateMappedPayload`.
 */
export function affiliationSchemaErrors(mapped) {
  const affiliation = mapped?.affiliation;
  if (!affiliation) return [];

  const result = new GemsProfile({ affiliation }).validateSync();
  if (!result?.errors) return [];

  const errors = [];
  for (const [path, err] of Object.entries(result.errors)) {
    if (!path.startsWith("affiliation.")) continue;
    if (err.kind !== "enum" && err.name !== "CastError") continue;
    errors.push({
      field: path,
      code: "not_allowed",
      message: `${fieldLabel(path)} "${err.value}" is not one of the accepted values. Correct it in the source file before importing.`,
    });
  }
  return errors;
}
