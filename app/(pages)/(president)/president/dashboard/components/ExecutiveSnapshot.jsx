"use client";

import Link from "next/link";
import { memo } from "react";
import {
  FaUsers,
  FaUserGraduate,
  FaUserTie,
  FaVenusMars,
} from "react-icons/fa";

const fmt = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "—"
    : Number(n).toLocaleString();

function Card({ icon: Icon, label, value, sub, bar, href, linkLabel, tint }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tint}`} />
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600 transition-transform duration-300 group-hover:scale-110">
          <Icon className="text-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
          {bar}
          {href && (
            <Link
              href={href}
              className="mt-2 inline-block text-xs font-medium text-violet-600 hover:underline"
            >
              {linkLabel || "View details →"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniBar({ pct, from = "bg-violet-500", to = "bg-blue-500" }) {
  if (pct === null || pct === undefined) return null;
  return (
    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`${from} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
      <div className={`${to} opacity-30 flex-1`} />
    </div>
  );
}

function ExecutiveSnapshot({ snapshot, useSample }) {
  const s = snapshot || {};
  const total = Number(s.total) || 0;
  /* Female share = student parity (the headline gender metric), NOT the
     blended students+employees mix. Matches the Students card + donuts. */
  const femalePct =
    s.femaleStudentsPct !== null && s.femaleStudentsPct !== undefined
      ? Number(s.femaleStudentsPct)
      : total > 0
        ? Math.round(((Number(s.femaleCount) || 0) / total) * 100)
        : null;
  const femaleSub =
    s.totalStudents !== null && s.totalStudents !== undefined
      ? `${fmt(Math.round(((s.femaleStudentsPct || 0) / 100) * s.totalStudents))} F students of ${fmt(s.totalStudents)}${s.lgbtqia ? ` · ${fmt(s.lgbtqia)} LGBTQIA+` : ""}`
      : `${fmt(s.femaleCount)} F · ${fmt(s.maleCount)} M${s.lgbtqia ? ` · ${fmt(s.lgbtqia)} LGBTQIA+` : ""}`;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Executive Snapshot
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {useSample
            ? "Sample headcount and parity — project & budget cards are live-only and hidden"
            : "University-wide headcount, parity and GAD delivery at a glance"}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          icon={FaUserGraduate}
          label="Students"
          value={fmt(s.totalStudents ?? total)}
          sub={s.femaleStudentsPct !== null && s.femaleStudentsPct !== undefined ? `${s.femaleStudentsPct}% female students` : "Enrolled population"}
          bar={s.femaleStudentsPct !== null && s.femaleStudentsPct !== undefined ? <MiniBar pct={s.femaleStudentsPct} /> : null}
          href="/president/gender-statistics/students"
          tint="from-blue-600 to-blue-400"
        />
        <Card
          icon={FaUserTie}
          label="Employees"
          value={fmt(s.totalEmployees ?? "—")}
          sub={s.femaleEmployeesPct !== null && s.femaleEmployeesPct !== undefined ? `${s.femaleEmployeesPct}% female employees` : "Workforce headcount"}
          bar={s.femaleEmployeesPct !== null && s.femaleEmployeesPct !== undefined ? <MiniBar pct={s.femaleEmployeesPct} from="bg-pink-500" to="bg-blue-500" /> : null}
          href="/president/gender-statistics/employees"
          tint="from-cyan-600 to-cyan-400"
        />
        <Card
          icon={FaVenusMars}
          label="Female share"
          value={femalePct !== null ? `${femalePct}%` : "—"}
          sub={femaleSub}
          bar={femalePct !== null ? <MiniBar pct={femalePct} from="bg-purple-500" to="bg-blue-500" /> : null}
          href="/president/gender-statistics/students"
          linkLabel="Open gender statistics →"
          tint="from-purple-600 to-pink-400"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span>
          <FaUsers className="mr-1 inline text-gray-400" />
          Total population {fmt(total)}
        </span>
        <span>PWD {fmt(s.pwdCount)}</span>
        <span>IP {fmt(s.ipCount)}</span>
      </div>
    </div>
  );
}

export default memo(ExecutiveSnapshot);
