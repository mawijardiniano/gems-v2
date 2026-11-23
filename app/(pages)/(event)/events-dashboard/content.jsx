"use client";

import { useRouter } from "next/navigation";
import { SampleDataNotice, SampleToggle } from "../gender-statistics/components/SampleToggle";
import { Activity, AlertCircle, CalendarDays } from "lucide-react";
import { useEventsDashboard } from "./hooks/useEventsDashboard";
import HeadlineCards from "./components/HeadlineCards";
import ReadinessCard from "./components/ReadinessCard";
import GadProjectsCard from "./components/GadProjectsCard";
import GenderStatsCard from "./components/GenderStatsCard";
import GaaBudgetChart from "./components/GaaBudgetChart";
import GpbOverviewCard from "./components/GpbOverviewCard";
import UpcomingEventsCard from "./components/UpcomingEventsCard";
import GaaBudgetTable from "./components/GaaBudgetTable";

/* The events dashboard. Data and derived figures come from
   useEventsDashboard; each card is its own component. */
export default function EventsDashboardContent() {
  const router = useRouter();
  const dashboard = useEventsDashboard();
  const {
    useSample,
    setUseSample,
    selectedYear,
    setSelectedYear,
    yearOptions,
    eventsError,
    gpbError,
  } = dashboard;

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            GAD impact, participation gaps, and project delivery
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SampleToggle useSample={useSample} onToggle={() => setUseSample((s) => !s)} />
          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-year"
              className="text-xs font-medium text-gray-500"
            >
              Academic Year
            </label>
            <select
              id="dashboard-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>
                  {`AY ${year}-${year + 1}`}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => router.push("/events-list")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition duration-200 shadow-sm"
          >
            <CalendarDays className="h-4 w-4" />
            View Events
          </button>
          <button
            onClick={() => router.push("/create")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-xl hover:bg-secondary-700 transition duration-200 shadow-sm shadow-secondary-200"
          >
            <Activity className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {eventsError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger-border bg-danger-subtle text-danger text-sm animate-slide-up">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{eventsError}</span>
        </div>
      )}
      {gpbError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-secondary-200 bg-secondary-50 text-secondary-700 text-sm animate-slide-up">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{gpbError}</span>
        </div>
      )}

      <HeadlineCards dashboard={dashboard} />


      {useSample && <SampleDataNotice />}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReadinessCard dashboard={dashboard} />

        <GadProjectsCard dashboard={dashboard} />

        <GenderStatsCard dashboard={dashboard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
        <GaaBudgetChart dashboard={dashboard} />

        <GpbOverviewCard dashboard={dashboard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <UpcomingEventsCard dashboard={dashboard} />

        <GaaBudgetTable dashboard={dashboard} />
      </div>
    </div>
  );
}
