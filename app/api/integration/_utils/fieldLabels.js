/* Plain-language names for import field paths, and readable versions of
   database errors, for messages shown on the integration pages. No server
   imports: the client components use this too. */

const FIELD_LABELS = {
  identity: "ID",
  "personal.first_name": "First name",
  "personal.middle_name": "Middle name",
  "personal.last_name": "Last name",
  "personal.birthday": "Birthday",
  "personal.currentStatus": "Status",
  "personal.nationality": "Nationality",
  "personal.civil_status": "Civil status",
  "gadData.sexAtBirth": "Sex at birth",
  "gadData.gender_preference": "Gender preference",
  "contact.email": "Email",
  "contact.mobileNumber": "Mobile number",
  school_year: "School year",
  semester: "Semester",
  "affiliation.person_type": "Status",
  "affiliation.academic_information.student_id": "Student No.",
  "affiliation.academic_information.campus": "Campus",
  "affiliation.academic_information.college": "College",
  "affiliation.academic_information.course": "Course",
  "affiliation.academic_information.year_level": "Year level",
  "affiliation.employment_information.employee_id": "Employee No.",
  "affiliation.employment_information.office": "Office",
  "affiliation.employment_information.employment_status": "Employment status",
  "affiliation.employment_information.employment_appointment_status":
    "Appointment status",
  "pii.first_name": "First name",
  "pii.middle_name": "Middle name",
  "pii.last_name": "Last name",
  "pii.birthday": "Birthday",
  "pii.email": "Email",
  "pii.mobileNumber": "Mobile number",
  "pii.sexAtBirth": "Sex at birth",
  gemsPublicId: "GEMS ID",
};

/** "affiliation.employment_information.office" -> "Office". */
export function fieldLabel(path) {
  const key = String(path ?? "");
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const leaf = key.split(".").pop() || key;
  const words = leaf
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Turns an error thrown while writing a profile into a sentence an admin can
 * act on. Mongoose validation errors become one line per field with its
 * plain name; a duplicate key names the field without its value. Anything
 * else keeps its own message.
 */
export function friendlyMigrationError(error) {
  return friendlyValidationError(
    error,
    "Correct it in the source file and import again.",
  );
}

/**
 * Same sentences as friendlyMigrationError, with `hint` (if any) appended
 * to validation errors instead of the import advice. Used by the profile
 * edit route, where the person fixes the field on the page.
 */
export function friendlyValidationError(error, hint = "") {
  if (!error) return "Unknown error";
  if (error.name === "ValidationError" && error.errors) {
    const lines = Object.entries(error.errors).map(([path, err]) => {
      const label = fieldLabel(path);
      if (err.kind === "enum") {
        return `${label} "${err.value}" is not one of the accepted values.`;
      }
      if (err.kind === "required") return `${label} is required.`;
      if (err.name === "CastError") {
        return `${label} has a value that is not valid ("${err.value}").`;
      }
      return `${label}: ${err.message}`;
    });
    return hint ? `${lines.join(" ")} ${hint}` : lines.join(" ");
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || error.keyPattern || {})[0];
    return field
      ? `Another person already uses this ${fieldLabel(field)}.`
      : "This record would duplicate an existing one.";
  }
  return error.message || String(error);
}
