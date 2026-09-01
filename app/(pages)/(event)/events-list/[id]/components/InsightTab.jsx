"use client";

import {
  SexChart,
  StatusChart,
  EventChart,
  AgeChart,
  CollegeChart,
  PerYearChart,
} from "./Charts";
import { FiUsers, FiUserX, FiUserCheck, FiFilter, FiBriefcase, FiLayers, FiActivity } from "react-icons/fi";
import { FaVenusMars, FaUserTag } from "react-icons/fa";

export default function InsightTab({
  insightsFilter,
  setInsightsFilter,
  totalRegistered,
  maleCount,
  femaleCount,
  statusCounts,
  interestedCount,
  notInterestedCount,
  ageGroupCounts,
  goingCount,
  attendedCount,
  showRate,
  genderDataChart,
  affiliationData,
  eventData,
  ageData,
  collegeData,
  perYearData,
}) {
  const statCards = [
    {
      label: "Interested",
      value: interestedCount,
      icon: FaUserTag,
      gradient: "from-blue-600 to-blue-400",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Not Interested",
      value: notInterestedCount,
      icon: FiUserX,
      gradient: "from-red-500 to-rose-400",
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
    },
    {
      label: "Going",
      value: goingCount,
      icon: FiUserCheck,
      gradient: "from-emerald-600 to-emerald-400",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Attended",
      value: attendedCount ?? 0,
      icon: FiUserCheck,
      gradient: "from-teal-500 to-teal-400",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      label: "Show Rate",
      value: showRate == null ? "—" : `${showRate}%`,
      icon: FiActivity,
      gradient: "from-fuchsia-600 to-pink-400",
      iconBg: "bg-fuchsia-100",
      iconColor: "text-fuchsia-600",
    },
    {
      label: "Total Registered",
      value: totalRegistered,
      icon: FiUsers,
      gradient: "from-violet-600 to-purple-400",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Filter ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <div className="relative">
          <FiFilter
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={14}
          />
          <select
            className="input !w-auto !pl-9 !py-2 !rounded-lg"
            value={insightsFilter}
            onChange={(e) => setInsightsFilter(e.target.value)}
          >
            <option value="all">All Participants</option>
            <option value="going">Going</option>
            <option value="attended">Attended</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.gradient}`}
              />
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {card.label}
                  </p>
                  <div className="mt-2 text-3xl font-bold text-gray-900 leading-tight">
                    {card.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Breakdown Panels ─────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
        {/* Statistics */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Sex, status and age group overview
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <FaVenusMars className="text-blue-500" size={12} />
                Sex At Birth
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                  Male: <span className="font-bold">{maleCount}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                  Female: <span className="font-bold">{femaleCount}</span>
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <FiBriefcase className="text-violet-500" size={12} />
                Status
              </p>
              {statusCounts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {statusCounts.map((s) => (
                    <span
                      key={s.name}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-700"
                    >
                      {s.name}: <span className="font-bold">{s.value}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No status data available.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <FiLayers className="text-amber-500" size={12} />
                Age Group
              </p>
              {ageGroupCounts && Object.keys(ageGroupCounts).length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(ageGroupCounts)
                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                    .map(([label, count]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-gray-100 bg-slate-50 p-3 text-center"
                      >
                        <span className="text-xs text-gray-500 block">
                          {label}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No age group data available.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* College */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">College</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Distribution across colleges
            </p>
          </div>
          {Array.isArray(collegeData) && collegeData.length > 0 ? (
            <div className="space-y-2">
              {collegeData.map((c) => {
                const max = Math.max(...collegeData.map((x) => x.value), 1);
                const pct = Math.round((c.value / max) * 100);
                return (
                  <div key={c.name} className="group">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-sm text-gray-600 truncate">
                        {c.name}
                      </span>
                      <span className="text-sm font-bold text-gray-900 ml-4 shrink-0">
                        {c.value}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No college data available.</p>
          )}
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SexChart data={genderDataChart} />
        <StatusChart data={affiliationData} />
        <EventChart data={eventData} />
      </div>
      <div className="grid grid-cols-1 gap-5">
        <AgeChart data={ageData} />
      </div>
      <div className="grid grid-cols-1 gap-5">
        <CollegeChart data={collegeData} />
      </div>
      <div className="grid grid-cols-1 gap-5">
        <PerYearChart data={perYearData} />
      </div>
    </div>
  );
}