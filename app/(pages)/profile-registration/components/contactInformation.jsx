"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setContact,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./layout/progress";
import AddressData from "@/public/data/all.json";
import { useState, useMemo } from "react";

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

  const getAddressNames = (address) => {
    const regionObj = (AddressData.regions || []).find(
      (r) => r.code === address.region,
    );
    const provinceObj = (AddressData.provinces || []).find(
      (p) => p.code === address.province,
    );
    const cityObj = (AddressData.cities || []).find(
      (c) => c.code === address.city,
    );
    const barangayObj = (AddressData.barangays || []).find(
      (b) => b.code === address.barangay,
    );
    return {
      region: regionObj ? regionObj.name : "",
      province: provinceObj ? provinceObj.name : "",
      city: cityObj ? cityObj.name : "",
      barangay: barangayObj ? barangayObj.name : "",
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
      const regionObj = (AddressData.regions || []).find(
        (r) => r.code === contact.permanentAddress.region,
      );
      const provinceObj = (AddressData.provinces || []).find(
        (p) => p.code === contact.permanentAddress.province,
      );
      const cityObj = (AddressData.cities || []).find(
        (c) => c.code === contact.permanentAddress.city,
      );
      const barangayObj = (AddressData.barangays || []).find(
        (b) =>
          b.name === contact.permanentAddress.barangay ||
          b.code === contact.permanentAddress.barangay,
      );
      console.log("Permanent Address Names:", {
        region: regionObj ? regionObj.name : "",
        province: provinceObj ? provinceObj.name : "",
        city: cityObj ? cityObj.name : "",
        barangay: barangayObj ? barangayObj.name : "",
      });
      update("currentAddress.region", contact.permanentAddress.region || "");
      update(
        "currentAddress.province",
        contact.permanentAddress.province || "",
      );
      update("currentAddress.city", contact.permanentAddress.city || "");
      update(
        "currentAddress.barangay",
        contact.permanentAddress.barangay || "",
      );
    } else {
      update("currentAddress.region", "");
      update("currentAddress.province", "");
      update("currentAddress.city", "");
      update("currentAddress.barangay", "");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Contact Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={contact.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="example@email.com"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={contact.mobileNumber}
            onChange={(e) => update("mobileNumber", e.target.value)}
            placeholder="09XXXXXXXXX"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">
            Permanent Address <span className="text-red-500">*</span>
          </h3>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={selectedRegion}
            onChange={(e) => {
              update("permanentAddress.region", e.target.value);
              update("permanentAddress.province", "");
              update("permanentAddress.city", "");
              update("permanentAddress.barangay", "");
            }}
            required
          >
            <option value="">Select Region</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={selectedProvince}
            onChange={(e) => {
              update("permanentAddress.province", e.target.value);
              update("permanentAddress.city", "");
              update("permanentAddress.barangay", "");
            }}
            required
            disabled={!selectedRegion}
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={selectedCity}
            onChange={(e) => {
              update("permanentAddress.city", e.target.value);
              update("permanentAddress.barangay", "");
            }}
            required
            disabled={!selectedProvince}
          >
            <option value="">Select City/Municipality</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.permanentAddress.barangay || ""}
            onChange={(e) =>
              update("permanentAddress.barangay", e.target.value)
            }
            required
            disabled={!selectedCity}
          >
            <option value="">Select Barangay</option>
            {barangays.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex flex-row justify-between">
            <h3 className="font-semibold text-gray-700">
              Current Address <span className="text-red-500">*</span>
            </h3>
            <label className="flex justify-center items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={copyChecked}
                onChange={(e) => handleCopyChecked(e.target.checked)}
              />
              Same as Permanent Address
            </label>
          </div>

          {(() => {
            const curRegion = contact.currentAddress?.region || "";
            const curProvince = contact.currentAddress?.province || "";
            const curCity = contact.currentAddress?.city || "";
            const curProvinces = curRegion
              ? (AddressData.provinces || []).filter(
                  (p) => p.region_code === curRegion,
                )
              : [];
            const curCities = curProvince
              ? (AddressData.cities || []).filter(
                  (m) => m.province_code === curProvince,
                )
              : [];
            const curBarangays = curCity
              ? (AddressData.barangays || []).filter(
                  (b) => b.city_code === curCity,
                )
              : [];
            return (
              <>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                  value={curRegion}
                  onChange={(e) => {
                    update("currentAddress.region", e.target.value);
                    update("currentAddress.province", "");
                    update("currentAddress.city", "");
                    update("currentAddress.barangay", "");
                  }}
                  required
                >
                  <option value="">Select Region</option>
                  {(AddressData.regions || []).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                  value={curProvince}
                  onChange={(e) => {
                    update("currentAddress.province", e.target.value);
                    update("currentAddress.city", "");
                    update("currentAddress.barangay", "");
                  }}
                  required
                  disabled={!curRegion}
                >
                  <option value="">Select Province</option>
                  {curProvinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                  value={curCity}
                  onChange={(e) => {
                    update("currentAddress.city", e.target.value);
                    update("currentAddress.barangay", "");
                  }}
                  required
                  disabled={!curProvince}
                >
                  <option value="">Select City/Municipality</option>
                  {curCities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                  value={contact.currentAddress.barangay || ""}
                  onChange={(e) =>
                    update("currentAddress.barangay", e.target.value)
                  }
                  required
                  disabled={!curCity}
                >
                  <option value="">Select Barangay</option>
                  {curBarangays.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </>
            );
          })()}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => dispatch(prevStep())}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
        >
          Previous
        </button>
        <button
          onClick={() => {
            if (!isNextDisabled) {
              const permanent = getAddressNames(contact.permanentAddress);
              const current = getAddressNames(contact.currentAddress);
              console.log("Permanent Address (to save):", permanent);
              console.log("Current Address (to save):", current);
              dispatch(nextStep());
            }
          }}
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition ${isNextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isNextDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
}
