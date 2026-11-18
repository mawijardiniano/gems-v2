"use client";

import {
  ACTIVITY_TYPE,
  emptyIndicator,
  formatPerformanceIndicator,
} from "../lib/projectForm";

export default function PerformanceIndicatorInput({ value, onChange }) {
  const isRawText = value?._raw !== undefined;
  const v = isRawText
    ? { _raw: value._raw || "" }
    : { ...emptyIndicator(), ...(value || {}) };

  // ── FREE TEXT MODE ─────────────────────────────────────
  if (isRawText) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Format toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Format:</span>
          <button
            type="button"
            onClick={() => onChange(emptyIndicator())}
            className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100"
          >
            ○ Structured
          </button>
          <button
            type="button"
            className="px-2 py-0.5 rounded-full bg-secondary-600 text-white"
          >
            ● Free Text
          </button>
        </div>
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400"
          placeholder="Type any performance indicator... (e.g. At least 50% increase in male scholarship applicants)"
          value={value._raw || ""}
          onChange={(e) => onChange({ _raw: e.target.value })}
        />
      </div>
    );
  }

  const preview = formatPerformanceIndicator(v);

  const hasActivityType = !!v.activityType;
  const hasActivityCount =
    v.totalActivities !== "" && Number(v.totalActivities) > 0;

  const activityTypeMissing = hasActivityCount && !hasActivityType;
  const activityCountMissing = hasActivityType && !hasActivityCount;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Format toggle */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">Format:</span>
        <button
          type="button"
          className="px-2 py-0.5 rounded-full bg-secondary-600 text-white"
        >
          ● Structured
        </button>
        <button
          type="button"
          onClick={() => onChange({ _raw: preview || "" })}
          className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100"
        >
          ○ Free Text
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">
            Type of Activity{" "}
            {hasActivityCount && <span className="text-red-500">*</span>}
          </label>
          <select
            className={`border rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 ${
              activityTypeMissing
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-secondary-400"
            }`}
            value={v.activityType}
            onChange={(e) => onChange({ ...v, activityType: e.target.value })}
          >
            <option value="">Select</option>
            {ACTIVITY_TYPE.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">
            No. of Activity{" "}
            {hasActivityType && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            min={0}
            className={`border rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 ${
              activityCountMissing
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-secondary-400"
            }`}
            value={v.totalActivities}
            onChange={(e) =>
              onChange({ ...v, totalActivities: e.target.value })
            }
            placeholder="0"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">Male</label>
          <input
            type="number"
            min={0}
            className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400"
            value={v.totalMale}
            onChange={(e) => onChange({ ...v, totalMale: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">Female</label>
          <input
            type="number"
            min={0}
            className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400"
            value={v.totalFemale}
            onChange={(e) => onChange({ ...v, totalFemale: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      {activityTypeMissing && (
        <div className="text-xs text-red-500 px-1">
          Type of Activity is required when No. of Activity is filled in.
        </div>
      )}
      {activityCountMissing && (
        <div className="text-xs text-red-500 px-1">
          No. of Activity is required when a Type of Activity is selected.
        </div>
      )}

      {preview && (
        <div className="text-xs text-secondary-600 bg-secondary-50 rounded-lg px-2 py-1.5 italic">
          {preview}
        </div>
      )}
    </div>
  );
}
