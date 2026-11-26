/* Column-name matching for imported files and feeds. A column counts as a
   field when its name, ignoring case, spaces and punctuation, is one of the
   field's names below ("Employee No.", "EMPLOYEE_NO" and "employeeNo" all
   read as employee_id). No server imports: the field mapping panel uses
   this list too. */

/* `key` is the column name the mapping reads (see mapToStagingPayload).
   `names` are compared after looseHeader(). */
export const HEADER_FIELDS = [
  { key: "first_name", label: "First name", names: ["firstname", "fname", "givenname", "first"] },
  { key: "middle_name", label: "Middle name", names: ["middlename", "mname", "midname", "middle"] },
  { key: "last_name", label: "Last name", names: ["lastname", "lname", "surname", "familyname", "last"] },
  { key: "birthday", label: "Birthday", names: ["birthday", "birthdate", "dateofbirth", "dob", "bday"] },
  { key: "sex", label: "Sex at birth", names: ["sex", "sexatbirth", "gender"] },
  { key: "gender_preference", label: "Gender preference", names: ["genderpreference", "genderidentity"] },
  { key: "nationality", label: "Nationality", names: ["nationality", "citizenship"] },
  { key: "civil_status", label: "Civil status", names: ["civilstatus", "maritalstatus"] },
  { key: "status", label: "Status (Student / Employee)", names: ["status", "currentstatus", "persontype"] },
  { key: "student_id", label: "Student No.", names: ["studentid", "studentno", "studentnumber", "studno", "studid"] },
  { key: "campus", label: "Campus", names: ["campus", "campusname"] },
  { key: "college", label: "College", names: ["college", "collegename"] },
  { key: "course", label: "Course", names: ["course", "program", "programname", "progname", "coursename"] },
  { key: "year_level", label: "Year level", names: ["yearlevel", "yrlevel"] },
  { key: "employee_id", label: "Employee No.", names: ["employeeid", "employeeno", "employeenumber", "empid", "empno", "employeecode"] },
  { key: "office", label: "Office", names: ["office", "officename"] },
  { key: "employment_status", label: "Employment status", names: ["employmentstatus", "empstatus"] },
  { key: "employment_appointment_status", label: "Appointment status", names: ["employmentappointmentstatus", "appointmentstatus", "natureofappointment"] },
  { key: "email", label: "Email", names: ["email", "emailaddress", "mail"] },
  { key: "mobile_number", label: "Mobile number", names: ["mobilenumber", "mobileno", "mobile", "cellphone", "cellphonenumber", "contactnumber", "contactno", "phone", "phonenumber"] },
  { key: "isPWD", label: "PWD (true / false)", names: ["ispwd"] },
  { key: "isIndigenousPerson", label: "Indigenous person (true / false)", names: ["isindigenousperson"] },
  { key: "school_year", label: "School year", names: ["schoolyear", "sy", "academicyear", "ay"] },
  { key: "semester", label: "Semester", names: ["semester", "sem", "term"] },
];

const FIELD_BY_KEY = new Map(HEADER_FIELDS.map((f) => [f.key, f]));
const KEY_BY_NAME = new Map();
for (const field of HEADER_FIELDS) {
  for (const name of field.names) KEY_BY_NAME.set(name, field.key);
}

/** "Employee No." -> "employeeno". */
export function looseHeader(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Column names across the rows, in first-seen order. */
export function collectColumns(rows) {
  const seen = new Set();
  for (const row of rows || []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const key of Object.keys(row)) seen.add(key);
  }
  return [...seen];
}

/**
 * Map of source column -> field key. `custom` ({ "Column name": "field_key" },
 * saved by an admin) wins over the built-in names. The first column that
 * matches a field takes it; later ones are left unused.
 */
export function buildHeaderMap(columns, custom = {}) {
  const customByLoose = new Map();
  for (const [column, key] of Object.entries(custom || {})) {
    if (FIELD_BY_KEY.has(key)) customByLoose.set(looseHeader(column), key);
  }
  const map = new Map();
  const taken = new Set();
  /* Two passes so a saved mapping claims its field before a built-in name
     in an earlier column can. */
  for (const column of columns) {
    const key = customByLoose.get(looseHeader(column));
    if (key && !taken.has(key)) {
      map.set(column, key);
      taken.add(key);
    }
  }
  for (const column of columns) {
    if (map.has(column)) continue;
    const key = KEY_BY_NAME.get(looseHeader(column));
    if (key && !taken.has(key)) {
      map.set(column, key);
      taken.add(key);
    }
  }
  return map;
}

/**
 * The row with each matched column also stored under its field key, so the
 * mapping finds it. The original columns stay (raw_payload keeps them).
 */
export function canonicalizeRow(raw, headerMap) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const out = { ...raw };
  for (const [column, key] of headerMap) {
    if (column === key || !(column in raw)) continue;
    out[key] = raw[column];
  }
  return out;
}

const ID_KEYS = ["student_id", "employee_id", "email"];

/**
 * What the file's columns mean for the import, before any row is checked:
 * which columns were used, which were not, and problems that will fail
 * every row. Holds column names only, never row values.
 */
export function headerReport(columns, headerMap, defaults = {}) {
  const keys = new Set(headerMap.values());
  const recognized = [...headerMap].map(([column, key]) => ({
    column,
    field: FIELD_BY_KEY.get(key)?.label || key,
  }));
  const unrecognized = columns.filter((c) => !headerMap.has(c));

  const missing = [];
  const problems = [];
  if (!keys.has("first_name")) missing.push("First name");
  if (!keys.has("last_name")) missing.push("Last name");
  if (!ID_KEYS.some((k) => keys.has(k))) {
    missing.push("Student No., Employee No. or Email");
  }
  if (missing.length) {
    problems.push(
      `No ${missing.join(", ")} column was found, so every row will fail validation.`,
    );
  }
  if (!keys.has("status") && !keys.has("student_id") && !keys.has("employee_id")) {
    problems.push(
      "No Status, Student No. or Employee No. column was found, so no row can be marked Student or Employee.",
    );
  }
  if (!keys.has("school_year") && !String(defaults.school_year || "").trim()) {
    problems.push(
      "No School year column was found and no default school year was picked.",
    );
  }
  if (!keys.has("semester") && !String(defaults.semester || "").trim()) {
    problems.push(
      "No Semester column was found and no default semester was picked.",
    );
  }
  return { columns, recognized, unrecognized, missing, problems };
}
