/* Field list and payload helpers for editing one staging row. No React and
   no server imports, so the tests can load it directly. */

export const STATUS_OPTIONS = ["Student", "Employee"];
export const SEMESTER_OPTIONS = ["1st", "2nd", "Summer"];
export const SEX_OPTIONS = ["Female", "Male"];

/* `show` limits a field to rows with that status, matching how the mapping
   only fills the academic or the employment section. */
export const EDIT_SECTIONS = [
  {
    title: "Person",
    fields: [
      { path: "personal.first_name" },
      { path: "personal.middle_name" },
      { path: "personal.last_name" },
      { path: "personal.birthday", placeholder: "YYYY-MM-DD" },
      { path: "gadData.sexAtBirth", options: SEX_OPTIONS },
      { path: "personal.currentStatus", options: STATUS_OPTIONS },
    ],
  },
  {
    title: "Student",
    show: "Student",
    fields: [
      { path: "affiliation.academic_information.student_id" },
      { path: "affiliation.academic_information.campus" },
      { path: "affiliation.academic_information.college" },
      { path: "affiliation.academic_information.course" },
      { path: "affiliation.academic_information.year_level" },
    ],
  },
  {
    title: "Employee",
    show: "Employee",
    fields: [
      { path: "affiliation.employment_information.employee_id" },
      { path: "affiliation.employment_information.office" },
      { path: "affiliation.employment_information.employment_status" },
      {
        path: "affiliation.employment_information.employment_appointment_status",
      },
    ],
  },
  {
    title: "Contact",
    fields: [
      { path: "contact.email", type: "email" },
      { path: "contact.mobileNumber" },
    ],
  },
  {
    title: "Term",
    fields: [
      { path: "school_year", placeholder: "2025-2026" },
      { path: "semester", options: SEMESTER_OPTIONS },
    ],
  },
];

export const EDIT_FIELDS = EDIT_SECTIONS.flatMap((s) => s.fields);

/* Keys the mapping always writes as strings; blank stays "" so the
   validator reports them as missing. Other blanks are removed. */
const KEEP_BLANK = new Set([
  "personal.first_name",
  "personal.middle_name",
  "personal.last_name",
  "personal.currentStatus",
  "school_year",
  "semester",
]);

export function getPath(obj, path) {
  return path
    .split(".")
    .reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (const key of keys.slice(0, -1)) {
    if (cur[key] == null || typeof cur[key] !== "object") cur[key] = {};
    cur = cur[key];
  }
  const last = keys[keys.length - 1];
  if (value === undefined) delete cur[last];
  else cur[last] = value;
}

/* A stored birthday may be a full ISO timestamp; the form shows the date. */
function displayValue(path, value) {
  if (value == null) return "";
  const text = String(value);
  if (path === "personal.birthday") {
    const iso = text.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (iso) return iso[1];
  }
  return text;
}

/** Flat { path: string } form values from a row's mapped_payload. */
export function initialEditValues(mapped) {
  const values = {};
  for (const { path } of EDIT_FIELDS) {
    values[path] = displayValue(path, getPath(mapped, path));
  }
  return values;
}

/**
 * The row's mapped_payload with the form values applied. Keys the form does
 * not show (nationality, PWD flags, …) are kept as they were.
 */
export function buildEditedPayload(mapped, values) {
  const next = JSON.parse(JSON.stringify(mapped || {}));
  const status = String(values["personal.currentStatus"] ?? "").trim();

  for (const { path } of EDIT_FIELDS) {
    const text = String(values[path] ?? "").trim();
    let value;
    if (text) value = text;
    else if (path === "personal.birthday") value = null;
    else if (KEEP_BLANK.has(path)) value = "";
    else value = undefined;
    setPath(next, path, value);
  }

  /* Same shape the mapping produces: the section for the other status is
     emptied, so a stale ID there cannot identify the row. */
  setPath(next, "affiliation.person_type", status || undefined);
  if (status === "Student") setPath(next, "affiliation.employment_information", {});
  if (status === "Employee") setPath(next, "affiliation.academic_information", {});

  return next;
}

/** True when the row may be edited in the batch's current state. */
export function canEditRecord(record, batch) {
  if (!record?.mapped_payload || record.payload_cleared_at) return false;
  if (record.status === "migrated") return false;
  if (["migrating", "completed"].includes(batch?.status)) return false;
  return true;
}
