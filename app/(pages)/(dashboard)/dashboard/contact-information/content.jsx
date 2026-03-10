"use client";

import { useEffect, useState } from "react";
import { FaIdCard } from "react-icons/fa";
import allData from "@/public/data/all.json";

const emptyAddress = { region: "", province: "", city: "", barangay: "" };

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
      region: addr.region || "",
      province: addr.province || "",
      city: addr.city || "",
      barangay: addr.barangay || "",
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

  const handleAddressChange = (which, key, value) => {
    setFormData((prev) => {
      let updated = {
        ...prev,
        [which]: {
          ...(prev[which] || {}),
          [key]: value,
        },
      };
      if (key === "region") {
        updated[which].province = "";
        updated[which].city = "";
        updated[which].barangay = "";
      } else if (key === "province") {
        updated[which].city = "";
        updated[which].barangay = "";
      } else if (key === "city") {
        updated[which].barangay = "";
      }
      return updated;
    });
  };

  const getAddressWithNames = (addr) => {
    const regionObj = allData.regions.find((r) => r.code === addr.region);
    const provinceObj = allData.provinces.find((p) => p.code === addr.province);
    const cityObj = allData.cities.find((c) => c.code === addr.city);
    const barangayObj = allData.barangays.find((b) => b.code === addr.barangay);
    return {
      region: regionObj ? regionObj.name : "",
      province: provinceObj ? provinceObj.name : "",
      city: cityObj ? cityObj.name : "",
      barangay: barangayObj ? barangayObj.name : "",
    };
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
          currentAddress: getAddressWithNames(formData.currentAddress),
          permanentAddress: getAddressWithNames(formData.permanentAddress),
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
    const provinces = addr.region
      ? allData.provinces.filter((p) => p.region_code === addr.region)
      : [];
    const cities = addr.province
      ? allData.cities.filter((c) => c.province_code === addr.province)
      : [];
    const barangays = addr.city
      ? allData.barangays.filter((b) => b.city_code === addr.city)
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
              value={addr.region}
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
              {addr.region || "N/A"}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Province</label>
          {isEditing ? (
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={addr.province}
              onChange={(e) =>
                handleAddressChange(which, "province", e.target.value)
              }
              disabled={!addr.region}
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
              {addr.province || "N/A"}
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
              value={addr.city}
              onChange={(e) =>
                handleAddressChange(which, "city", e.target.value)
              }
              disabled={!addr.province}
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
              {addr.city || "N/A"}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Barangay</label>
          {isEditing ? (
            <select
              className="border border-gray-300 rounded px-3 py-1"
              value={addr.barangay}
              onChange={(e) =>
                handleAddressChange(which, "barangay", e.target.value)
              }
              disabled={!addr.city}
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
              {addr.barangay || "N/A"}
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
