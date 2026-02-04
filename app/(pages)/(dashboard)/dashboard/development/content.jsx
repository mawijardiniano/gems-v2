"use client";
import { useState, useEffect } from "react";

const YES_NO_NA = ["Yes", "No", "N/A"];

export default function DevelopmentContent({ profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile?.social_development || {});
  const [originalData, setOriginalData] = useState(
    profile?.social_development || {}
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setFormData(profile?.social_development || {});
    setOriginalData(profile?.social_development || {});
  }, [profile]);

  const handleChange = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");

      const response = await fetch(`/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ social_development: formData }),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const data = await response.json();
      setFormData(data.data.social_development);
      setOriginalData(data.data.social_development);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const displayValue = (value) => {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (YES_NO_NA.includes(value)) return value;
    return value || "";
  };

  const renderField = (section, key, value) => {
    if (!isEditing) {
      return (
        <h1 className="border border-gray-300 px-2 py-1 rounded bg-gray-50">{displayValue(value)}</h1>
      );
    }

    if (typeof value === "boolean") {
      return (
        <select
          value={value ? "Yes" : "No"}
          onChange={(e) =>
            handleChange(section, key, e.target.value === "Yes")
          }
          className="border px-2 py-1 rounded w-full"
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      );
    }

    if (YES_NO_NA.includes(value)) {
      return (
        <select
          value={value}
          onChange={(e) => handleChange(section, key, e.target.value)}
          className="border px-2 py-1 rounded w-full"
        >
          {YES_NO_NA.map((opt) => (
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
        onChange={(e) => handleChange(section, key, e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
    );
  };

  const renderSection = (sectionName, sectionData, sectionKey) => (
    <div className="border border-gray-200 p-8 mb-4">
      <h1 className="text-lg font-semibold mb-4">{sectionName}</h1>
      <div className="flex flex-wrap gap-8">
        {Object.entries(sectionData || {}).map(([key, value]) => (
          <div key={key} className="flex flex-col w-80">
            <label className="font-medium text-gray-700 mb-1">
              {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </label>
            {renderField(sectionKey, key, value)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pt-6 space-y-4">
      <div className="border border-gray-200 p-8">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Development</h1>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) setFormData(originalData);
                setIsEditing(!isEditing);
              }}
              className="bg-white border border-gray-300 px-4 py-2 rounded"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        {renderSection(
          "Social Development",
          formData.housing_work_life_balance,
          "housing_work_life_balance"
        )}

        {renderSection(
          "Personal Development",
          formData.personal_development_empowerment,
          "personal_development_empowerment"
        )}
      </div>
    </div>
  );
}
