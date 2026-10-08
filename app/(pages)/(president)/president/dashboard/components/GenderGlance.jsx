"use client";

import Link from "next/link";
import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

function MiniDonut({ title, female, male }) {
  const f = Number(female) || 0;
  const m = Number(male) || 0;
  const total = f + m;
  const data = [
    { name: "Female", value: f },
    { name: "Male", value: m },
  ];
  return (
    <div className="flex-1 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <p className="text-[11px] text-gray-400">{total.toLocaleString()} counted</p>
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} stroke="transparent">
              <Cell fill="#8B5CF6" />
              <Cell fill="#3B82F6" />
            </Pie>
            <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Count"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-gray-600">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />F {f.toLocaleString()}</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />M {m.toLocaleString()}</span>
      </div>
    </div>
  );
}

function GenderGlance({ snapshot, parityGaps }) {
  const s = snapshot || {};
  const gaps = Array.isArray(parityGaps) ? parityGaps : [];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Gender at a Glance
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Summary only — full breakdowns live in Gender Statistics
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <MiniDonut title="Students" female={s.totalStudents !== null && s.totalStudents !== undefined ? Math.round(((s.femaleStudentsPct || 0) / 100) * s.totalStudents) : s.femaleCount} male={s.totalStudents !== null && s.totalStudents !== undefined ? Math.round(((100 - (s.femaleStudentsPct || 0)) / 100) * s.totalStudents) : s.maleCount} />
        <MiniDonut title="Employees" female={s.totalEmployees !== null && s.totalEmployees !== undefined ? Math.round(((s.femaleEmployeesPct || 0) / 100) * s.totalEmployees) : null} male={s.totalEmployees !== null && s.totalEmployees !== undefined ? Math.round(((100 - (s.femaleEmployeesPct || 0)) / 100) * s.totalEmployees) : null} />
      </div>
      <div className="mt-4 rounded-lg bg-amber-50/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
          Parity gaps to watch
        </p>
        {gaps.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">No concentrated gaps detected.</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {gaps.map((g, i) => (
              <li key={i} className="text-xs text-gray-700">
                <span className="font-medium">{g.unit}</span>
                <span className="text-gray-400"> · {g.kind} · </span>
                {g.malePct}% male ({Number(g.total).toLocaleString()})
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-gray-500">
          PWD {Number(s.pwdCount || 0).toLocaleString()} · IP {Number(s.ipCount || 0).toLocaleString()} · LGBTQIA+ {Number(s.lgbtqia || 0).toLocaleString()}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/president/gender-statistics/students" className="text-xs font-medium text-violet-600 hover:underline">
          Open Students →
        </Link>
        <Link href="/president/gender-statistics/employees" className="text-xs font-medium text-violet-600 hover:underline">
          Open Employees →
        </Link>
      </div>
    </div>
  );
}

export default memo(GenderGlance);
