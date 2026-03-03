"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaUser } from "react-icons/fa";

const CIVIL_STATUS = [
  "Single",
  "Married",
  "Widow",
  "Legally Separated Marriage",
  "Living In/Common Law",
  "Annulled",
];

const RELIGIONS = [
  "Roman Catholic",
  "Iglesia ni Cristo",
  "Iglesia Independencia Filipina",
  "Protestant",
  "Born Again Christian",
  "Evangelical Christian",
  "Latter Day Saints",
  "Members Church of God International (MGCI)",
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CURRENT_STATUS = ["Student", "Employee"];
const CAMPUS = ["Boac", "Sta. Cruz"];
const COLLEGES = [
  "Graduate School",
  "College of Agriculture",
  "College of Allied Health Sciences",
  "College of Arts & Social Sciences",
  "College of Business & Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Environmental Studies",
  "College of Fisheries & Aquatic Sciences",
  "College of Governance",
  "College of Industrial Technology",
  "College of Information & Computing Sciences",
];
const COURSES = ["Information System", "Information Technology"];
const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "6th Year",
];
const SCHOLAR_STATUS = ["Yes", "No"];

const OFFICES = [
  "Graduate School",
  "College of Agriculture",
  "College of Allied Health Sciences",
  "College of Arts & Social Sciences",
  "College of Business & Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Environmental Studies",
  "College of Fisheries & Aquatic Sciences",
  "College of Governance",
  "College of Industrial Technology",
  "College of Information & Computing Sciences",
  "Offices under the Office of the University President",
  "Offices under the Office of the Vice President for Academic Affairs",
  "Offices under the Office of the Vice President for Administration and Finance",
  "Offices under the Office of the Vice President for Research and Extension",
  "Offices under the Office of the Vice President for Student Affairs and Services",
];
const EMPLOYMENT_STATUS = ["Faculty", "Non-teaching Personnel"];
const APPOINTMENT_STATUS_MAP = {
  "Non-teaching Personnel": [
    "Regular",
    "Temporary",
    "Coterminous",
    "Casual",
    "Job Order",
    "Contract of Service (Skilled)",
    "Utility Worker",
  ],
  Faculty: [
    "Regular",
    "Temporary",
    "University Lecturer",
    "Part-time Lecturer",
    "Clinical Instructor",
    "Adjunct",
  ],
};
const ALL_APPOINTMENTS = Array.from(
  new Set(Object.values(APPOINTMENT_STATUS_MAP).flat()),
);

const DEFAULT_PERSONAL = {
  first_name: "",
  middle_name: "",
  last_name: "",
  civil_status: "",
  religion: "",
  nationality: "Filipino",
  currentStatus: "",
  birthday: "",
  bloodType: "",
};

export default function PersonalInformationContent({ profile }) {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState(profile || null);
  const [formData, setFormData] = useState(DEFAULT_PERSONAL);
  const [originalData, setOriginalData] = useState(DEFAULT_PERSONAL);
  const [academicData, setAcademicData] = useState({
    student_id: "",
    campus: "",
    college: "",
    course: "",
    year_level: "",
    isScholar: "",
  });
  const [originalAcademic, setOriginalAcademic] = useState(null);
  const [employmentData, setEmploymentData] = useState({
    employee_id: "",
    office: "",
    employment_status: "",
    employment_appointment_status: "",
  });
  const [originalEmployment, setOriginalEmployment] = useState(null);
  const [statusChanged, setStatusChanged] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  useEffect(() => {
    const personal = (profile && profile.personal) || {};
    const normalized = {
      ...DEFAULT_PERSONAL,
      ...personal,
      birthday: personal.birthday
        ? new Date(personal.birthday).toISOString().slice(0, 10)
        : "",
    };
    setFormData(normalized);
    setOriginalData(normalized);

    const academic = profile?.affiliation?.academic_information || {};
    const employment = profile?.affiliation?.employment_information || {};
    const normalizedAcademic = {
      student_id: academic.student_id || "",
      campus: academic.campus || "",
      college: academic.college || "",
      course: academic.course || "",
      year_level: academic.year_level || "",
      isScholar: academic.isScholar || "",
    };
    const normalizedEmployment = {
      employee_id: employment.employee_id || "",
      office: employment.office || "",
      employment_status: employment.employment_status || "",
      employment_appointment_status:
        employment.employment_appointment_status || "",
    };
    setAcademicData(normalizedAcademic);
    setOriginalAcademic(normalizedAcademic);
    setEmploymentData(normalizedEmployment);
    setOriginalEmployment(normalizedEmployment);
    setStatusChanged(false);
  }, [profile]);

  const handleChange = (key, value) => {
    if (key === "currentStatus") {
      setIsEditing(true);
      setStatusChanged(true);
      if (value === "Student") {
        setEmploymentData({
          employee_id: "",
          office: "",
          employment_status: "",
          employment_appointment_status: "",
        });
      }
      if (value === "Employee") {
        setAcademicData({
          student_id: "",
          campus: "",
          college: "",
          course: "",
          year_level: "",
          isScholar: "",
        });
      }
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAcademicChange = (key, value) => {
    setAcademicData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEmploymentChange = (key, value) => {
    setEmploymentData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const required = [
      formData.first_name,
      formData.last_name,
      formData.civil_status,
      formData.religion,
      formData.currentStatus,
      formData.birthday,
      formData.bloodType,
    ];

    if (required.some((v) => !v)) {
      setToastMessage(
        "First name, Last name, Civil status, Religion, Current Status, Birthday, and Blood Type are required.",
      );
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    const isStudent = formData.currentStatus === "Student";
    const isEmployee = formData.currentStatus === "Employee";

    if (isStudent) {
      const aReq = [
        academicData.student_id,
        academicData.campus,
        academicData.college,
        academicData.course,
        academicData.year_level,
        academicData.isScholar,
      ];
      if (aReq.some((v) => !v)) {
        setToastMessage(
          "Academic info is required when status is Student (Student ID, Campus, College, Course, Year Level, Scholarship).",
        );
        setToastColor("failure");
        setShowToast(true);
        return;
      }
    }

    if (isEmployee) {
      const eReq = [
        employmentData.employee_id,
        employmentData.office,
        employmentData.employment_status,
        employmentData.employment_appointment_status,
      ];
      if (eReq.some((v) => !v)) {
        setToastMessage(
          "Employment info is required when status is Employee (Employee ID, Office, Employment Status, Appointment Status).",
        );
        setToastColor("failure");
        setShowToast(true);
        return;
      }
    }

    try {
      const profileId = currentProfile?._id;
      if (!profileId) throw new Error("Profile ID not found");
      setIsUpdating(true);

      const payload = {
        personal: {
          ...formData,
          birthday: formData.birthday
            ? new Date(formData.birthday).toISOString()
            : "",
        },
      };

      if (isStudent || isEmployee) {
        payload.affiliation = {};
        if (isStudent) payload.affiliation.academic_information = academicData;
        if (isEmployee)
          payload.affiliation.employment_information = employmentData;
      }

      const res = await fetch(`/api/profile/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      const data = await res.json();
      const updated = data.data || currentProfile;
      const updatedPersonal = updated.personal || formData;
      const updatedAcademic =
        updated.affiliation?.academic_information || academicData;
      const updatedEmployment =
        updated.affiliation?.employment_information || employmentData;
      const normalized = {
        ...DEFAULT_PERSONAL,
        ...updatedPersonal,
        birthday: updatedPersonal.birthday
          ? new Date(updatedPersonal.birthday).toISOString().slice(0, 10)
          : "",
      };

      setCurrentProfile(updated);
      setFormData(normalized);
      setOriginalData(normalized);
      setAcademicData({ ...updatedAcademic });
      setOriginalAcademic({ ...updatedAcademic });
      setEmploymentData({ ...updatedEmployment });
      setOriginalEmployment({ ...updatedEmployment });
      setStatusChanged(false);
      setIsEditing(false);
      setToastMessage("Personal information saved.");
      setToastColor("success");
      setShowToast(true);

      if (typeof window !== "undefined") {
        window.location.reload();
      }

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profileUpdated", { detail: updated }),
          );
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update personal info.");
      setToastColor("failure");
      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderField = (label, key, options) => {
    const value = formData[key];

    if (!isEditing) {
      return (
        <p className="border border-gray-300 rounded px-3 py-1 w-full truncate">
          {value || "N/A"}
        </p>
      );
    }

    if (options) {
      return (
        <select
          value={value || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 w-full"
        >
          <option value="">Select {label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    const inputType = key === "birthday" ? "date" : "text";
    return (
      <input
        type={inputType}
        className="border border-gray-300 rounded px-3 py-1 w-full"
        value={value || ""}
        onChange={(e) => handleChange(key, e.target.value)}
      />
    );
  };

  return (
    <div className="pt-6">
      <div className="border border-gray-200 p-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <FaUser className="text-gray-600 text-xl" />
            <h2 className="text-gray-800 font-semibold text-lg">
              Personal Information
            </h2>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  setFormData(originalData);
                  setAcademicData(originalAcademic || academicData);
                  setEmploymentData(originalEmployment || employmentData);
                  setStatusChanged(false);
                }
                setIsEditing(!isEditing);
              }}
              className="bg-white border border-gray-200 px-3 py-1 rounded"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">First Name</label>
            {renderField("First Name", "first_name")}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            {renderField("Middle Name", "middle_name")}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">Last Name</label>
            {renderField("Last Name", "last_name")}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">
              Civil Status
            </label>
            {renderField("Civil Status", "civil_status", CIVIL_STATUS)}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">Religion</label>
            {renderField("Religion", "religion", RELIGIONS)}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">
              Nationality
            </label>
            {renderField("Nationality", "nationality")}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">
              Current Status
            </label>
            {renderField("Current Status", "currentStatus", CURRENT_STATUS)}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">Birthday</label>
            {renderField("Birthday", "birthday")}
          </div>
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">Blood Type</label>
            {renderField("Blood Type", "bloodType", BLOOD_TYPES)}
          </div>
        </div>

        {formData.currentStatus === "Student" && statusChanged && (
          <div className="mt-8 border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                {isEditing ? (
                  <input
                    className="border border-gray-300 rounded px-3 py-1"
                    value={academicData.student_id}
                    onChange={(e) =>
                      handleAcademicChange("student_id", e.target.value)
                    }
                  />
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {academicData.student_id || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">Campus</label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={academicData.campus}
                    onChange={(e) =>
                      handleAcademicChange("campus", e.target.value)
                    }
                  >
                    <option value="">Select Campus</option>
                    {CAMPUS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {academicData.campus || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  College
                </label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={academicData.college}
                    onChange={(e) =>
                      handleAcademicChange("college", e.target.value)
                    }
                  >
                    <option value="">Select College</option>
                    {COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {academicData.college || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">Course</label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={academicData.course}
                    onChange={(e) =>
                      handleAcademicChange("course", e.target.value)
                    }
                  >
                    <option value="">Select Course</option>
                    {COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {academicData.course || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Year Level
                </label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={academicData.year_level}
                    onChange={(e) =>
                      handleAcademicChange("year_level", e.target.value)
                    }
                  >
                    <option value="">Select Year Level</option>
                    {YEAR_LEVELS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {academicData.year_level || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Scholarship Status
                </label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={academicData.isScholar}
                    onChange={(e) =>
                      handleAcademicChange("isScholar", e.target.value)
                    }
                  >
                    <option value="">Select Scholarship Status</option>
                    {SCHOLAR_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {academicData.isScholar || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {formData.currentStatus === "Employee" && statusChanged && (
          <div className="mt-8 border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">
              Employment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                {isEditing ? (
                  <input
                    className="border border-gray-300 rounded px-3 py-1"
                    value={employmentData.employee_id}
                    onChange={(e) =>
                      handleEmploymentChange("employee_id", e.target.value)
                    }
                  />
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {employmentData.employee_id || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">Office</label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={employmentData.office}
                    onChange={(e) =>
                      handleEmploymentChange("office", e.target.value)
                    }
                  >
                    <option value="">Select Office</option>
                    {OFFICES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {employmentData.office || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Employment Status
                </label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={employmentData.employment_status}
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      handleEmploymentChange("employment_status", nextStatus);
                      handleEmploymentChange(
                        "employment_appointment_status",
                        "",
                      );
                    }}
                  >
                    <option value="">Select Employment Status</option>
                    {EMPLOYMENT_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {employmentData.employment_status || "N/A"}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Appointment Status
                </label>
                {isEditing ? (
                  <select
                    className="border border-gray-300 rounded px-3 py-1"
                    value={employmentData.employment_appointment_status}
                    onChange={(e) =>
                      handleEmploymentChange(
                        "employment_appointment_status",
                        e.target.value,
                      )
                    }
                  >
                    <option value="">Select Appointment Status</option>
                    {(
                      APPOINTMENT_STATUS_MAP[
                        employmentData.employment_status
                      ] || ALL_APPOINTMENTS
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="border border-gray-300 rounded px-3 py-1">
                    {employmentData.employment_appointment_status || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showToast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded text-white ${
            toastColor === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
