"use client";

import { FaBullseye } from "react-icons/fa";
import { getTargetProgress } from "@/lib/accomplishmentSummary";

export default function ParticipantTargetProgress({
  actual,
  target,
  label = "Target vs Actual",
  emptyMessage = "No participant targets set for this project's events.",
  className = "",
}) {
  const progress = getTargetProgress(actual, target);

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
        <FaBullseye className="h-3 w-3" />
        {label}
      </p>

      {progress.target === 0 ? (
        <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-900">
              {progress.actual}
            </span>
            <span className="text-gray-500">of {progress.target} target</span>
            <span
              className={`font-bold ${
                progress.isOver ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {progress.percent}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progress.isOver ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${progress.cappedPercent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
