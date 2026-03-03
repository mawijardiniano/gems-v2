"use client";

import { useEffect, useState } from "react";
import { FaIdCard } from "react-icons/fa";

const emptyAddress = { barangay: "", city: "", province: "" };

export default function ContactInformationContent({ profile }) {
  const [currentProfile, setCurrentProfile] = useState(profile || null);
  const [formData, setFormData] = useState({
    email: "",
    mobileNumber: "",
    currentAddress: { ...emptyAddress },
    permanentAddress: { ...emptyAddress },
  });
  const [originalData, setOriginalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  useEffect(() => {
    const contact = (profile && profile.contact) || {};
    const normalized = {
      email: contact.email || "",
      mobileNumber: contact.mobileNumber || "",
      currentAddress: { ...emptyAddress, ...(contact.currentAddress || {}) },
      permanentAddress: {
        ...emptyAddress,
        ...(contact.permanentAddress || {}),
      },
    };
    setFormData(normalized);
    setOriginalData(normalized);
  }, [profile]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddressChange = (which, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [which]: {
        ...(prev[which] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.email || !formData.mobileNumber) {
      setToastMessage("Email and mobile number are required.");
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    try {
      const profileId = currentProfile?._id;
      if (!profileId) throw new Error("Profile ID not found");
      setIsUpdating(true);

      const payload = {
        contact: {
          ...formData,
          currentAddress: { ...formData.currentAddress },
          permanentAddress: { ...formData.permanentAddress },
        },
      };

      const res = await fetch(`/api/profile/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save contact info");
      const data = await res.json();

      const updated = data.data || currentProfile;
      const updatedContact = updated.contact || payload.contact;
      const normalized = {
        email: updatedContact.email || "",
        mobileNumber: updatedContact.mobileNumber || "",
        currentAddress: {
          ...emptyAddress,
          ...(updatedContact.currentAddress || {}),
        },
        permanentAddress: {
          ...emptyAddress,
          ...(updatedContact.permanentAddress || {}),
        },
      };

      setCurrentProfile(updated);
      setFormData(normalized);
      setOriginalData(normalized);
      setIsEditing(false);
      setToastMessage("Contact information saved.");
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
      setToastMessage("Failed to save contact info.");
      setToastColor("failure");
      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderText = (label, key, type = "text") => (
    <div className="flex flex-col">
      <label className="font-medium text-gray-700 mb-1">{label}</label>
      {isEditing ? (
        <input
          type={type}
          className="border border-gray-300 rounded px-3 py-1"
          value={formData[key]}
          onChange={(e) => handleChange(key, e.target.value)}
        />
      ) : (
        <p className="border border-gray-300 rounded px-3 py-1">
          {formData[key] || "N/A"}
        </p>
      )}
    </div>
  );

  const renderAddress = (label, which) => (
    <div className="flex flex-col gap-2 border border-gray-100 rounded p-3 bg-gray-50">
      <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
      {["barangay", "city", "province"].map((field) => (
        <div className="flex flex-col" key={`${which}-${field}`}>
          <label className="text-xs text-gray-600 mb-1 capitalize">
            {field}
          </label>
          {isEditing ? (
            <input
              className="border border-gray-300 rounded px-3 py-1"
              value={formData[which]?.[field] || ""}
              onChange={(e) =>
                handleAddressChange(which, field, e.target.value)
              }
            />
          ) : (
            <p className="border border-gray-300 rounded px-3 py-1">
              {formData[which]?.[field] || "N/A"}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <div className="border border-gray-200 p-6 rounded">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaIdCard className="text-2xl text-gray-600" />
            <div>
              <h1 className="text-lg font-medium">Contact Information</h1>
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
          {renderText("Email", "email", "email")}
          {renderText("Mobile Number", "mobileNumber")}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {renderAddress("Current Address", "currentAddress")}
          {renderAddress("Permanent Address", "permanentAddress")}
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
