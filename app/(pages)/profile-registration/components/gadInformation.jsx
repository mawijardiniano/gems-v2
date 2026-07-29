"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setGadData,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";
import { FaChartBar, FaArrowRight, FaArrowLeft, FaVenusMars, FaWheelchair, FaUsers, FaMoneyBillWave, FaUserTie } from "react-icons/fa";

export default function GadInformation() {
  const dispatch = useDispatch();
  const gadData = useSelector((state) => state.profile.gadData);

  const update = (field, value) => dispatch(setGadData({ field, value }));

  const requiredFields = [
    "sexAtBirth",
    "gender_preference",
    "socioEconomicStatus",
    "isPWD",
    "isIndigenousPerson",
    "headOfHousehold",
  ];
  const isPwdTypeRequired = gadData.isPWD === true;
  const isNextDisabled =
    requiredFields.some(
      (field) =>
        gadData[field] === undefined ||
        gadData[field] === null ||
        gadData[field].toString().trim() === "",
    ) ||
    (isPwdTypeRequired && (!gadData.pwd_type || gadData.pwd_type === ""));

  const RadioGroup = ({ name, value, options, onChange }) => (
    <div className="flex gap-4 mt-1">
      {options.map((opt) => (
        <label
          key={opt.label}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
            value === opt.value
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              value === opt.value ? "border-blue-500" : "border-gray-300"
            }`}
          >
            {value === opt.value && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          <span className="text-sm font-medium">{opt.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <Progress />

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaChartBar className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">GAD Data</h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  Gender and Development demographic information
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
   
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaVenusMars className="text-blue-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Sex at Birth <span className="text-red-400">*</span>
                  </label>
                </div>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                  value={gadData.sexAtBirth}
                  onChange={(e) => update("sexAtBirth", e.target.value)}
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaUsers className="text-purple-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Gender Preference <span className="text-red-400">*</span>
                  </label>
                </div>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                  value={gadData.gender_preference}
                  onChange={(e) => update("gender_preference", e.target.value)}
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>LGBTQIA+</option>
                </select>
              </div>
            </div>

            {/* Socio-economic Status */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <FaMoneyBillWave className="text-emerald-500" />
                <label className="text-sm font-semibold text-gray-700">
                  Socio-economic Status <span className="text-red-400">*</span>
                </label>
              </div>
              <select
                className="w-full md:w-1/2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                value={gadData.socioEconomicStatus}
                onChange={(e) => update("socioEconomicStatus", e.target.value)}
              >
                <option value="">Select</option>
                <option>Low Income</option>
                <option>Middle Income</option>
                <option>High Income</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaWheelchair className="text-amber-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Person with Disability <span className="text-red-400">*</span>
                  </label>
                </div>
                <RadioGroup
                  name="isPWD"
                  value={gadData.isPWD}
                  options={[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ]}
                  onChange={(val) => {
                    update("isPWD", val);
                    if (val === false) update("pwd_type", undefined);
                  }}
                />
                {gadData.isPWD === true && (
                  <select
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white mt-3"
                    value={gadData.pwd_type}
                    onChange={(e) => update("pwd_type", e.target.value)}
                  >
                    <option value="">Select PWD Type</option>
                    {[
                              "Psychosocial Disability",
        "Chronic Illness",
        "Learning Disability",
        "Visual Disability",
        "Hearing Disability",
        "Physical Disability",
        "Mental Disability",
        "Speech and Language Impairment",
        "Multiple Disabilities",
                    ].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaUsers className="text-indigo-500" />
                  <label className="text-sm font-semibold text-gray-700">
                    Indigenous Person <span className="text-red-400">*</span>
                  </label>
                </div>
                <RadioGroup
                  name="isIndigenousPerson"
                  value={gadData.isIndigenousPerson}
                  options={[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ]}
                  onChange={(val) => update("isIndigenousPerson", val)}
                />
              </div>
            </div>

            {/* Head of Household */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <FaUserTie className="text-cyan-500" />
                <label className="text-sm font-semibold text-gray-700">
                  Who is the head of the household?{" "}
                  <span className="text-red-400">*</span>
                </label>
              </div>
              <input
                className="w-full md:w-1/2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white"
                value={gadData.headOfHousehold}
                onChange={(e) => update("headOfHousehold", e.target.value)}
                placeholder="e.g., Self, Spouse, Parent"
              />
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
              onClick={() => !isNextDisabled && dispatch(nextStep())}
              disabled={isNextDisabled}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isNextDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              }`}
            >
              Next Step <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}