function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
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
  const firstName = normalizeString(
    raw.first_name || raw.FirstName || raw.firstname,
  );
  const lastName = normalizeString(
    raw.last_name || raw.LastName || raw.lastname,
  );
  const middleName = normalizeString(
    raw.middle_name || raw.MiddleName || raw.middlename || raw.mid_name,
  );
  const status = normalizeString(
    raw.currentStatus || raw.current_status || raw.status,
  );

  const studentId = normalizeString(
    raw.student_id || raw.StudentID || raw.studentId || raw.StudentNo,
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

  const sexAtBirth = normalizeString(
    raw.sexAtBirth || raw.Sex || raw.sex || raw.gender,
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
  const email = mappedPayload?.contact?.email?.trim?.().toLowerCase?.() || "";

  return {
    student_id: studentId,
    employee_id: employeeId,
    email,
  };
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
      message: "currentStatus must be Student or Employee",
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
        "At least one identity key is required: student_id, employee_id, or email",
    });
  }

  return errors;
}
