"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export function useGenderStats(type, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ type, ...(params || {}) });
      const res = await axios.get(
        `/api/analytics/gender-statistics?${query.toString()}`,
      );
      setData(res.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load gender statistics. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [type, JSON.stringify(params || {})]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

export const CARD_CLS = "rounded-xl border border-gray-100 bg-white p-5 shadow-sm";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  fontSize: 12,
  padding: "8px 12px",
};

export const SEX_COLORS = { Female: "#ec4899", Male: "#3b82f6", Other: "#9ca3af" };

export function LoadingState({ label = "Loading statistics…" }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-10 flex items-center justify-center gap-3 text-gray-400 text-sm">
      <span className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-900 mb-4">{children}</h3>
  );
}

export function SummaryCards({ totals, what, deltas }) {
  const cards = [
    {
      label: `Total ${what}`,
      value: totals.total,
      pct: "100%",
      accent: "from-indigo-600 to-indigo-400",
      icon: "👥",
      iconBg: "bg-indigo-100",
      sex: null,
    },
    {
      label: `Female ${what}`,
      value: totals.Female,
      pct: `${totals.pctFemale ?? 0}%`,
      accent: "from-pink-600 to-pink-400",
      icon: "♀",
      iconBg: "bg-pink-100",
      sex: "Female",
    },
    {
      label: `Male ${what}`,
      value: totals.Male,
      pct: `${totals.pctMale ?? 0}%`,
      accent: "from-blue-600 to-blue-400",
      icon: "♂",
      iconBg: "bg-blue-100",
      sex: "Male",
    },
    {
      label: "Non-binary / Other",
      value: totals.Other,
      pct: `${totals.pctOther ?? 0}%`,
      accent: "from-purple-600 to-purple-400",
      icon: "⚧",
      iconBg: "bg-purple-100",
      sex: "Other",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.accent}`} />
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl ${c.iconBg}`}>
              {c.icon}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {c.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 leading-tight">
                {(c.value ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {c.pct} of total
                {c.sex && deltas?.[c.sex] != null && (
                  <span
                    className={`ml-1 font-medium ${
                      deltas[c.sex] < 0 ? "text-red-500" : "text-emerald-600"
                    }`}
                  >
                    · {deltas[c.sex] > 0 ? "+" : ""}
                    {deltas[c.sex]}% vs prev AY
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SexDonut({ totals }) {
  const data = [
    { name: "Female", value: totals.Female },
    { name: "Male", value: totals.Male },
    { name: "Other", value: totals.Other },
  ].filter((d) => d.value > 0);

  return (
    <div className={CARD_CLS}>
      <SectionTitle>Sex Distribution</SectionTitle>
      {data.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={SEX_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-900">
              {totals.total.toLocaleString()}
            </span>
            <span className="text-[11px] text-gray-400">Total</span>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {data.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SEX_COLORS[d.name] }}
                />
                {d.name}: {d.value.toLocaleString()} (
                {totals.total
                  ? Math.round((d.value / totals.total) * 1000) / 10
                  : 0}
                %)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StackedSexBar({ title, data, nameKey, height }) {
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className={CARD_CLS}>
      <SectionTitle>{title}</SectionTitle>
      {safeData.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height || safeData.length * 42 + 60}>
          <BarChart
            data={safeData}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey={nameKey}
              width={190}
              tick={{ fontSize: 10, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(243,244,246,0.5)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Female" stackId="sex" fill={SEX_COLORS.Female} />
            <Bar dataKey="Male" stackId="sex" fill={SEX_COLORS.Male} />
            <Bar dataKey="Other" stackId="sex" fill={SEX_COLORS.Other} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function StackedSexBarVertical({ title, data, nameKey, height = 260 }) {
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className={CARD_CLS}>
      <SectionTitle>{title}</SectionTitle>
      {safeData.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={safeData} margin={{ left: -12, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(243,244,246,0.5)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Female" stackId="sex" fill={SEX_COLORS.Female} radius={[0, 0, 6, 6]} />
            <Bar dataKey="Male" stackId="sex" fill={SEX_COLORS.Male} />
            <Bar dataKey="Other" stackId="sex" fill={SEX_COLORS.Other} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DemographicTable({ rows, total }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div className={CARD_CLS}>
      <SectionTitle>Demographic Profile (Institutional Data)</SectionTitle>
      {safeRows.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium text-right">Female</th>
                <th className="py-2 pr-3 font-medium text-right">Male</th>
                <th className="py-2 pr-3 font-medium text-right">Other</th>
                <th className="py-2 pr-3 font-medium text-right">Total</th>
                <th className="py-2 font-medium text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.map((r) => (
                <tr key={r.label} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-3 text-gray-700">{r.label}</td>
                  <td className="py-2.5 pr-3 text-right text-pink-600 font-medium">{r.Female}</td>
                  <td className="py-2.5 pr-3 text-right text-blue-600 font-medium">{r.Male}</td>
                  <td className="py-2.5 pr-3 text-right text-gray-500">{r.Other}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{r.total}</td>
                  <td className="py-2.5 text-right text-xs text-gray-400">
                    {total ? `${Math.round((r.total / total) * 1000) / 10}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SexTable({ title, subtitle, data, nameKey, nameHeader = "Category" }) {
  const safeData = Array.isArray(data) ? data : [];

  const rowTotal = (r) =>
    r.total ?? (r.Female || 0) + (r.Male || 0) + (r.Other || 0);

  const totals = safeData.reduce(
    (acc, r) => ({
      Female: acc.Female + (r.Female || 0),
      Male: acc.Male + (r.Male || 0),
      Other: acc.Other + (r.Other || 0),
      total: acc.total + rowTotal(r),
    }),
    { Female: 0, Male: 0, Other: 0, total: 0 },
  );

  const pct = (part, whole) =>
    whole ? `${Math.round((part / whole) * 1000) / 10}%` : "—";

  return (
    <div className={CARD_CLS}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <span className="text-xs text-gray-400">{subtitle}</span>
        )}
      </div>
      {safeData.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                <th className="py-2 pr-3 font-medium">{nameHeader}</th>
                <th className="py-2 pr-3 font-medium text-right">Female</th>
                <th className="py-2 pr-3 font-medium text-right">Male</th>
                <th className="py-2 pr-3 font-medium text-right">Other</th>
                <th className="py-2 pr-3 font-medium text-right">Total</th>
                <th className="py-2 font-medium text-right">% Female</th>
              </tr>
            </thead>
            <tbody>
              {safeData.map((r, i) => (
                <tr
                  key={r[nameKey] ?? i}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="py-2.5 pr-3 text-gray-700">
                    {r[nameKey] ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-pink-600 font-medium">
                    {(r.Female || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-blue-600 font-medium">
                    {(r.Male || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-gray-500">
                    {(r.Other || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">
                    {rowTotal(r).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right text-xs text-gray-400">
                    {r.pctFemale != null
                      ? `${r.pctFemale}%`
                      : pct(r.Female || 0, rowTotal(r))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold text-gray-900">
                <td className="py-2.5 pr-3">Total</td>
                <td className="py-2.5 pr-3 text-right text-pink-700">
                  {totals.Female.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right text-blue-700">
                  {totals.Male.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-600">
                  {totals.Other.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  {totals.total.toLocaleString()}
                </td>
                <td className="py-2.5 text-right text-xs text-gray-400">
                  {pct(totals.Female, totals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}


