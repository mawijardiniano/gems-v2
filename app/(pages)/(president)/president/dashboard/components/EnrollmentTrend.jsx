"use client";

import Link from "next/link";
import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function EnrollmentTrend({ trend }) {
  const data = Array.isArray(trend) ? trend : [];
  const last = data[data.length - 1];
  const first = data[0];
  const growth =
    first && last && first.students > 0
      ? Math.round(((last.students - first.students) / first.students) * 1000) / 10
      : null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          5-Year Population Trend
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Students + employees per school year
          {growth !== null ? ` · ${growth >= 0 ? "+" : ""}${growth}% students since ${first.year}` : ""}
        </p>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No trend data.</p>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString(), ""]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="students" name="Students" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="employees" name="Employees" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <Link href="/president/gender-statistics/students" className="mt-3 inline-block text-xs font-medium text-violet-600 hover:underline">
        Open enrollment detail →
      </Link>
    </div>
  );
}

export default memo(EnrollmentTrend);
