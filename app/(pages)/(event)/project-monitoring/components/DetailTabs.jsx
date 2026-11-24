"use client";

/*
 * Pill / segmented tab bar used inside a project's expanded details — shared by the
 * GAD monitoring page and the office-managed ProjectWorkspace (Research &
 * Extension / Academic).
 *
 * High-contrast design: light gray container + white inactive pills + solid
 * rose active pill, with icons and count badges. The row scrolls sideways
 * instead of wrapping on narrow screens.
 */

import {
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaFileAlt,
  FaFlag,
  FaLink,
} from "react-icons/fa";

/* Fallback icons per tab key so callers don't have to pass icons. */
const TAB_ICONS = {
  details: FaFileAlt,
  approval: FaCheckCircle,
  milestones: FaFlag,
  events: FaCalendarAlt,
  accomplishment: FaChartBar,
  linkedEvents: FaLink,
};

export default function DetailTabs({ tabs = [], active, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      aria-label="Project sections"
      className={`flex gap-1.5 overflow-x-auto rounded-2xl border border-line bg-muted/80 p-1.5 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon || TAB_ICONS[tab.key] || null;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`whitespace-nowrap inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-1 ${
              isActive
                ? "border-secondary-600 bg-secondary-600 text-white shadow-md shadow-secondary-200"
                : "border-line bg-white text-fg-4 shadow-sm hover:border-secondary-300 hover:bg-secondary-50/60 hover:text-secondary-700"
            }`}
          >
            {Icon && (
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive ? "text-white" : "text-fg-muted"
                }`}
              />
            )}
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold leading-none ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-muted text-fg-4"
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
