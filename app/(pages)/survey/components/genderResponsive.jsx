"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setGenderResponsive,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function GenderResponsiveForm() {
  const dispatch = useDispatch();
  const gr = useSelector((state) => state.profile.gender_responsive);

  const update = (field, value) => {
    dispatch(setGenderResponsive({ field, value }));
  };

  const currentStep = useSelector((state) => state.profile.currentStep);

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      gender_responsive: gr,
    });
  };

  const yesNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];
  const respectOptions = [
    "Always",
    "Very Frequently",
    "Occasionally",
    "Rarely",
    "Very Rarely",
    "Never",
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Gender Responsive
      </h2>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">Access & Participation</h3>

        {[
          {
            label: "Equal Access to Resources",
            field: "equal_access_resources",
          },
          { label: "Control over Resources", field: "control_over_resources" },
          {
            label: "Consulted on Community Issues",
            field: "consulted_community_issues",
          },
          {
            label: "Consulted on Women Issues",
            field: "consulted_women_issues",
          },
          {
            label: "Consulted on Organization Issues",
            field: "consulted_organization_issues",
          },
        ].map(({ label, field }) => (
          <div key={field} className="flex items-center gap-6">
            <span className="w-64 text-sm font-medium text-gray-600">
              {label}
            </span>

            <div className="flex gap-4">
              {yesNoOptions.map((opt) => (
                <label key={opt.label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field}
                    checked={gr[field] === opt.value}
                    onChange={() => update(field, opt.value)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">Respect & Treatment</h3>
        {[
          {
            label: "Officials Respect Rights",
            field: "officials_respect_rights",
          },
          { label: "Treated with Respect", field: "treated_with_respect" },
        ].map(({ label, field }) => (
          <div key={field} className="flex flex-col">
            <span className="font-medium text-gray-600 mb-2">{label}</span>
            <div className="flex flex-wrap gap-4">
              {respectOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field}
                    value={opt}
                    checked={gr[field] === opt}
                    onChange={() => update(field, opt)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => dispatch(prevStep())}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
