"use client";

import { useSelector } from "react-redux";
import { FaCheck, FaUser, FaGraduationCap, FaChartBar, FaMapMarkerAlt, FaClipboardCheck } from "react-icons/fa";

const STEPS = [
  { label: "Consent", icon: FaClipboardCheck },
  { label: "Personal", icon: FaUser },
  { label: "Affiliation", icon: FaGraduationCap },
  { label: "GAD Data", icon: FaChartBar },
  { label: "Contact", icon: FaMapMarkerAlt },
  { label: "Review", icon: FaCheck },
];

export default function Progress() {
  const currentStep = useSelector((state) => state.profile.currentStep);
  const currentStatus = useSelector((state) => state.profile.personal.currentStatus);

  // Step 2 is Academic (student) or Employment (employee) — map it to the same visual index
  const effectiveStep = currentStep >= 2 && currentStatus ? currentStep : currentStep;
  // If on step 2 and has a status, it counts as step 2 (Affiliation)
  const visualIndex = currentStep;

  return (
    <div className="w-full mb-8">
      {/* Desktop horizontal stepper */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === visualIndex;
          const isCompleted = idx < visualIndex;
          const isClickable = idx === visualIndex;

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                      : isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200 ring-4 ring-blue-100"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <FaCheck className="text-xs" />
                  ) : (
                    <StepIcon className="text-sm" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-medium transition-colors duration-300 whitespace-nowrap ${
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 rounded transition-all duration-500 ${
                    idx < visualIndex ? "bg-emerald-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile progress indicator */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(visualIndex / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
            {visualIndex + 1}/{STEPS.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 font-medium text-center">
          {STEPS[visualIndex]?.label || "Step"}
        </p>
      </div>
    </div>
  );
}