"use client";

/*
 * Underline tab bar used inside a project's expanded details — shared by the
 * GAD monitoring page and the office-managed ProjectWorkspace (Research &
 * Extension / Academic).
 *
 * Styling mirrors the event page tabs (Overview / Guests / Insights / Report)
 * but in this module's rose accent, and the row scrolls sideways instead of
 * wrapping on narrow screens.
 */

export default function DetailTabs({ tabs = [], active, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`flex gap-2 border-b border-gray-200 overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
              isActive
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isActive
                    ? "bg-rose-100 text-rose-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
