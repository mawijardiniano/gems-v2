"use client";

import { useState, useEffect } from "react";
import { FaHandsHelping } from "react-icons/fa";

const YES_NO_NA = ["Yes", "No", "N/A"];

export default function EnvironmentalContent({ profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile?.environmental_climate || {});
  const [originalData, setOriginalData] = useState(profile?.environmental_climate || {});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setFormData(profile?.environmental_climate || {});
    setOriginalData(profile?.environmental_climate || {});
  }, [profile]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
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
        body: JSON.stringify({
          environmental_climate: formData,
        }),
      });

      if (!response.ok) throw new Error("Failed to update environmental info");

      const data = await response.json();
      setFormData(data.data.environmental_climate);
      setOriginalData(data.data.environmental_climate);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderField = (key, value) => {
     if (!isEditing) {
      let display = value;
      if (typeof value === "boolean") display = value ? "Yes" : "No";
      if (YES_NO_NA.includes(value)) display = value;
      if (!display) display = "-";
      return (
        <div className="border border-gray-300 px-2 py-1 rounded bg-gray-50 min-w-[100px]">
          {display}
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <select
          value={value ? "Yes" : "No"}
          onChange={(e) => handleChange(key, e.target.value === "Yes")}
          className="border px-2 py-1 rounded"
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
          onChange={(e) => handleChange(key, e.target.value)}
          className="border px-2 py-1 rounded"
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
        onChange={(e) => handleChange(key, e.target.value)}
        className="border px-2 py-1 rounded"
      />
    );
  };

  return (
    <div className="pt-6">
      <div className="border border-gray-200 p-8">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FaHandsHelping />
            Environmental & Climate Awareness
          </h1>
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

        <div className="flex flex-wrap gap-8">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <h1 className="font-medium mb-1">
                {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </h1>
              {renderField(key, value)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
