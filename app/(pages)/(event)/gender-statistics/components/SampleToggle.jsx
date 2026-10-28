"use client";

/**
 * The amber "Sample data / Live data" switch and notice shown on the role
 * dashboards, styled after the toggle on the gender-statistics pages.
 *
 * Sample mode is the default view on those dashboards: the panel data comes
 * from the synthetic dataset (sampleDashboardData.js) instead of the live API,
 * and the notice says so in plain words.
 */

import { SAMPLE_DASHBOARD_POPULATION } from "./sampleDashboardData";
import { SAMPLE_SCHOOL_YEARS } from "./sampleProfileRecords";

export function SampleToggle({ useSample, onToggle, className = "" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={useSample}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        useSample
          ? "border-secondary-300 bg-secondary-50 text-secondary-700"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      } ${className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          useSample ? "bg-secondary-500" : "bg-emerald-500"
        }`}
      />
      {useSample ? "Sample data" : "Live data"}
    </button>
  );
}

export function SampleDataNotice() {
  return (
    <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3 text-xs text-secondary-800">
      Showing synthetic <strong>sample data</strong> for{" "}
      {SAMPLE_DASHBOARD_POPULATION.students.toLocaleString()} students and{" "}
      {SAMPLE_DASHBOARD_POPULATION.employees.toLocaleString()} employees with a
      five-year history ({SAMPLE_SCHOOL_YEARS[0]} to{" "}
      {SAMPLE_SCHOOL_YEARS[SAMPLE_SCHOOL_YEARS.length - 1]}). Your database is
      not being read and nothing is saved - turn the toggle off to return to
      live data.
    </div>
  );
}
