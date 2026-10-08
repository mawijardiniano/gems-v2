"use client";

import { memo } from "react";
import Link from "next/link";
import { FaDownload, FaEye, FaSyncAlt } from "react-icons/fa";
import usePresidentOverview from "@/hooks/usePresidentOverview";
import useMyProfile from "@/lib/useMyProfile";
import { AnalyticsDashboardSkeleton } from "@/components/Skeleton";
import {
  SampleDataNotice,
  SampleToggle,
} from "../../../(event)/gender-statistics/components/SampleToggle";
import ExecutiveSnapshot from "./components/ExecutiveSnapshot";
import ComplianceTracker from "./components/ComplianceTracker";
import GenderGlance from "./components/GenderGlance";
import CollegeRanking from "./components/CollegeRanking";
import EnrollmentTrend from "./components/EnrollmentTrend";

function HeaderBar({ useSample, onToggleSample, filters, filtersLoading, onRefresh, refreshing, updatedAt, profileName, year }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-600">
            SUC President · Executive Overview
          </p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">
            Welcome back{profileName ? `, ${profileName}` : ""}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Marinduque State University · University-wide scope
            {updatedAt ? ` · Updated ${updatedAt.toLocaleTimeString()}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            <SampleToggle useSample={useSample} onToggle={onToggleSample} className="!px-2.5 !py-1.5 !text-xs" />
            <span>Decide in 30 seconds — details live in the linked pages.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-medium text-gray-500">
            AY
            <select
              value={filters.schoolYear}
              onChange={(e) => filters.setSchoolYear(e.target.value)}
              disabled={filtersLoading || filters.schoolYearOptions.length === 0}
              className="ml-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700"
            >
              {filters.schoolYearOptions.length === 0 && <option value="">—</option>}
              {filters.schoolYearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-medium text-gray-500">
            Sem
            <select
              value={filters.semester}
              onChange={(e) => filters.setSemester(e.target.value)}
              disabled={filtersLoading}
              className="ml-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700"
            >
              <option value="">All</option>
              {filters.semesterOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh overview"
          >
            <FaSyncAlt size={11} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/president/reports"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            <FaEye size={11} />
            View GAR
          </Link>
          <Link
            href="/president/reports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
            title={year ? `Executive brief for ${year}` : "Executive brief"}
          >
            <FaDownload size={11} />
            Brief
          </Link>
        </div>
      </div>
    </div>
  );
}

function PresidentDashboardContent() {
  const { profile } = useMyProfile();
  const { useSample, setUseSample, filters, filtersLoading, filtersReady, loading, extraError, overview, refresh, updatedAt } =
    usePresidentOverview();
  const profileName = profile?.personal
    ? [profile.personal.first_name, profile.personal.last_name].filter(Boolean).join(" ")
    : "";
  return (
    <div className="py-8 flex flex-col gap-4">
      <HeaderBar
        useSample={useSample}
        onToggleSample={() => setUseSample((prev) => !prev)}
        filters={filters}
        filtersLoading={filtersLoading}
        onRefresh={refresh}
        refreshing={loading}
        updatedAt={updatedAt}
        profileName={profileName}
        year={overview?.year}
      />
      {useSample && <SampleDataNotice />}
      {extraError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {extraError} Showing whatever sections loaded successfully.
        </div>
      )}
      {!filtersReady || loading || !overview ? (
        <AnalyticsDashboardSkeleton />
      ) : (
        <>
          <ExecutiveSnapshot snapshot={overview.snapshot} useSample={useSample} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ComplianceTracker compliance={overview.compliance} useSample={useSample} />
            <GenderGlance snapshot={overview.snapshot} parityGaps={overview.parityGaps} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CollegeRanking ranking={overview.collegeRanking} />
            <EnrollmentTrend trend={overview.trend} />
          </div>
        </>
      )}
    </div>
  );
}

export default memo(PresidentDashboardContent);

