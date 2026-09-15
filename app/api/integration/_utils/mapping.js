function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Capitalizes the first letter of every word, even after separators like
// commas, hyphens, periods, and apostrophes. Used to normalize names that
// come in lowercase from source files (e.g. "bandejas, kathleen" ->
// "Bandejas, Kathleen", "de guzman-santos" -> "De Guzman-Santos").
export function toTitleCase(value) {
  const str = normalizeString(value);
  if (!str) return "";
  return str.replace(/\s+/g, " ").replace(
    /[A-Za-z\u00C0-\u024F][\w\u00C0-\u024F'’]*/g,
    (word) =>
      word.replace(
        /[A-Za-z\u00C0-\u024F]+/g,
        (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      ),
  );
}

function toSemester(value) {
  const v = normalizeString(value).toLowerCase();
  if (["1", "1st", "first", "first semester"].includes(v)) return "1st";
  if (["2", "2nd", "second", "second semester"].includes(v)) return "2nd";
  if (["summer", "sum"].includes(v)) return "Summer";
  return "";
}

function toCurrentStatus(value, studentId, employeeId) {
  const normalized = normalizeString(value).toLowerCase();

  if (["student", "students"].includes(normalized)) return "Student";
  if (["employee", "employees", "faculty", "staff"].includes(normalized)) {
    return "Employee";
  }

  if (studentId) return "Student";
  if (employeeId) return "Employee";
  return "";
}

export function mapToStagingPayload(raw, defaults = {}) {
  const firstName = toTitleCase(
    raw.first_name || raw.FirstName || raw.firstname || raw.firstName,
  );
  const lastName = toTitleCase(
    raw.last_name || raw.LastName || raw.lastname || raw.lastName,
  );
  const middleName = toTitleCase(
    raw.middle_name ||
      raw.MiddleName ||
      raw.middlename ||
      raw.mid_name ||
      raw.middleName,
  );
  const status = normalizeString(
    raw.currentStatus || raw.current_status || raw.status,
  );

  const studentId = normalizeString(
    raw.student_id ||
      raw.StudentID ||
      raw.studentId ||
      raw.StudentNo ||
      raw.studentNo,
  );
  const employeeId = normalizeString(
    raw.employee_id || raw.EmployeeID || raw.employeeId,
  );

  const email = normalizeString(raw.email || raw.Email);
  const mobileNumber = normalizeString(
    raw.mobileNumber || raw.MobileNumber || raw.mobile_number,
  );

  const schoolYear =
    normalizeString(raw.school_year || raw.SchoolYear || raw.sy) ||
    normalizeString(defaults.school_year);
  const semester =
    toSemester(raw.semester || raw.Semester || raw.term) ||
    toSemester(defaults.semester);

function toSexAtBirth(value) {
  const v = normalizeString(value).toLowerCase();
  if (["f", "F", "female"].includes(v)) return "Female";
  if (["m","M", "male"].includes(v)) return "Male";
  return normalizeString(value);
}

const sexAtBirth = toSexAtBirth(
  raw.sexAtBirth || raw.Sex || raw.sex || raw.gender || raw.Gender,
);

  const currentStatus = toCurrentStatus(status, studentId, employeeId);

  const academicInformation =
    currentStatus === "Student"
      ? {
          student_id: studentId || undefined,
          campus: normalizeString(raw.campus || raw.Campus) || undefined,
          college:
            normalizeString(raw.college || raw.College || raw.CollegeName) ||
            undefined,
          course:
            normalizeString(raw.course || raw.Course || raw.ProgName) ||
            undefined,
          year_level:
            normalizeString(raw.year_level || raw.YearLevel) || undefined,
        }
      : {};

  const employmentInformation =
    currentStatus === "Employee"
      ? {
          employee_id: employeeId || undefined,
          office: normalizeString(raw.office || raw.Office) || undefined,
          employment_status:
            normalizeString(raw.employment_status || raw.EmploymentStatus) ||
            undefined,
          employment_appointment_status:
            normalizeString(
              raw.employment_appointment_status ||
                raw.EmploymentAppointmentStatus,
            ) || undefined,
        }
      : {};

  return {
    personal: {
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      birthday: raw.birthday || raw.Birthday || null,
      nationality: raw.Nationality || raw.nationality || null,
      civil_status: raw.CivilStatus || raw.civilstatus || raw.civil_status || null,
      currentStatus,
    },
    gadData: {
      sexAtBirth: sexAtBirth || undefined,
      gender_preference:
        normalizeString(
          raw.gender_preference || raw.GenderPreference || raw.genderPreference,
        ) || undefined,
      isPWD: typeof raw.isPWD === "boolean" ? raw.isPWD : undefined,
      isIndigenousPerson:
        typeof raw.isIndigenousPerson === "boolean"
          ? raw.isIndigenousPerson
          : undefined,
    },
    affiliation: {
      academic_information: academicInformation,
      employment_information: employmentInformation,
    },
    contact: {
      email: email || undefined,
      mobileNumber: mobileNumber || undefined,
    },
    school_year: schoolYear,
    semester,
  };
}

export function buildIdentity(mappedPayload) {
  const studentId =
    mappedPayload?.affiliation?.academic_information?.student_id?.trim?.() ||
    "";
  const employeeId =
    mappedPayload?.affiliation?.employment_information?.employee_id?.trim?.() ||
    "";
  // const email = mappedPayload?.contact?.email?.trim?.().toLowerCase?.() || "";

  return {
    student_id: studentId,
    employee_id: employeeId,
    // email,
  };
}

export function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function findExistingProfileForRecord(record, GemsProfile) {
  const identity = record.identity || {};
  const mapped = record.mapped_payload || {};

  if (identity.student_id) {
    const byStudent = await GemsProfile.findOne({
      "affiliation.academic_information.student_id": identity.student_id,
    });
    if (byStudent) return { profile: byStudent, matchedOn: "student_id" };
  }

  if (identity.employee_id) {
    const byEmployee = await GemsProfile.findOne({
      "affiliation.employment_information.employee_id": identity.employee_id,
    });
    if (byEmployee) return { profile: byEmployee, matchedOn: "employee_id" };
  }

  if (identity.email) {
    const byEmail = await GemsProfile.findOne({
      "contact.email": identity.email,
    });
    if (byEmail) return { profile: byEmail, matchedOn: "email" };
  }

  const first = normalizeName(mapped?.personal?.first_name);
  const last = normalizeName(mapped?.personal?.last_name);
  const birthday = mapped?.personal?.birthday
    ? new Date(mapped.personal.birthday)
    : null;

  if (first && last && birthday && !Number.isNaN(birthday.getTime())) {
    const candidates = await GemsProfile.find({
      "personal.birthday": birthday,
    }).limit(50);
    const match = candidates.find(
      (p) =>
        normalizeName(p.personal?.first_name) === first &&
        normalizeName(p.personal?.last_name) === last,
    );
    if (match) return { profile: match, matchedOn: "name_birthday" };
  }

  return null;
}

export function buildIdentityDedupeKey(identity = {}) {
  return (identity.student_id || identity.employee_id || identity.email || "")
    .toString()
    .trim()
    .toLowerCase();
}

export function validateMappedPayload(mappedPayload) {
  const errors = [];

  const firstName = mappedPayload?.personal?.first_name;
  const lastName = mappedPayload?.personal?.last_name;
  const status = mappedPayload?.personal?.currentStatus;
  const schoolYear = mappedPayload?.school_year;
  const semester = mappedPayload?.semester;

  if (!firstName) {
    errors.push({
      field: "personal.first_name",
      code: "required",
      message: "First name is required",
    });
  }
  if (!lastName) {
    errors.push({
      field: "personal.last_name",
      code: "required",
      message: "Last name is required",
    });
  }

  if (!["Student", "Employee"].includes(status)) {
    errors.push({
      field: "personal.currentStatus",
      code: "invalid",
      message: "Status must be Student or Employee.",
    });
  }

  if (!schoolYear) {
    errors.push({
      field: "school_year",
      code: "required",
      message: "school_year is required",
    });
  }
  if (!semester) {
    errors.push({
      field: "semester",
      code: "required",
      message: "semester is required",
    });
  }

  const studentId =
    mappedPayload?.affiliation?.academic_information?.student_id;
  const employeeId =
    mappedPayload?.affiliation?.employment_information?.employee_id;
  const email = mappedPayload?.contact?.email;

  if (!studentId && !employeeId && !email) {
    errors.push({
      field: "identity",
      code: "required",
      message:
        "Add at least one: Student No., Employee No., or Email — so the person can be identified.",
    });
  }

  return errors;
}

export function isEmptyValue(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

export function mergeValues(existing, incoming) {
  return isEmptyValue(incoming) ? existing : incoming;
}

function plainSection(section) {
  return section?.toObject?.() ?? section ?? {};
}

function normalizeComparable(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    if (/[-/:T]/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return String(value);
}

function equalValues(a, b) {
  return normalizeComparable(a) === normalizeComparable(b);
}

function mergeSection(existingSection, incomingSection, changes, prefix) {
  const existing = plainSection(existingSection);
  const incoming = plainSection(incomingSection);
  const merged = { ...existing };
  for (const key of Object.keys(incoming)) {
    const incomingValue = incoming[key];
    if (isEmptyValue(incomingValue)) continue; // safe-merge: blank never wipes
    const before = merged[key];
    const after = mergeValues(before, incomingValue);
    merged[key] = after;
    if (!equalValues(before, after)) {
      changes.push({
        field: `${prefix}.${key}`,
        from: before ?? "",
        to: after,
      });
    }
  }
  return merged;
}

export function mergeProfile(existing, mapped) {
  const changes = [];
  const merged = {
    personal: mergeSection(
      existing?.personal,
      mapped?.personal,
      changes,
      "personal",
    ),
    gadData: mergeSection(
      existing?.gadData,
      mapped?.gadData,
      changes,
      "gadData",
    ),
    contact: mergeSection(
      existing?.contact,
      mapped?.contact,
      changes,
      "contact",
    ),
    affiliation: {},
  };

  const existingAffiliation = plainSection(existing?.affiliation);
  const incomingAffiliation = plainSection(mapped?.affiliation);
  for (const key of Object.keys(incomingAffiliation)) {
    if (
      key === "academic_information" ||
      key === "employment_information"
    ) {
      continue;
    }
    const before = existingAffiliation[key];
    const after = mergeValues(before, incomingAffiliation[key]);
    merged.affiliation[key] = after;
    if (!equalValues(before, after)) {
      changes.push({
        field: `affiliation.${key}`,
        from: before ?? "",
        to: after,
      });
    }
  }

  merged.affiliation.academic_information = mergeSection(
    existing?.affiliation?.academic_information,
    mapped?.affiliation?.academic_information,
    changes,
    "affiliation.academic_information",
  );
  merged.affiliation.employment_information = mergeSection(
    existing?.affiliation?.employment_information,
    mapped?.affiliation?.employment_information,
    changes,
    "affiliation.employment_information",
  );

  if (!merged.affiliation.academic_information?.student_id) {
    delete merged.affiliation.academic_information;
  }
  if (!merged.affiliation.employment_information?.employee_id) {
    delete merged.affiliation.employment_information;
  }

  if (merged.personal?.birthday) {
    const d = new Date(merged.personal.birthday);
    if (!Number.isNaN(d.getTime())) merged.personal.birthday = d;
  }

  return { merged, changes };
}

export function mergeTermAffiliation(existingAffiliation, incomingAffiliation) {
  const existing = plainSection(existingAffiliation);
  const incoming = plainSection(incomingAffiliation);
  const merged = { ...existing };

  for (const key of Object.keys(incoming)) {
    if (key === "academic_information" || key === "employment_information") {
      merged[key] = mergeSection(merged[key], incoming[key], [], key);
      continue;
    }
    merged[key] = mergeValues(merged[key], incoming[key]);
  }

  if (!merged.academic_information?.student_id) {
    delete merged.academic_information;
  }
  if (!merged.employment_information?.employee_id) {
    delete merged.employment_information;
  }

  return merged;
}
