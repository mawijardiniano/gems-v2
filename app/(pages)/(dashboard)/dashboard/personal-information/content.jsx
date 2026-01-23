"use client";

import { useEffect, useState } from "react";
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
    profile?.personal_information || {}
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  useEffect(() => {
    setFormData(profile?.personal_information || {});
    setOriginalData(profile?.personal_information || {});
  }, [profile]);

  const handleChange = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };

      // Clear PWD type if not PWD
      if (key === "pwd" && value === false) delete updated.pwd_type;

      if (key === "person_type" && value === "Student") {
        delete updated.employment_status;
        delete updated.employment_appointment_status;
      }

      // Clear appointment if employment_status changes
      if (key === "employment_status")
        delete updated.employment_appointment_status;

      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      setToastMessage("First Name and Last Name are required.");
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    try {
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");

      setIsUpdating(true);

      const cleanedData = { ...formData };

      // Remove PWD type if not PWD
      if (!cleanedData.pwd) delete cleanedData.pwd_type;

      // Remove employment fields if Student
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
          <div className="border px-2 py-1 rounded">{value ? "Yes" : "No"}</div>
        );
      if (Array.isArray(value))
        return (
          <div className="border px-2 py-1 rounded">
            {value.join(", ") || "-"}
          </div>
        );
      return (
        <div className="border px-2 py-1 rounded truncate">{value || "-"}</div>
      );
    }

    if (key === "pwd" || key === "solo_parent") {
      return (
        <select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) =>
            handleChange(
              key,
              e.target.value === "" ? undefined : e.target.value === "true"
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
    "person_id",
    "college_office",
    ...(formData.person_type === "Employee"
      ? ["employment_status", "employment_appointment_status"]
      : []),
    "solo_parent",
    "pwd",
    ...(formData.pwd ? ["pwd_type"] : []),
    "total_annual_family_income",
    "health_problems",
  ];

  return (
    <div className="pt-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
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
