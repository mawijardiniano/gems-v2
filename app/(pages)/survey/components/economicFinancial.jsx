"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setEconomicFinancialRole,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function EconomicFinancial() {
  const dispatch = useDispatch();
  const e = useSelector((state) => state.profile.economic_financial_role);
  const currentStep = useSelector((state) => state.profile.currentStep);

  const update = (field, value) =>
    dispatch(setEconomicFinancialRole({ field, value }));

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      economic_financial_role: e,
    });
  };

  const yesNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Economic & Financial Role
      </h2>

      {/* Breadwinner */}
      <div>
        <p className="font-medium text-gray-700 mb-2">
          Are you the breadwinner of your household?
        </p>
        {yesNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="breadwinner"
              checked={e.breadwinner === opt.value}
              onChange={() =>
                update(
                  "breadwinner",

                  opt.value
                )
              }
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Income Sources */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600 font-medium">
          Income Source
        </label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={e.income_sources[0] || ""}
          onChange={(event) => update("income_sources", [event.target.value])}
        >
          <option value="">Select Income Source</option>
          <option>Active Income</option>
          <option>Passive Income</option>
          <option>Portfolio (Investment) Income</option>
          <option>Other Potential Sources</option>
          <option>N/A</option>
          <option>Iba pa</option>
        </select>

        {e.income_sources[0] === "Iba pa" && (
          <input
            type="text"
            className="border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Specify other income source"
            value={e.income_sources_other}
            onChange={(event) =>
              update("income_sources_other", event.target.value)
            }
          />
        )}
      </div>

     
      <div>
        <p className="font-medium text-gray-700 mb-2">
          Do you face cultural barriers at work?
        </p>
        {yesNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="cultural_barrier_work"
              checked={e.cultural_barrier_work === opt.value}
              onChange={() =>
                update(
                  "cultural_barrier_work",

                  opt.value
                )
              }
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
        
      </div>

      {/* Manage Financial Resources */}
      <div>
        <p className="font-medium text-gray-700 mb-2">
          Do you manage financial resources in your household?
        </p>
                {yesNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="manage_financial_resources"
              checked={e.manage_financial_resources === opt.value}
              onChange={() =>
                update(
                  "manage_financial_resources",

                  opt.value
                )
              }
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
        
      </div>
      <div>
        <p className="font-medium text-gray-700 mb-2">
          Do you participate in financial decisions?
        </p>
        {yesNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="participate_financial_decisions"
              checked={e.participate_financial_decisions === opt.value}
              onChange={() =>
                update(
                  "participate_financial_decisions",

                  opt.value
                )
              }
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
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
