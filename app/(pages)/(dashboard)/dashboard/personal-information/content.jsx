"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaUser } from "react-icons/fa";

const SELECT_FIELDS = {
  sex: ["Male", "Female"],
  gender_preference: [
    "Heterosexual Male",
    "Heterosexual Female",
    "Gay",
    "Lesbian",
    "Prefer not to say",
  ],
  age_bracket: ["18-30", "31-40", "41-50", "51-60", "61 and above"],
  civil_status: [
    "Single",
    "Married",
    "Widow",
    "Legally Separated Marriage",
    "Living In/Common Law",
    "Annulled",
    "Iba pa",
  ],
  religion: [
    "Roman Catholic",
    "Iglesia ni Cristo",
    "Iglesia Independencia Filipina",
    "Protestant",
    "Born Again Christian",
    "Evangelical Christian",
    "Latter Day Saints",
    "Members Church of God International (MGCI)",
    "Iba pa",
  ],
  person_type: ["Student", "Employee"],
  college: [
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
  ],
  college_office: [
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
  ],
  employment_status: ["Faculty", "Non-teaching Personnel"],
  total_annual_family_income: [
    "₱1,000.00 - ₱50,000.00",
    "₱51,000.00 - ₱100,000.00",
    "₱101,000.00 - ₱200,000.00",
    "₱201,000.00 - ₱300,000.00",
    "₱301,000.00 - ₱400,000.00",
    "₱401,000.00 - ₱500,000.00",
    "₱501,000.00 and above",
  ],
  health_problems: [
    "Physical Impairment",
    "Physiological/Mental Condition",
    "Heart Ailment",
    "Diabetes",
    "Eye Problems",
    "Hypertension/High Blood Pressure",
    "Cancer",
    "None",
    "Iba pa",
  ],
};

const PWD_TYPES = [
  "Visual Impairment",
  "Hearing Impairment",
  "Physical Disability",
  "Mental Disability",
  "Multiple Disabilities",
  "Other",
];

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

export default function PersonalInformationContent({ profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState(profile?.personal_information || {});
  const [originalData, setOriginalData] = useState(
    profile?.personal_information || {},
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");
  const [showCompleteEmploymentModal, setShowCompleteEmploymentModal] =
    useState(false);
  const [showCompleteAcademicModal, setShowCompleteAcademicModal] =
    useState(false);
  const router = useRouter();

  useEffect(() => {
    setFormData(profile?.personal_information || {});
    setOriginalData(profile?.personal_information || {});
  }, [profile]);

  const handleChange = (key, value) => {
    if (key === "person_type") setIsEditing(true);

    setFormData((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === "pwd" && value === false) delete updated.pwd_type;

      if (key === "person_type") {
        if (value === "Student") {
          updated.employment_information = null;
          updated.academic_information = updated.academic_information || {};
        }
        if (value === "Employee") {
          updated.academic_information = null;
          updated.employment_information = updated.employment_information || {};
        }
      }

      if (key === "employment_status")
        delete updated.employment_appointment_status;

      return updated;
    });
  };

  const handleChangeNested = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      setToastMessage("First Name and Last Name are required.");
      setToastColor("failure");
      setShowToast(true);
      return;
    }
    if (formData.person_type === "Employee") {
      const emp = formData.employment_information || {};
      if (!emp.employee_id || !emp.office || !emp.employment_status) {
        setShowCompleteEmploymentModal(true);
        return;
      }
      if (
        emp.employment_status === "Non-teaching Personnel" &&
        !emp.employment_appointment_status
      ) {
        setShowCompleteEmploymentModal(true);
        return;
      }
    }
    if (formData.person_type === "Student") {
      const ai = formData.academic_information || {};
      if (!ai.student_id || !ai.college || !ai.year_level) {
   
        setShowCompleteAcademicModal(true);
        return;
      }
    }

    try {
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");

      setIsUpdating(true);

      const cleanedData = { ...formData };

      if (!cleanedData.pwd) delete cleanedData.pwd_type;

      if (cleanedData.person_type === "Student") {
        delete cleanedData.employment_status;
        delete cleanedData.employment_appointment_status;
      }

      const response = await fetch(`/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal_information: cleanedData }),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const data = await response.json();
      setFormData(data.data.personal_information);
      setOriginalData(data.data.personal_information);
      setIsEditing(false);

      setToastMessage("Profile updated successfully!");
      setToastColor("success");
      setShowToast(true);
      try {
        router.refresh();
      } catch (e) {}
      try {
        if (typeof window !== "undefined") window.location.reload();
      } catch (e) {}
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update profile.");
      setToastColor("failure");
      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const FIELD_LABELS = {
    pwd: "Person with Disability",
    solo_parent: "Solo Parent",
  };

  const renderField = (label, key) => {
    const value = formData[key];

    if (!isEditing) {
      if (typeof value === "boolean")
        return (
          <div className="border border-gray-300 px-2 py-1 rounded">
            {value ? "Yes" : "No"}
          </div>
        );
      if (Array.isArray(value))
        return (
          <div className="border border-gray-300 px-2 py-1 rounded">
            {value.join(", ") || "-"}
          </div>
        );
      return (
        <div className="border border-gray-300 px-2 py-1 rounded truncate">
          {value || "-"}
        </div>
      );
    }

    if (key === "pwd" || key === "solo_parent") {
      return (
        <select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) =>
            handleChange(
              key,
              e.target.value === "" ? undefined : e.target.value === "true",
            )
          }
          className="border px-2 py-1 rounded"
        >
          <option value="">Select {FIELD_LABELS[key] || label}</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (SELECT_FIELDS[key]) {
      return (
        <select
          value={value || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Select {label}</option>
          {SELECT_FIELDS[key].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (
      key === "employment_status" ||
      key === "employment_appointment_status"
    ) {
      if (formData.person_type !== "Employee") {
        return (
          <div className="border px-2 py-1 rounded text-gray-400">N/A</div>
        );
      }

      const options =
        key === "employment_status"
          ? SELECT_FIELDS.employment_status
          : formData.employment_status
            ? APPOINTMENT_STATUS_MAP[formData.employment_status]
            : [];

      return (
        <select
          value={value || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          className="border px-2 py-1 rounded"
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

    if (key === "pwd_type") {
      return (
        <select
          value={value || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Select PWD Type</option>
          {PWD_TYPES.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => handleChange(key, e.target.value)}
        className="border px-2 py-1 rounded"
      />
    );
  };

  const fields = [
    "first_name",
    "last_name",
    "middle_name",
    "sex",
    "gender_preference",
    "age_bracket",
    "civil_status",
    "religion",
    "person_type",
    "solo_parent",
    "pwd",
    ...(formData.pwd ? ["pwd_type"] : []),
    "total_annual_family_income",
    "health_problems",
  ];

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
                if (isEditing) setFormData(originalData);
                setIsEditing(!isEditing);
              }}
              className="bg-white border border-gray-200 px-3 py-1 rounded"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          {fields.map((key) => (
            <div key={key} className="flex flex-col w-64">
              <label className="font-medium text-gray-700 mb-1">
                {FIELD_LABELS[key] ||
                  key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>

              {renderField(key, key)}
            </div>
          ))}
        </div>
        {isEditing &&
          formData.person_type === "Employee" &&
          formData.person_type !== (originalData?.person_type || "") && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold mb-3">
                Employment Information (edit)
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col w-64">
                  <label className="font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employment_information?.employee_id || ""}
                    onChange={(e) =>
                      handleChangeNested(
                        "employment_information",
                        "employee_id",
                        e.target.value,
                      )
                    }
                    className="border px-2 py-1 rounded"
                  />
                </div>

                <div className="flex flex-col w-64">
                  <label className="font-medium text-gray-700 mb-1">
                    Office
                  </label>
                  <select
                    value={formData.employment_information?.office || ""}
                    onChange={(e) =>
                      handleChangeNested(
                        "employment_information",
                        "office",
                        e.target.value,
                      )
                    }
                    className="border px-2 py-1 rounded"
                  >
                    <option value="">Select Office</option>
                    {SELECT_FIELDS.college_office.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col w-64">
                  <label className="font-medium text-gray-700 mb-1">
                    Employment Status
                  </label>
                  <select
                    value={
                      formData.employment_information?.employment_status || ""
                    }
                    onChange={(e) =>
                      handleChangeNested(
                        "employment_information",
                        "employment_status",
                        e.target.value,
                      )
                    }
                    className="border px-2 py-1 rounded"
                  >
                    <option value="">Select Status</option>
                    {SELECT_FIELDS.employment_status.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.employment_information?.employment_status ===
                  "Non-teaching Personnel" && (
                  <div className="flex flex-col w-64">
                    <label className="font-medium text-gray-700 mb-1">
                      Appointment Status
                    </label>
                    <select
                      value={
                        formData.employment_information
                          ?.employment_appointment_status || ""
                      }
                      onChange={(e) =>
                        handleChangeNested(
                          "employment_information",
                          "employment_appointment_status",
                          e.target.value,
                        )
                      }
                      className="border px-2 py-1 rounded"
                    >
                      <option value="">Select Appointment</option>
                      {APPOINTMENT_STATUS_MAP["Non-teaching Personnel"].map(
                        (a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        {isEditing &&
          formData.person_type === "Student" &&
          formData.person_type !== (originalData?.person_type || "") && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold mb-3">
                Academic Information (edit)
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col w-64">
                  <label className="font-medium text-gray-700 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={formData.academic_information?.student_id || ""}
                    onChange={(e) =>
                      handleChangeNested(
                        "academic_information",
                        "student_id",
                        e.target.value,
                      )
                    }
                    className="border px-2 py-1 rounded"
                  />
                </div>

                <div className="flex flex-col w-64">
                  <label className="font-medium text-gray-700 mb-1">
                    College
                  </label>
                  <select
                    value={formData.academic_information?.college || ""}
                    onChange={(e) =>
                      handleChangeNested(
                        "academic_information",
                        "college",
                        e.target.value,
                      )
                    }
                    className="border px-2 py-1 rounded"
                  >
                    <option value="">Select College</option>
                    {SELECT_FIELDS.college.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col w-64">
                  <label className="font-medium text-gray-700 mb-1">
                    Year Level
                  </label>
                  <select
                    value={formData.academic_information?.year_level || ""}
                    onChange={(e) =>
                      handleChangeNested(
                        "academic_information",
                        "year_level",
                        e.target.value,
                      )
                    }
                    className="border px-2 py-1 rounded"
                  >
                    <option value="">Select Year Level</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                    <option>5th Year</option>
                    <option>6th Year</option>
                  </select>
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

      {showCompleteEmploymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              Complete Employment Information
            </h3>
            <p className="text-gray-700 mb-4">
              The Employment fields are handled on the Employment page. Please
              complete the required employment details there before saving.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteEmploymentModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCompleteEmploymentModal(false);
                  router.push("/dashboard/employment");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Go to Employment
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompleteAcademicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              Complete Academic Information
            </h3>
            <p className="text-gray-700 mb-4">
              The Academic fields are handled on the Academic page. Please
              complete the required academic details there before saving.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteAcademicModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCompleteAcademicModal(false);
                  router.push("/dashboard/academic");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Go to Academic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
