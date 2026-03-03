"use client";

import { useEffect, useState } from "react";
import { FaIdCard } from "react-icons/fa";

const SEX_AT_BIRTH = ["Male", "Female"];
const GENDER_PREFERENCE = [
  "Male",
  "Female",
  "LGBTQIA+",
];
const SOCIO_ECONOMIC = ["Low Income", "Middle Income", "High Income"];
const PWD_TYPES = [
  "Visual Impairment",
  "Hearing Impairment",
  "Physical Disability",
  "Mental Disability",
  "Multiple Disabilities",
  "Other",
];

export default function GenderEquityDataContent({ profile }) {
  const [currentProfile, setCurrentProfile] = useState(profile || null);
  const [formData, setFormData] = useState({
    sexAtBirth: "",
    gender_preference: "",
    isPWD: "",
    pwd_type: "",
    isIndigenousPerson: "",
    socioEconomicStatus: "",
    headOfHousehold: "",
  });
  const [originalData, setOriginalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  useEffect(() => {
    const gad = (profile && profile.gadData) || {};
    const normalized = {
      sexAtBirth: gad.sexAtBirth || "",
      gender_preference: gad.gender_preference || "",
      isPWD: gad.isPWD === true ? "true" : gad.isPWD === false ? "false" : "",
      pwd_type: gad.pwd_type || "",
      isIndigenousPerson:
        gad.isIndigenousPerson === true
          ? "true"
          : gad.isIndigenousPerson === false
            ? "false"
            : "",
      socioEconomicStatus: gad.socioEconomicStatus || "",
      headOfHousehold: gad.headOfHousehold || "",
    };
    setFormData(normalized);
    setOriginalData(normalized);
  }, [profile]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const required = [
      formData.sexAtBirth,
      formData.gender_preference,
      formData.socioEconomicStatus,
      formData.headOfHousehold,
      formData.isPWD,
      formData.isIndigenousPerson,
    ];

    if (required.some((v) => v === "")) {
      setToastMessage(
        "Sex at birth, gender preference, PWD status, indigenous status, socio-economic status, and head of household are required.",
      );
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    if (formData.isPWD === "true" && !formData.pwd_type) {
      setToastMessage("PWD type is required when PWD is Yes.");
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    try {
      const profileId = currentProfile?._id;
      if (!profileId) throw new Error("Profile ID not found");
      setIsUpdating(true);

      const payload = {
        gadData: {
          sexAtBirth: formData.sexAtBirth,
          gender_preference: formData.gender_preference,
          isPWD: formData.isPWD === "true",
          pwd_type: formData.isPWD === "true" ? formData.pwd_type : undefined,
          isIndigenousPerson: formData.isIndigenousPerson === "true",
          socioEconomicStatus: formData.socioEconomicStatus,
          headOfHousehold: formData.headOfHousehold,
        },
      };

      const res = await fetch(`/api/profile/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save GAD data");
      const data = await res.json();

      const updated = data.data || currentProfile;
      const updatedGad = updated.gadData || payload.gadData;
      const normalized = {
        sexAtBirth: updatedGad.sexAtBirth || "",
        gender_preference: updatedGad.gender_preference || "",
        isPWD:
          updatedGad.isPWD === true
            ? "true"
            : updatedGad.isPWD === false
              ? "false"
              : "",
        pwd_type: updatedGad.pwd_type || "",
        isIndigenousPerson:
          updatedGad.isIndigenousPerson === true
            ? "true"
            : updatedGad.isIndigenousPerson === false
              ? "false"
              : "",
        socioEconomicStatus: updatedGad.socioEconomicStatus || "",
        headOfHousehold: updatedGad.headOfHousehold || "",
      };

      setCurrentProfile(updated);
      setFormData(normalized);
      setOriginalData(normalized);
      setIsEditing(false);
      setToastMessage("GAD data saved.");
      setToastColor("success");
      setShowToast(true);

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profileUpdated", { detail: updated }),
          );
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to save GAD data.");
      setToastColor("failure");
      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderSelect = (label, key, options) => (
    <div className="flex flex-col">
      <label className="font-medium text-gray-700 mb-1">{label}</label>
      {isEditing ? (
        <select
          className="border border-gray-300 rounded px-3 py-1"
          value={formData[key]}
          onChange={(e) => handleChange(key, e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <p className="border border-gray-300 rounded px-3 py-1">
          {formData[key] || "N/A"}
        </p>
      )}
    </div>
  );

  const renderYesNo = (label, key) => (
    <div className="flex flex-col">
      <label className="font-medium text-gray-700 mb-1">{label}</label>
      {isEditing ? (
        <select
          className="border border-gray-300 rounded px-3 py-1"
          value={formData[key]}
          onChange={(e) => handleChange(key, e.target.value)}
        >
          <option value="">Select {label}</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <p className="border border-gray-300 rounded px-3 py-1">
          {formData[key] === "true"
            ? "Yes"
            : formData[key] === "false"
              ? "No"
              : "N/A"}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="border border-gray-200 p-6 rounded">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaIdCard className="text-2xl text-gray-600" />
            <div>
              <h1 className="text-lg font-medium">GAD Data</h1>
            </div>
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
                if (isEditing && originalData) setFormData(originalData);
                setIsEditing(!isEditing);
              }}
              className="bg-white border border-gray-200 px-3 py-1 rounded"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSelect("Sex at Birth", "sexAtBirth", SEX_AT_BIRTH)}
          {renderSelect(
            "Gender Preference",
            "gender_preference",
            GENDER_PREFERENCE,
          )}
          {renderYesNo("PWD", "isPWD")}
          {renderYesNo("Indigenous Person", "isIndigenousPerson")}
          {formData.isPWD === "true" &&
            renderSelect("PWD Type", "pwd_type", PWD_TYPES)}
          {renderSelect(
            "Socio-economic Status",
            "socioEconomicStatus",
            SOCIO_ECONOMIC,
          )}
          <div className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">
              Head of Household
            </label>
            {isEditing ? (
              <input
                className="border border-gray-300 rounded px-3 py-1"
                value={formData.headOfHousehold}
                onChange={(e) =>
                  handleChange("headOfHousehold", e.target.value)
                }
              />
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1">
                {formData.headOfHousehold || "N/A"}
              </p>
            )}
          </div>
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
