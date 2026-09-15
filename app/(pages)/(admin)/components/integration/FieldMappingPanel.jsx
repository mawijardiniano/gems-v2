"use client";

const FIELD_MAPPINGS = [
  { source: "first_name | FirstName | firstname", target: "personal.first_name" },
  { source: "last_name | LastName | lastname", target: "personal.last_name" },
  {
    source: "middle_name | MiddleName | middlename | mid_name",
    target: "personal.middle_name",
  },
  { source: "birthday | Birthday", target: "personal.birthday" },
  { source: "nationality | Nationality", target: "personal.nationality" },
  {
    source: "civil_status | CivilStatus | civilstatus",
    target: "personal.civil_status",
  },
  {
    source: "currentStatus | current_status | status",
    target: "personal.currentStatus (Student / Employee)",
  },
  {
    source: "student_id | StudentID | studentId | StudentNo",
    target: "affiliation.academic_information.student_id",
  },
  { source: "campus | Campus", target: "affiliation.academic_information.campus" },
  {
    source: "college | College | CollegeName",
    target: "affiliation.academic_information.college",
  },
  {
    source: "course | Course | ProgName",
    target: "affiliation.academic_information.course",
  },
  {
    source: "year_level | YearLevel",
    target: "affiliation.academic_information.year_level",
  },
  {
    source: "employee_id | EmployeeID | employeeId",
    target: "affiliation.employment_information.employee_id",
  },
  {
    source: "office | Office",
    target: "affiliation.employment_information.office",
  },
  {
    source: "employment_status | EmploymentStatus",
    target: "affiliation.employment_information.employment_status",
  },
  {
    source: "employment_appointment_status | EmploymentAppointmentStatus",
    target: "affiliation.employment_information.employment_appointment_status",
  },
  { source: "email | Email", target: "contact.email" },
  {
    source: "mobileNumber | MobileNumber | mobile_number",
    target: "contact.mobileNumber",
  },
  {
    source: "sexAtBirth | Sex | sex | gender | Gender",
    target: "gadData.sexAtBirth (F/female → Female, M/male → Male)",
  },
  {
    source: "gender_preference | GenderPreference | genderPreference",
    target: "gadData.gender_preference",
  },
  { source: "isPWD (boolean)", target: "gadData.isPWD" },
  { source: "isIndigenousPerson (boolean)", target: "gadData.isIndigenousPerson" },
  {
    source: "school_year | SchoolYear | sy",
    target: "school_year (falls back to form default)",
  },
  {
    source: "semester | Semester | term (1/1st/first, 2/2nd/second, summer)",
    target: "semester → 1st / 2nd / Summer (falls back to form default)",
  },
];

export default function FieldMappingPanel() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">Source field (HRMIS / SIS / ARO)</th>
            <th className="text-left px-3 py-2">GEMS staging field</th>
          </tr>
        </thead>
        <tbody>
          {FIELD_MAPPINGS.map((m) => (
            <tr key={m.target} className="border-t border-gray-100">
              <td className="px-3 py-1.5 font-mono text-[11px] text-gray-700">
                {m.source}
              </td>
              <td className="px-3 py-1.5 font-mono text-[11px] text-blue-700">
                {m.target}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">
        Mappings are implemented in{" "}
        <code>app/api/integration/_utils/mapping.js</code>. Records missing a
        required field (first name, last name, current status, school year,
        semester, or an identity key) are marked invalid during validation.
      </p>
    </div>
  );
}