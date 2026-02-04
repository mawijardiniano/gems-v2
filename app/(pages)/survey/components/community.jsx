"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setCommunityInvolvement,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function CommunityInvolvement() {
  const dispatch = useDispatch();
  const c = useSelector((state) => state.profile.community_involvement);
  const p = useSelector((state) => state.profile.personal_information);

  const update = (field, value) =>
    dispatch(setCommunityInvolvement({ field, value }));

  const currentStep = useSelector((state) => state.profile.currentStep);

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      community_involvement: c,
    });
  };

  const YesorNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

  const yesNoOptions = ["Yes", "No", "N/A"];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Community Involvement
      </h2>

      <div className="flex flex-col gap-2">
        <span> Are you actively involved in your community?</span>
        {YesorNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="community_involvement"
              value={opt}
              checked={c.community_involvement === opt.value}
              onChange={() => update("community_involvement", opt.value)}
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span> Do you exercise your right to vote?</span>
        {YesorNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="exercise_right_to_vote"
              value={opt}
              checked={c.exercise_right_to_vote === opt.value}
              onChange={() => update("exercise_right_to_vote", opt.value)}
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
      </div>
      {p.civil_status !== "Single" && (
        <div>
          <p className="font-medium text-gray-700 mb-2">
            Is your spouse of a different religion?
          </p>
          <div className="flex gap-6">
            {yesNoOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={c.spouse_different_religion === opt}
                  onChange={() => update("spouse_different_religion", opt)}
                  className="w-4 h-4 accent-blue-500"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

      {p.civil_status !== "Single" && (
        <div>
          <p className="font-medium text-gray-700 mb-2">
            Is there a cultural difference with your spouse?
          </p>
          <div className="flex gap-6">
            {yesNoOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={c.spouse_cultural_difference === opt}
                  onChange={() => update("spouse_cultural_difference", opt)}
                  className="w-4 h-4 accent-blue-500"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

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
