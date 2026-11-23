"use client";

import { useRouter } from "next/navigation";
import {
  CardShell,
  MiniBar,
  SnapshotSkeleton,
  SourceTag,
} from "./DashboardUi";
import { Users } from "lucide-react";

/* Student and employee gender statistics (sample or live). */
export default function GenderStatsCard({ dashboard }) {
  const router = useRouter();
  const {
    useSample,
    showGenderLoading,
    showGenderError,
    selectedYearLabel,
    activeGenderStats,
  } = dashboard;

  return (
    <CardShell
      icon={Users}
      iconClass="bg-pink-50 text-pink-600"
      title={
        <>
          Gender Statistics
          <SourceTag sample={useSample} />
        </>
      }
      subtitle="Share of female records on file"
    >
      {showGenderLoading ? (
        <SnapshotSkeleton rows={2} />
      ) : showGenderError ? (
        <p className="text-xs text-gray-500 italic">{showGenderError}</p>
      ) : (
        <>
          <div className="space-y-4">
            {[
              {
                key: "students",
                label: "Students",
                scope: selectedYearLabel,
                totals: activeGenderStats?.students?.totals,
              },
              {
                key: "employees",
                label: "Employees",
                scope: "all years",
                totals: activeGenderStats?.employees?.totals,
              },
            ].map((row) => (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-600">
                    {row.label}
                    <span className="text-gray-500"> · {row.scope}</span>
                  </span>
                  <span className="font-semibold text-gray-900">
                    {row.totals
                      ? `${row.totals.pctFemale}% female`
                      : "No data"}
                  </span>
                </div>
                <MiniBar
                  percent={row.totals?.pctFemale || 0}
                  barClass="bg-pink-500"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    {row.totals
                      ? `${row.totals.Female.toLocaleString()} female · ${row.totals.Male.toLocaleString()} male`
                      : `No records on file for ${row.scope}`}
                  </span>
                  <span>
                    {row.totals
                      ? `${row.totals.total.toLocaleString()} total`
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push("/gender-statistics/students")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-secondary-50 hover:border-secondary-200 hover:text-secondary-600"
            >
              Students
            </button>
            <button
              onClick={() => router.push("/gender-statistics/employees")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-secondary-50 hover:border-secondary-200 hover:text-secondary-600"
            >
              Employees
            </button>
          </div>
        </>
      )}
    </CardShell>
  );
}
