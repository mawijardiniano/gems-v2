"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setContact,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";
import AddressData from "@/public/data/all.json";
import { useState, useMemo } from "react";
import { FaMapMarkerAlt, FaArrowRight, FaArrowLeft, FaEnvelope, FaPhone, FaCopy } from "react-icons/fa";

export default function ContactInformation() {
  const dispatch = useDispatch();
  const contact = useSelector((state) => state.profile.contact);
  const [copyChecked, setCopyChecked] = useState(false);

  const update = (field, value) => dispatch(setContact({ field, value }));

  const selectedRegion = contact.permanentAddress?.region || "";
  const selectedProvince = contact.permanentAddress?.province || "";
  const selectedCity = contact.permanentAddress?.city || "";

  const regions = useMemo(() => AddressData.regions || [], []);
  const provinces = useMemo(
    () =>
      selectedRegion
        ? (AddressData.provinces || []).filter(
            (p) => p.region_code === selectedRegion,
          )
        : [],
    [selectedRegion],
  );
  const cities = useMemo(
    () =>
      selectedProvince
        ? (AddressData.cities || []).filter(
            (m) => m.province_code === selectedProvince,
          )
        : [],
    [selectedProvince],
  );
  const barangays = useMemo(
    () =>
      selectedCity
        ? (AddressData.barangays || []).filter(
            (b) => b.city_code === selectedCity,
          )
        : [],
    [selectedCity],
  );

  const buildAddress = (address) => {
    const regionObj = AddressData.regions.find(
      (r) => r.code === address.region,
    );
    const provinceObj = AddressData.provinces.find(
      (p) => p.code === address.province,
    );
    const cityObj = AddressData.cities.find((c) => c.code === address.city);
    const barangayObj = AddressData.barangays.find(
      (b) => b.code === address.barangay,
    );
    return {
      region: { code: address.region, name: regionObj ? regionObj.name : "" },
      province: {
        code: address.province,
        name: provinceObj ? provinceObj.name : "",
      },
      city: { code: address.city, name: cityObj ? cityObj.name : "" },
      barangay: {
        code: address.barangay,
        name: barangayObj ? barangayObj.name : "",
      },
    };
  };

  const requiredFields = [
    "email",
    "mobileNumber",
    "permanentAddress.barangay",
    "permanentAddress.city",
    "permanentAddress.province",
    "currentAddress.barangay",
    "currentAddress.city",
    "currentAddress.province",
  ];
  const getValue = (field) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      return contact[parent]?.[child];
    }
    return contact[field];
  };
  const isNextDisabled = requiredFields.some(
    (field) => !getValue(field) || getValue(field).toString().trim() === "",
  );

  const handleCopyChecked = (checked) => {
    setCopyChecked(checked);
    if (checked) {
      update("currentAddress.region", contact.permanentAddress.region || "");
      update("currentAddress.province", contact.permanentAddress.province || "");
      update("currentAddress.city", contact.permanentAddress.city || "");
      update("currentAddress.barangay", contact.permanentAddress.barangay || "");
    } else {
      update("currentAddress.region", "");
      update("currentAddress.province", "");
      update("currentAddress.city", "");
      update("currentAddress.barangay", "");
    }
  };

  const AddressSelect = ({ prefix, label }) => {
    const region = contact[prefix]?.region || "";
    const province = contact[prefix]?.province || "";
    const city = contact[prefix]?.city || "";
    const curProvinces = region
      ? (AddressData.provinces || []).filter((p) => p.region_code === region)
      : [];
    const curCities = province
      ? (AddressData.cities || []).filter((m) => m.province_code === province)
      : [];
    const curBarangays = city
      ? (AddressData.barangays || []).filter((b) => b.city_code === city)
      : [];

    return (
      <div className="space-y-3">
        <select
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
          value={region}
          onChange={(e) => {
            update(`${prefix}.region`, e.target.value);
            update(`${prefix}.province`, "");
            update(`${prefix}.city`, "");
            update(`${prefix}.barangay`, "");
          }}
        >
          <option value="">Select Region</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
          value={province}
          onChange={(e) => {
            update(`${prefix}.province`, e.target.value);
            update(`${prefix}.city`, "");
            update(`${prefix}.barangay`, "");
          }}
          disabled={!region}
        >
          <option value="">Select Province</option>
          {curProvinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
          value={city}
          onChange={(e) => {
            update(`${prefix}.city`, e.target.value);
            update(`${prefix}.barangay`, "");
          }}
          disabled={!province}
        >
          <option value="">Select City/Municipality</option>
          {curCities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
          value={contact[prefix]?.barangay || ""}
          onChange={(e) => update(`${prefix}.barangay`, e.target.value)}
          disabled={!city}
        >
          <option value="">Select Barangay</option>
          {curBarangays.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <Progress />

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaMapMarkerAlt className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Contact Information</h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  Your contact details and address
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Email & Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaEnvelope className="text-blue-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Email <span className="text-red-400">*</span>
                  </label>
                </div>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                  value={contact.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaPhone className="text-emerald-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                </div>
                <input
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                  type="number"
                  value={contact.mobileNumber}
                  onChange={(e) => update("mobileNumber", e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Permanent Address */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-500" />
                  Permanent Address <span className="text-red-400">*</span>
                </h3>
                <AddressSelect prefix="permanentAddress" label="Permanent" />
              </div>

              {/* Current Address */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-purple-500" />
                    Current Address <span className="text-red-400">*</span>
                  </h3>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={copyChecked}
                      onChange={(e) => handleCopyChecked(e.target.checked)}
                      className="sr-only"
                    />
                    <FaCopy className={`${copyChecked ? "text-blue-500" : "text-gray-400"}`} />
                    <span className="font-medium">Same as Permanent</span>
                  </label>
                </div>
                <AddressSelect prefix="currentAddress" label="Current" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => dispatch(prevStep())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
            >
              <FaArrowLeft className="text-xs" /> Previous
            </button>
            <button
              onClick={() => {
                if (!isNextDisabled) {
                  const permanent = buildAddress(contact.permanentAddress);
                  const current = buildAddress(contact.currentAddress);
                  dispatch(nextStep());
                }
              }}
              disabled={isNextDisabled}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isNextDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              }`}
            >
              Review & Submit <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}