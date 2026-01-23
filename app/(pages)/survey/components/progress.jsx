"use client";

import { useSelector } from "react-redux";

const TOTAL_STEPS = 9;

export default function Progress() {
  const currentStep = useSelector((state) => state.profile.currentStep);

  const percentage =
    ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="w-full mb-6">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-right text-xs text-gray-500 mt-1">
        {Math.round(percentage)}%
      </p>
    </div>
  );
}
