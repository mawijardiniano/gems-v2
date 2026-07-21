"use client";

import { useEffect, useState } from "react";
import {
  FaSave,
  FaTimes,
  FaEdit,
  FaCheckCircle,
  FaVenusMars,
  FaTransgender,
  FaWheelchair,
  FaUsers,
  FaMoneyBillWave,
  FaHome,
  FaGlobeAsia,
  FaBalanceScale,
} from "react-icons/fa";

const SEX_AT_BIRTH = ["Male", "Female"];
const GENDER_PREFERENCE = ["Male", "Female", "LGBTQIA+"];
const SOCIO_ECONOMIC = ["Low Income", "Middle Income", "High Income"];
const PWD_TYPES = [
  "Visual Impairment",
  "Hearing Impairment",
  "Physical Disability",
  "Mental Disability",
  "Multiple Disabilities",
  "Other",
];

function DetailCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${color || "bg-indigo-50 text-indigo-600"}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-base font-semibold text-gray-900 mt-1 truncate">{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, visible }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}>
        {type === "success" ? (
          <FaCheckCircle className="text-emerald-500 shrink-0 text-lg" />
        ) : (
          <FaTimes className="text-red-500 shrink-0 text-lg" />
        )}
        <p className="text-sm font-semibold">{message}</p>
      </div>
    </div>
  );
}

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
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    const gad = (profile && profile.gadData) || {};
    const normalized = {
      sexAtBirth: gad.sexAtBirth || "",
      gender_preference: gad.gender_preference || "",
      isPWD: gad.isPWD === true ? "true" : gad.isPWD === false ? "false" : "",
      pwd_type: gad.pwd_type || "",
      isIndigenousPerson: gad.isIndigenousPerson === true ? "true" : gad.isIndigenousPerson === false ? "false" : "",
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
      showToast("Sex at birth, gender preference, PWD status, indigenous status, socio-economic status, and head of household are required.", "failure");
      return;
    }

    if (formData.isPWD === "true" && !formData.pwd_type) {
      showToast("PWD type is required when PWD is Yes.", "failure");
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
        isPWD: updatedGad.isPWD === true ? "true" : updatedGad.isPWD === false ? "false" : "",
        pwd_type: updatedGad.pwd_type || "",
        isIndigenousPerson: updatedGad.isIndigenousPerson === true ? "true" : updatedGad.isIndigenousPerson === false ? "false" : "",
        socioEconomicStatus: updatedGad.socioEconomicStatus || "",
        headOfHousehold: updatedGad.headOfHousehold || "",
      };

      setCurrentProfile(updated);
      setFormData(normalized);
      setOriginalData(normalized);
      setIsEditing(false);
      showToast("GAD data saved successfully.");

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profileUpdated", { detail: updated }));
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
      showToast("Failed to save GAD data.", "failure");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderSelect = (label, key, options) => {
    const value = formData[key];
    if (!isEditing) return null;
    return (
      <select
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        value={value}
        onChange={(e) => handleChange(key, e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  };

  const renderYesNo = (label, key) => {
    const value = formData[key];
    if (!isEditing) return null;
    return (
      <select
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        value={value}
        onChange={(e) => handleChange(key, e.target.value)}
      >
        <option value="">Select {label}</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  };

  const gadCards = [
    { icon: <FaVenusMars />, label: "Sex at Birth", value: formData.sexAtBirth, color: "bg-rose-50 text-rose-600" },
    { icon: <FaTransgender />, label: "Gender Preference", value: formData.gender_preference, color: "bg-purple-50 text-purple-600" },
    { icon: <FaWheelchair />, label: "PWD", value: formData.isPWD === "true" ? "Yes" : formData.isPWD === "false" ? "No" : "—", color: "bg-blue-50 text-blue-600" },
    { icon: <FaGlobeAsia />, label: "Indigenous Person", value: formData.isIndigenousPerson === "true" ? "Yes" : formData.isIndigenousPerson === "false" ? "No" : "—", color: "bg-teal-50 text-teal-600" },
    { icon: <FaMoneyBillWave />, label: "Socio-economic Status", value: formData.socioEconomicStatus, color: "bg-amber-50 text-amber-600" },
    { icon: <FaHome />, label: "Head of Household", value: formData.headOfHousehold, color: "bg-indigo-50 text-indigo-600" },
  ];

  // Add PWD type card if applicable
  if (formData.isPWD === "true" && formData.pwd_type) {
    gadCards.splice(3, 0, { icon: <FaWheelchair />, label: "PWD Type", value: formData.pwd_type, color: "bg-sky-50 text-sky-600" });
  }

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gender and Development (GAD) Data</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your gender equity and demographic information</p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <FaSave className="text-xs" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing && originalData) setFormData(originalData);
                setIsEditing(!isEditing);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                isEditing
                  ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300"
              }`}
            >
              {isEditing ? (
                <><FaTimes className="text-xs" /> Cancel</>
              ) : (
                <><FaEdit className="text-xs" /> Edit</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* View Mode */}
      {!isEditing && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FaBalanceScale />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">GAD Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gadCards.map((card, i) => (
              <DetailCard key={i} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FaBalanceScale />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">GAD Information</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update your gender equity and demographic details</p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Sex at Birth <span className="text-red-400">*</span></label>
                {renderSelect("Sex at Birth", "sexAtBirth", SEX_AT_BIRTH)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Gender Preference <span className="text-red-400">*</span></label>
                {renderSelect("Gender Preference", "gender_preference", GENDER_PREFERENCE)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">PWD <span className="text-red-400">*</span></label>
                {renderYesNo("PWD", "isPWD")}
              </div>
              {formData.isPWD === "true" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">PWD Type</label>
                  {renderSelect("PWD Type", "pwd_type", PWD_TYPES)}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Indigenous Person <span className="text-red-400">*</span></label>
                {renderYesNo("Indigenous Person", "isIndigenousPerson")}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Socio-economic Status <span className="text-red-400">*</span></label>
                {renderSelect("Socio-economic Status", "socioEconomicStatus", SOCIO_ECONOMIC)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Head of Household <span className="text-red-400">*</span></label>
                {!isEditing ? (
                  <p className="text-sm font-semibold text-gray-900 py-3">{formData.headOfHousehold || "—"}</p>
                ) : (
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    value={formData.headOfHousehold}
                    onChange={(e) => handleChange("headOfHousehold", e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}