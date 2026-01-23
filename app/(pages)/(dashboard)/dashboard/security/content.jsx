"use client";
import { useState, useEffect } from "react";
import { FaShieldAlt } from "react-icons/fa";

const FREQUENCY_OPTIONS = ["Always", "Often", "Sometimes", "Rarely", "Never"];
const YES_NO_NA = ["Yes", "No", "Not Sure"];

export default function SecurityContent({ profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile?.security_peace || {});
  const [originalData, setOriginalData] = useState(
    profile?.security_peace || {}
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setFormData(profile?.security_peace || {});
    setOriginalData(profile?.security_peace || {});
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
        body: JSON.stringify({ security_peace: formData }),
      });

      if (!response.ok) throw new Error("Failed to update security info");

      const data = await response.json();
      setFormData(data.data.security_peace);
      setOriginalData(data.data.security_peace);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderField = (section, key, value) => {
    if (!isEditing)
      return <h1 className="border px-2 py-1 rounded bg-gray-50">{value}</h1>;

    const options =
      section === "vaw_services_awareness" ? YES_NO_NA : FREQUENCY_OPTIONS;

    return (
      <select
        value={value}
        onChange={(e) => handleChange(section, key, e.target.value)}
        className="border px-2 py-1 rounded"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  const renderSection = (sectionName, sectionData) => (
    <div className="mb-6">
      <h1 className="mb-2 text-xl font-semibold">
        {sectionName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())}
      </h1>
      <div className="flex flex-wrap gap-8">
        {Object.entries(sectionData || {}).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <h1 className="font-medium mb-1">
              {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </h1>
            {renderField(sectionName, key, value)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pt-6">
      <div className="border border-gray-200 p-8">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FaShieldAlt />
            Security & Peace
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

        <div className="gap-4 flex flex-col">
          <div className="border border-gray-200 p-8">
            {renderSection(
              "gender_based_experiences",
              formData.gender_based_experiences
            )}
          </div>

          <div className="border border-gray-200 p-8">
            {renderSection("other_experiences", formData.other_experiences)}
          </div>

          <div className="border border-gray-200 p-8">
            {renderSection(
              "vaw_services_awareness",
              formData.vaw_services_awareness
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
