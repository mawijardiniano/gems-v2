"use client";

import {
  SexChart,
  StatusChart,
  AgeChart,
  CollegeChart,
  PerYearChart,
} from "./Charts";
import {
  FiUsers,
  FiBriefcase,
  FiUserCheck,
  FiCalendar,
  FiActivity,
} from "react-icons/fi";
import { FaVenus, FaMars, FaUserTag } from "react-icons/fa";

const percent = (part, total) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/* Single source of truth: every number comes from attended_users
   (profiles) + approved guest check-ins, computed in content.jsx.
   No client-side filter - the old All/Attended dropdown was a no-op
   after registered attendance was collapsed into attended. */
export default function InsightTab({
  attendedCount,
  maleCount,
  femaleCount,
  avgAge,
  roleCounts,
  statusCounts,
  genderDataChart,
  affiliationData,
  ageData,
  collegeData,
  perYearData,
}) {
  const roles = roleCounts || {
    Student: 0,
    Employee: 0,
    Stakeholder: 0,
    Unspecified: 0,
  };

  /* Row 1 - GAD headline: total attendance + sex split + average age. */
  const headlineCards = [
    {
      label: "Attended",
      value: attendedCount ?? 0,
      icon: FiUserCheck,
      gradient: "from-teal-500 to-teal-400",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      label: "Male",
      value: maleCount ?? 0,
      icon: FaMars,
      gradient: "from-blue-600 to-blue-400",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      sub:
        attendedCount > 0
          ? `${percent(maleCount ?? 0, attendedCount)}% of attended`
          : null,
    },
    {
      label: "Female",
      value: femaleCount ?? 0,
      icon: FaVenus,
      gradient: "from-pink-500 to-pink-400",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
      sub:
        attendedCount > 0
          ? `${percent(femaleCount ?? 0, attendedCount)}% of attended`
          : null,
    },
    {
      label: "Average Age",
      value: avgAge == null ? "-" : avgAge,
      icon: FiCalendar,
      gradient: "from-amber-500 to-amber-400",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      sub: avgAge == null ? "No age data" : "Years old",
    },
  ];

  /* Row 2 - sector mix. Unspecified is hidden while it is zero. */
  const sectorCards = [
    {
      label: "Student",
      value: roles.Student ?? 0,
      icon: FiUsers,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Employee",
      value: roles.Employee ?? 0,
      icon: FiBriefcase,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Stakeholder",
      value: roles.Stakeholder ?? 0,
      icon: FaUserTag,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Unspecified",
      value: roles.Unspecified ?? 0,
      icon: FiActivity,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-500",
      hideIfZero: true,
    },
  ].filter((card) => !card.hideIfZero || card.value > 0);

  return (
    <div className="space-y-6">
      {/* Headline stats: Attended / Male / Female / Avg Age */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {headlineCards.map((card) => {
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
                  <p className="mt-1 text-3xl font-bold text-gray-900 leading-tight">
                    {card.value}
                  </p>
                  {card.sub && (
                    <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sector mix */}
      {sectorCards.length > 0 && (
        <div
          className={`grid grid-cols-2 gap-5 ${
            sectorCards.length >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {sectorCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}
                >
                  <Icon className="text-base" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">
                    {card.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">
                    {card.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts - one per dimension, no duplicates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SexChart data={genderDataChart} />
        <StatusChart data={affiliationData} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AgeChart data={ageData} />
        <CollegeChart data={collegeData} />
      </div>
      <div className="grid grid-cols-1 gap-5">
        <PerYearChart data={perYearData} />
      </div>
    </div>
  );
}