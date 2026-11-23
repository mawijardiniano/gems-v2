"use client";

import { FaBullseye } from "react-icons/fa";
import { getTargetProgress } from "@/data/lib/accomplishmentSummary";

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
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5 mb-2">
        <FaBullseye className="h-3 w-3" />
        {label}
      </p>

      {progress.target === 0 ? (
        <p className="text-xs text-fg-muted italic">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-fg">
              {progress.actual}
            </span>
            <span className="text-fg-muted">of {progress.target} target</span>
            <span
              className={`font-bold ${
                progress.isOver ? "text-danger" : "text-success"
              }`}
            >
              {progress.percent}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
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
