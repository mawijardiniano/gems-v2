"use client";

import { useEffect, useState } from "react";
import {
  FaSave,
  FaTimes,
  FaEdit,
  FaCheckCircle,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaHome,
  FaGlobe,
  FaIdCard,
} from "react-icons/fa";
import allData from "@/public/data/all.json";

const emptyAddress = {
  region: { code: "", name: "" },
  province: { code: "", name: "" },
  city: { code: "", name: "" },
  barangay: { code: "", name: "" },
};

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
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

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

  const buildAddress = (address) => ({
    region: { code: address.region.code, name: address.region.name },
    province: { code: address.province.code, name: address.province.name },
    city: { code: address.city.code, name: address.city.name },
    barangay: { code: address.barangay.code, name: address.barangay.name },
  });

  const getAddressSummary = (addr) => {
    if (!addr) return "—";
    const parts = [addr.barangay?.name, addr.city?.name, addr.province?.name, addr.region?.name].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const handleSave = async () => {
    if (!formData.email || !formData.mobileNumber) {
      showToast("Email and mobile number are required.", "failure");
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
        currentAddress: { ...emptyAddress, ...(updatedContact.currentAddress || {}) },
        permanentAddress: { ...emptyAddress, ...(updatedContact.permanentAddress || {}) },
      };

      setCurrentProfile(updated);
      setFormData(normalized);
      setOriginalData(normalized);
      setIsEditing(false);
      showToast("Contact information saved successfully.");

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profileUpdated", { detail: updated }));
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
      showToast("Failed to save contact info.", "failure");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderAddressSelect = (which, addr) => {
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
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Region</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
            value={addr.region.code}
            onChange={(e) => handleAddressChange(which, "region", e.target.value)}
          >
            <option value="">Select Region</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Province</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50"
            value={addr.province.code}
            onChange={(e) => handleAddressChange(which, "province", e.target.value)}
            disabled={!addr.region.code}
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">City/Municipality</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50"
            value={addr.city.code}
            onChange={(e) => handleAddressChange(which, "city", e.target.value)}
            disabled={!addr.province.code}
          >
            <option value="">Select City/Municipality</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Barangay</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all disabled:opacity-50"
            value={addr.barangay.code}
            onChange={(e) => handleAddressChange(which, "barangay", e.target.value)}
            disabled={!addr.city.code}
          >
            <option value="">Select Barangay</option>
            {barangays.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const contactCards = [
    { icon: <FaEnvelope />, label: "Email Address", value: formData.email, color: "bg-blue-50 text-blue-600" },
    { icon: <FaPhone />, label: "Mobile Number", value: formData.mobileNumber, color: "bg-green-50 text-green-600" },
    { icon: <FaHome />, label: "Permanent Address", value: getAddressSummary(formData.permanentAddress), color: "bg-purple-50 text-purple-600" },
    { icon: <FaMapMarkerAlt />, label: "Current Address", value: getAddressSummary(formData.currentAddress), color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Information</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your email, phone number, and addresses</p>
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
              <FaIdCard />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Contact Details</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contactCards.map((card, i) => (
              <DetailCard key={i} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <>
          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="px-8 py-5 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FaEnvelope />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Contact Details</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Your email and phone number</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Email Address <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Mobile Number <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    value={formData.mobileNumber}
                    onChange={(e) => handleChange("mobileNumber", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="px-8 py-5 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <FaHome />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Permanent Address</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Your permanent/home address</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAddressSelect("permanentAddress", formData.permanentAddress)}
              </div>
            </div>
          </div>

          {/* Current Address */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="px-8 py-5 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Current Address</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Your current residence</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
                  <span className="text-xs font-medium text-gray-600">Same as Permanent</span>
                </label>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAddressSelect("currentAddress", formData.currentAddress)}
              </div>
            </div>
          </div>
        </>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}