"use client";

import { useEffect, useState } from "react";
import { FaIdCard } from "react-icons/fa";
import allData from "@/public/data/all.json";

const emptyAddress = {
  region: { code: "", name: "" },
  province: { code: "", name: "" },
  city: { code: "", name: "" },
  barangay: { code: "", name: "" },
};

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
    const normAddr = (addr = {}) => ({
      region: addr.region || { code: "", name: "" },
      province: addr.province || { code: "", name: "" },
      city: addr.city || { code: "", name: "" },
      barangay: addr.barangay || { code: "", name: "" },
    });
    const normalized = {
      email: contact.email || "",
      mobileNumber: contact.mobileNumber || "",
      currentAddress: normAddr(contact.currentAddress),
      permanentAddress: normAddr(contact.permanentAddress),
    };
    setFormData(normalized);
    setOriginalData(normalized);
  }, [profile]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddressChange = (which, key, code) => {
    setFormData((prev) => {
      let updated = {
        ...prev,
        [which]: {
          ...(prev[which] || {}),
          [key]: { code, name: "" },
        },
      };
      // Set name based on code
      let list = [];
      if (key === "region") list = allData.regions;
      if (key === "province") list = allData.provinces;
      if (key === "city") list = allData.cities;
      if (key === "barangay") list = allData.barangays;
      const found = list.find((item) => item.code === code);
      updated[which][key].name = found ? found.name : "";
      if (key === "region") {
        updated[which].province = { code: "", name: "" };
        updated[which].city = { code: "", name: "" };
        updated[which].barangay = { code: "", name: "" };
      } else if (key === "province") {
        updated[which].city = { code: "", name: "" };
        updated[which].barangay = { code: "", name: "" };
      } else if (key === "city") {
        updated[which].barangay = { code: "", name: "" };
      }
      return updated;
    });
  };

  // Accepts { code, name } objects and returns the same structure (for backend)
  const buildAddress = (address) => ({
    region: { code: address.region.code, name: address.region.name },
    province: { code: address.province.code, name: address.province.name },
    city: { code: address.city.code, name: address.city.name },
    barangay: { code: address.barangay.code, name: address.barangay.name },
  });

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
          currentAddress: buildAddress(formData.currentAddress),
          permanentAddress: buildAddress(formData.permanentAddress),
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

  const renderAddress = (label, which) => {
    const addr = formData[which] || emptyAddress;
    const regions = allData.regions;
    const provinces = addr.region.code
      ? allData.provinces.filter((p) => p.region_code === addr.region.code)
      : [];
    const cities = addr.province.code
      ? allData.cities.filter((c) => c.province_code === addr.province.code)
      : [];
    const barangays = addr.city.code
      ? allData.barangays.filter((b) => b.city_code === addr.city.code)
      : [];
    return (
      <div className="flex flex-col gap-2 ">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
          {isEditing && which === "currentAddress" && (
            <div className="flex items-center ml-2">
              <input
                type="checkbox"
                id="sameAsPermanent"
                className="mr-2"
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData((prev) => ({
                      ...prev,
                      currentAddress: { ...prev.permanentAddress },
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      currentAddress: { ...emptyAddress },
                    }));
                  }
                }}
              />
              <label
                htmlFor="sameAsPermanent"
                className="text-sm text-gray-700"
              >
                Same as Permanent Address
              </label>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Region</label>
          {isEditing ? (
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={addr.region.code}
              onChange={(e) =>
                handleAddressChange(which, "region", e.target.value)
              }
            >
              <option value="">Select Region</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="border border-gray-300 rounded px-3 py-1">
              {addr.region.name || "N/A"}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Province</label>
          {isEditing ? (
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={addr.province.code}
              onChange={(e) =>
                handleAddressChange(which, "province", e.target.value)
              }
              disabled={!addr.region.code}
            >
              <option value="">Select Province</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="border border-gray-300 rounded px-3 py-1">
              {addr.province.name || "N/A"}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">
            City/Municipality
          </label>
          {isEditing ? (
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={addr.city.code}
              onChange={(e) =>
                handleAddressChange(which, "city", e.target.value)
              }
              disabled={!addr.province.code}
            >
              <option value="">Select City/Municipality</option>
              {cities.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="border border-gray-300 rounded px-3 py-1">
              {addr.city.name || "N/A"}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Barangay</label>
          {isEditing ? (
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={addr.barangay.code}
              onChange={(e) =>
                handleAddressChange(which, "barangay", e.target.value)
              }
              disabled={!addr.city.code}
            >
              <option value="">Select Barangay</option>
              {barangays.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="border border-gray-300 rounded px-3 py-1">
              {addr.barangay.name || "N/A"}
            </p>
          )}
        </div>
      </div>
    );
  };

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
          {renderAddress("Permanent Address", "permanentAddress")}
          {renderAddress("Current Address", "currentAddress")}
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
