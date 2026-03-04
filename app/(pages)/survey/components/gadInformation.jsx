"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setGadData,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function GadInformation() {
  const dispatch = useDispatch();
  const gadData = useSelector((state) => state.profile.gadData);

  const update = (field, value) => dispatch(setGadData({ field, value }));

  // Required fields
  const requiredFields = [
    "sexAtBirth",
    "gender_preference",
    "socioEconomicStatus",
    "isPWD",
    "isIndigenousPerson",
    "headOfHousehold",
  ];
  // If isPWD is true, pwd_type is also required
  const isPwdTypeRequired = gadData.isPWD === true;
  const isNextDisabled =
    requiredFields.some(
      (field) =>
        gadData[field] === undefined ||
        gadData[field] === null ||
        gadData[field].toString().trim() === "",
    ) ||
    (isPwdTypeRequired && (!gadData.pwd_type || gadData.pwd_type === ""));

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        GAD Data
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Sex at Birth <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={gadData.sexAtBirth}
            onChange={(e) => update("sexAtBirth", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Gender Preference <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={gadData.gender_preference}
            onChange={(e) => update("gender_preference", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>LGBTQIA+</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Socio-economic Status <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={gadData.socioEconomicStatus}
            onChange={(e) => update("socioEconomicStatus", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Low Income</option>
            <option>Middle Income</option>
            <option>High Income</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Person with Disability <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4 items-center mt-1">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="isPWD"
                  className="w-4 h-4 accent-blue-500"
                  checked={gadData.isPWD === opt.value}
                  onChange={() => {
                    update("isPWD", opt.value);
                    if (opt.value === false) update("pwd_type", undefined);
                  }}
                  required
                />
                {opt.label}
              </label>
            ))}
          </div>
          {gadData.isPWD === true && (
            <select
              className="mt-2 border border-gray-300 rounded-lg px-3 py-2"
              value={gadData.pwd_type}
              onChange={(e) => update("pwd_type", e.target.value)}
              required
            >
              <option value="">Select PWD Type</option>
              {[
                "Visual Impairment",
                "Hearing Impairment",
                "Physical Disability",
                "Mental Disability",
                "Multiple Disabilities",
                "Other",
              ].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Indigenous Person <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4 items-center mt-1">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="isIndigenousPerson"
                  className="w-4 h-4 accent-blue-500"
                  checked={gadData.isIndigenousPerson === opt.value}
                  onChange={() => update("isIndigenousPerson", opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Who is the head of the household?{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={gadData.headOfHousehold}
            onChange={(e) => update("headOfHousehold", e.target.value)}
            placeholder="(e.g., Self, Spouse, Parent"
            required
          />
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
          onClick={() => !isNextDisabled && dispatch(nextStep())}
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition ${isNextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isNextDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
}
