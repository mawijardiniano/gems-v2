"use client";
import { useEffect, useState } from "react";
import {
  FaMoneyBillWave,
  FaHome,
  FaBroom,
} from "react-icons/fa";

const ENUM_FIELDS = {
  // Economic & Financial
  income_sources: [
    "Active Income",
    "Passive Income",
    "Portfolio (Investment) Income",
    "Other Potential Sources",
    "N/A",
    "Iba pa",
  ],

  // Reproductive & Family
  childbearing_stage: ["Yes", "No", "N/A"],
  child_rearing_stage: ["Yes", "No", "N/A"],
  family_planning: ["Yes", "No", "N/A"],
  spouse_share_childcare: ["Yes", "No", "N/A"],
  attend_school_needs: ["Yes", "No", "N/A"],

  // Household
  spouse_participate_household: ["Yes", "No", "N/A"],
};

export default function RolesContent({ profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    economic_financial_role: profile.economic_financial_role || {},
    reproductive_family_role: profile.reproductive_family_role || {},
    household_managing_role: profile.household_managing_role || {},
  });

  const [originalData, setOriginalData] = useState(formData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  useEffect(() => {
    setFormData({
      economic_financial_role: profile.economic_financial_role || {},
      reproductive_family_role: profile.reproductive_family_role || {},
      household_managing_role: profile.household_managing_role || {},
    });
    setOriginalData({
      economic_financial_role: profile.economic_financial_role || {},
      reproductive_family_role: profile.reproductive_family_role || {},
      household_managing_role: profile.household_managing_role || {},
    });
  }, [profile]);

  const handleChange = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    try {
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");

      setIsUpdating(true);

      const response = await fetch(`/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const data = await response.json();
      setFormData(data.data);
      setOriginalData(data.data);
      setIsEditing(false);

      setToastMessage("Roles updated successfully!");
      setToastColor("success");
      setShowToast(true);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update roles.");
      setToastColor("failure");
      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

const renderField = (section, key) => {
  const value = formData[section][key];

  if (!isEditing) {
    // Convert boolean / boolean-like values to Yes/No
    let display = value;
    if (typeof value === "boolean") display = value ? "Yes" : "No";
    if (value === "true") display = "Yes";
    if (value === "false") display = "No";
    if (!display) display = "-"; // fallback for empty/null values

    return (
      <div className="border px-2 py-1 rounded bg-gray-50 min-w-[100px]">
        {display}
      </div>
    );
  }

  // Editable fields
  if (ENUM_FIELDS[key]) {
    return (
      <select
        value={value || ""}
        onChange={(e) => handleChange(section, key, e.target.value)}
        className="border px-2 py-1 rounded"
      >
        <option value="">Select {key}</option>
        {ENUM_FIELDS[key].map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (typeof value === "boolean") {
    return (
      <select
        value={value ? "true" : "false"}
        onChange={(e) => handleChange(section, key, e.target.value === "true")}
        className="border px-2 py-1 rounded"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => handleChange(section, key, e.target.value)}
      className="border px-2 py-1 rounded"
    />
  );
};


  const renderSection = (title, sectionKey, fields) => (
    <div className="border border-gray-200 p-8">
      <h1 className="text-lg font-semibold mb-4">{title}</h1>
      <div className="flex flex-wrap gap-8">
        {fields.map((key) => (
          <div key={key} className="flex flex-col w-64">
            <label className="font-medium text-gray-700 mb-1">
              {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </label>
            {renderField(sectionKey, key)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pt-6">
    <div className=" border border-gray-200 p-8">


      <div className="flex justify-between gap-2 mb-4">
      <h1 className="text-xl flex items-center font-medium">
        Roles
      </h1>
      <div>
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

<div className="flex flex-col gap-4">


      {renderSection("Economic & Financial Role", "economic_financial_role", [
        "breadwinner",
        "income_sources",
        "cultural_barrier_work",
        "manage_financial_resources",
        "participate_financial_decisions",
      ])}

      {renderSection("Reproductive & Family Role", "reproductive_family_role", [
        "childbearing_stage",
        "child_rearing_stage",
        "family_planning",
        "spouse_share_childcare",
        "attend_school_needs",
        "childcare_responsibility",
      ])}

      {renderSection("Household Managing Role", "household_managing_role", [
        "spouse_participate_household",
        "family_participate_household",
        "decision_manage_household",
        "household_decision_explanation",
      ])}

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
    </div>
  );
}
