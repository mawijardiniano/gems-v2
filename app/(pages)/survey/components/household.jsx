"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setHouseholdManagingRole,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function HouseholdManagingRole() {
  const dispatch = useDispatch();
  const h = useSelector((state) => state.profile.household_managing_role);
  const p = useSelector((state) => state.profile.personal_information);

  const currentStep = useSelector((state) => state.profile.currentStep);

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      household_managing_role: h,
    });
  };

  const update = (field, value) =>
    dispatch(setHouseholdManagingRole({ field, value }));

  const stringOptions = ["Yes", "No", "N/A"];
  const booleanOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      {/* Progress Bar */}
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Household Managing Role
      </h2>
      {p.civil_status !== "Single" && (
        <div>
          <p className="font-medium text-gray-700 mb-2">
            Does your spouse participate in household chores?
          </p>
          <div className="flex gap-6">
            {stringOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="spouse_participate_household"
                  checked={h.spouse_participate_household === opt}
                  onChange={() => update("spouse_participate_household", opt)}
                  className="w-4 h-4 accent-blue-500"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-medium text-gray-700 mb-2">
          Does your family participate in household chores?
        </p>
        <div className="flex gap-6">
          {booleanOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="family_participate_household"
                checked={h.family_participate_household === opt.value}
                onChange={() =>
                  update("family_participate_household", opt.value)
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium text-gray-700 mb-2">
          Do you make decisions to manage the household?
        </p>
        <div className="flex gap-6">
          {booleanOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="decision_manage_household"
                checked={h.decision_manage_household === opt.value}
                onChange={() => update("decision_manage_household", opt.value)}
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600 font-medium mb-2">
          Explain your household decision-making
        </label>
        <textarea
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={h.household_decision_explanation || ""}
          onChange={(e) =>
            update("household_decision_explanation", e.target.value)
          }
          placeholder="Describe how household decisions are made"
          rows={4}
        />
      </div>

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
