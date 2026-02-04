"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setEnvironmentalClimate,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function Environmental() {
  const dispatch = useDispatch();
  const env = useSelector((state) => state.profile.environmental_climate);

  const update = (field, value) => {
    dispatch(setEnvironmentalClimate({ field, value }));
  };

  const yesNoOptions = ["Yes", "No", "N/A"];
  const YesorNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

  const currentStep = useSelector((state) => state.profile.currentStep);

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      environmental_climate: env,
    });
  };

  const fields = [
    "environmental_protection",
    "disaster_reduction",
    "disaster_knowledge_personal",
    "disaster_knowledge_family",
    "disaster_knowledge_officemates",
    "fire_drill",
    "earthquake_drill",
    "emergency_equipment_home",
    "emergency_equipment_office",
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Environmental & Climate
      </h2>

      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600 capitalize">
              {field.replace(/_/g, " ")}
            </span>
            <div className="flex gap-4 mt-1">
              {yesNoOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field}
                    value={opt}
                    checked={env[field] === opt}
                    onChange={() => update(field, opt)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">
            Trained Marshals
          </span>

          <div className="flex gap-4 mt-1">
            {YesorNoOptions.map((opt) => (
              <label key={opt.label} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="trained_marshals"
                  checked={env.trained_marshals === opt.value}
                  onChange={() => update("trained_marshals", opt.value)}
                  className="w-4 h-4 accent-blue-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
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
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
