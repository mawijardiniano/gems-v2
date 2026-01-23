"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setReproductiveFamilyRole,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function ReproductiveFamilyRole() {
  const dispatch = useDispatch();
  const r = useSelector((state) => state.profile.reproductive_family_role);

  const update = (field, value) =>
    dispatch(setReproductiveFamilyRole({ field, value }));
  const currentStep = useSelector((state) => state.profile.currentStep);

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      reproductive_family_role: r,
    });
  };

  const options = ["Yes", "No", "N/A"];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      {/* Progress Bar */}
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Reproductive & Family Role
      </h2>

      <div>
        <p className="font-medium text-gray-700 mb-2">Childbearing Stage</p>
        <div className="flex gap-6">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                checked={r.childbearing_stage === opt}
                onChange={() => update("childbearing_stage", opt)}
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium text-gray-700 mb-2">Child Rearing Stage</p>
        <div className="flex gap-6">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                checked={r.child_rearing_stage === opt}
                onChange={() => update("child_rearing_stage", opt)}
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium text-gray-700 mb-2">Family Planning</p>
        <div className="flex gap-6">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                checked={r.family_planning === opt}
                onChange={() => update("family_planning", opt)}
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Spouse Share Childcare */}
      <div>
        <p className="font-medium text-gray-700 mb-2">
          Does your spouse share childcare responsibilities?
        </p>
        <div className="flex gap-6">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                checked={r.spouse_share_childcare === opt}
                onChange={() => update("spouse_share_childcare", opt)}
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Attend School Needs */}
      <div>
        <p className="font-medium text-gray-700 mb-2">
          Attend to children's school needs?
        </p>
        <div className="flex gap-6">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                checked={r.attend_school_needs === opt}
                onChange={() => update("attend_school_needs", opt)}
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Childcare Responsibility (Text Input) */}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600 font-medium mb-2">
          Childcare Responsibility
        </label>
        <input
          type="text"
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={r.childcare_responsibility}
          onChange={(e) => update("childcare_responsibility", e.target.value)}
          placeholder="Describe your childcare responsibilities"
        />
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
