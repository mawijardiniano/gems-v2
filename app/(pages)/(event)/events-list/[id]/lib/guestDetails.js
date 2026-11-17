/* Turns a populated attendee (an account's GemsProfile, or a legacy guest
   shape) into the columns the attendance sheet and print-outs use. Pure, so
   the Attendance table, the print builders and the account check-in rows all
   read people the same way. */

/** "College of Information and Computing Sciences" → "CICS". */
export const toAcronym = (value) => {
  if (!value || typeof value !== "string") return "";
  const cleaned = value
    .replace(/\b(of|and|the|&)\b/gi, " ")
    .replace(/[()]/g, " ");
  const matches = cleaned.match(/\b[A-Za-z0-9]/g);
  if (!matches) return value.trim();
  return matches.join("").toUpperCase();
};

/** "jUAN dela CRUZ" → "Juan Dela Cruz". */
export const capitalizeName = (value) => {
  if (!value || typeof value !== "string") return value;
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

export const calculateAge = (birthday, now = new Date()) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

export const extractGuestDetails = (guest) => {
  const info = guest?.personal_info_id || guest?.personal_info || {};
  const personal = info.personal || guest?.personal || {};
  const gadData = info.gadData || guest?.gadData || {};
  const affiliation = info.affiliation || guest?.affiliation || {};
  const contactInfo = info.contact || guest?.contact || {};
  const academic =
    affiliation.academic_information || affiliation.academicInformation || {};
  const employment =
    affiliation.employment_information ||
    affiliation.employmentInformation ||
    {};

  const positionDesignation =
    employment.employment_status ||
    employment.employment_appointment_status ||
    "";
  const programYearSection = academic.course
    ? `${academic.course}${academic.year_level ? ` / ${academic.year_level}` : ""}`
    : academic.year_level || "";

  const nameFromPersonal = `${personal.first_name || personal.firstName || ""} ${
    personal.last_name || personal.lastName || ""
  }`.trim();

  const departmentRaw = employment.office || academic.college || "";

  return {
    name: nameFromPersonal || "Unknown guest",
    age: calculateAge(personal?.birthday),
    sex: gadData?.sexAtBirth || "",
    college: academic.college || "",
    course: academic.course || "",
    yearLevel: academic.year_level || "",
    office: employment.office || "",
    department: toAcronym(departmentRaw),
    genderPreference:
      gadData.gender_preference || gadData.genderPreference || "",
    status: personal.currentStatus || "",
    positionDesignation,
    programYearSection,
    contact: contactInfo.mobileNumber || contactInfo.phoneNumber || "",
    email: contactInfo.email || "",
  };
};
