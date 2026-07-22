"use client";

import {
  FaUsers,
  FaVenusMars,
  FaWheelchair,
  FaLeaf,
} from "react-icons/fa";

const statCards = [
  {
    key: "total",
    label: "Total Population",
    icon: FaUsers,
    gradient: "from-blue-600 to-blue-400",
    lightBg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    key: "gender",
    label: "Gender Breakdown",
    icon: FaVenusMars,
    gradient: "from-purple-600 to-pink-400",
    lightBg: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    key: "pwd",
    label: "PWD",
    icon: FaWheelchair,
    gradient: "from-emerald-600 to-emerald-400",
    lightBg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    key: "ip",
    label: "Indigenous Peoples",
    icon: FaLeaf,
    gradient: "from-teal-600 to-teal-400",
    lightBg: "bg-teal-50",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
];

function StatCard({ card, children }) {
  const Icon = card.icon;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
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
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Snapshot({ data }) {
  const total = data.length;
  const femaleCount = data.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Female",
  ).length;
  const maleCount = data.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Male",
  ).length;
  const pwdCount =
    data.filter((d) => d.personal_info_id?.gadData?.isPWD === true).length || 0;
  const ipCount =
    data.filter((d) => d.personal_info_id?.gadData?.isIndigenousPerson === true)
      .length || 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Executive Snapshot
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Overview of key indicators and demographic gaps
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard card={statCards[0]}>{total.toLocaleString()}</StatCard>

        <StatCard card={statCards[1]}>
          <div className="flex items-baseline gap-2">
            <span className="text-purple-600">{femaleCount}</span>
            <span className="text-sm font-normal text-gray-400">·</span>
            <span className="text-blue-600">{maleCount}</span>
            <span className="text-xs font-normal text-gray-400">(F · M)</span>
          </div>
          {/* Mini bar */}
          {total > 0 && (
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="bg-purple-500 transition-all duration-500"
                style={{ width: `${(femaleCount / total) * 100}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${(maleCount / total) * 100}%` }}
              />
            </div>
          )}
        </StatCard>

        <StatCard card={statCards[2]}>
          {pwdCount}
          {pwdCount === 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              No declaration
            </span>
          )}
        </StatCard>

        <StatCard card={statCards[3]}>
          {ipCount}
          {ipCount === 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              No declaration
            </span>
          )}
        </StatCard>
      </div>
    </div>
  );
}