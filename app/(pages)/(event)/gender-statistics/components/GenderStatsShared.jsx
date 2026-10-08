"use client";

import axios from "axios";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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

export const SEX_COLORS = { Female: "#ec4899", Male: "#3b82f6" };

export const GENDER_IDENTITY_COLORS = {
  Male: "#3b82f6",
  Female: "#ec4899",
  "LGBTQIA+": "#8b5cf6",
  "Not specified": "#9ca3af",
};

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
      label: "LGBTQIA+",
      value: totals.lgbtqia,
      pct: totals.pctLgbtqia != null ? `${totals.pctLgbtqia}%` : "—",
      accent: "from-purple-600 to-purple-400",
      icon: "🏳️‍🌈",
      iconBg: "bg-purple-100",
      sex: null,
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
                {c.value == null ? "—" : c.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {c.pct === "—" ? "not recorded" : `${c.pct} of total`}
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
            <Bar dataKey="Male" stackId="sex" fill={SEX_COLORS.Male} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/**
 * Gender identity (Male / Female / LGBTQIA+) beside sex distribution. The rows
 * come from the stats payload (`byGenderIdentity`); "Not specified" is only
 * present when the dataset has records with no identity recorded.
 */
export function GenderIdentityDonut({ rows }) {
  const data = (Array.isArray(rows) ? rows : []).filter((d) => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const pctOf = (value) =>
    total ? Math.round((value / total) * 1000) / 10 : 0;

  return (
    <div className={CARD_CLS}>
      <SectionTitle>Gender Identity</SectionTitle>
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
                  <Cell
                    key={d.name}
                    fill={GENDER_IDENTITY_COLORS[d.name] || "#cbd5e1"}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-900">
              {total.toLocaleString()}
            </span>
            <span className="text-[11px] text-gray-400">Total</span>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {data.map((d) => (
              <span
                key={d.name}
                className="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: GENDER_IDENTITY_COLORS[d.name] || "#cbd5e1" }}
                />
                {d.name}: {d.value.toLocaleString()} ({pctOf(d.value)}%)
              </span>
            ))}
          </div>
        </div>
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
            <Bar dataKey="Male" stackId="sex" fill={SEX_COLORS.Male} radius={[6, 6, 0, 0]} />
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

  const rowTotal = (r) => r.total ?? (r.Female || 0) + (r.Male || 0);

  const totals = safeData.reduce(
    (acc, r) => ({
      Female: acc.Female + (r.Female || 0),
      Male: acc.Male + (r.Male || 0),
      total: acc.total + rowTotal(r),
    }),
    { Female: 0, Male: 0, total: 0 },
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


/* == Multi-year comparison ============================================= */

export const YEAR_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

const yearColor = (index) => YEAR_COLORS[index % YEAR_COLORS.length];

/** One stats request per selected academic year (live data). `params` must not
    contain `school_year`; it is set per request. */
export function useGenderStatsByYears(type, params, years, enabled = true) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify([type, params || {}, years, enabled]);

  useEffect(() => {
    if (!enabled || years.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all(
      years.map((year) => {
        const query = new URLSearchParams({
          type,
          ...(params || {}),
          school_year: year,
        });
        return axios
          .get(`/api/analytics/gender-statistics?${query.toString()}`)
          .then((res) => ({ year, stats: res.data || null }));
      }),
    )
      .then((rows) => {
        if (!cancelled) setResults(rows.filter((row) => row.stats));
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setError(
          err?.response?.data?.message ||
            "Failed to load gender statistics. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { results, loading, error };
}

/** Checkbox dropdown for choosing one or more academic years. At least one
    year always stays selected; `onChange` receives the years sorted ascending. */
export function YearMultiSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (year) => {
    const next = value.includes(year)
      ? value.filter((y) => y !== year)
      : [...value, year];
    if (next.length === 0) return;
    onChange([...next].sort());
  };

  const summary =
    value.length === 0
      ? "No academic year data"
      : value.length === 1
        ? `AY ${value[0]}`
        : `${value.length} academic years`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={options.length === 0}
        className="flex min-w-[10rem] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        <span>{summary}</span>
        <span className="text-xs text-gray-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {options.map((year) => (
              <label
                key={year}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(year)}
                  onChange={() => toggle(year)}
                />
                AY {year}
              </label>
            ))}
            <p className="px-2 pt-1 text-[11px] text-gray-400">
              Select two or more years to compare them.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
/** Generic checkbox dropdown. An empty `value` means "no restriction"
    (all options), shown as `allLabel`. */
export function MultiSelect({ label, options, value, onChange, allLabel }) {
  const [open, setOpen] = useState(false);

  const toggle = (option) => {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(options.filter((o) => next.includes(o)));
  };

  const summary =
    value.length === 0
      ? allLabel || `All ${label}`
      : value.length <= 2
        ? value.join(", ")
        : `${value.length} selected`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={options.length === 0}
        className="flex min-w-[10rem] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        <span>{summary}</span>
        <span className="text-xs text-gray-400">v</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggle(option)}
                />
                {option}
              </label>
            ))}
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="px-2 pt-1 text-[11px] text-blue-600 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}




const rowTotalOf = (r) => r?.total ?? (r?.Female || 0) + (r?.Male || 0);

/** Category names across all years, latest year first. */
function unionNames(perYear, rowsOf, nameKey) {
  const names = [];
  const seen = new Set();
  [...perYear].reverse().forEach(({ stats }) => {
    (rowsOf(stats) || []).forEach((row) => {
      const name = row?.[nameKey];
      if (name == null || seen.has(name)) return;
      seen.add(name);
      names.push(name);
    });
  });
  return names;
}

const findRow = (stats, rowsOf, nameKey, name) =>
  (rowsOf(stats) || []).find((row) => row?.[nameKey] === name) || null;

const signed = (n) => `${n > 0 ? "+" : ""}${n.toLocaleString()}`;

/** Totals per selected year with the change against the previous selected year. */
export function YearTotalsTable({ perYear, what = "Students" }) {
  return (
    <div className={CARD_CLS}>
      <SectionTitle>{`${what} by Selected Academic Year`}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
              <th className="py-2 pr-3 font-medium">Academic Year</th>
              <th className="py-2 pr-3 font-medium text-right">Female</th>
              <th className="py-2 pr-3 font-medium text-right">Male</th>
              <th className="py-2 pr-3 font-medium text-right">Total</th>
              <th className="py-2 pr-3 font-medium text-right">% Female</th>
              <th className="py-2 font-medium text-right">vs previous</th>
            </tr>
          </thead>
          <tbody>
            {perYear.map(({ year, stats }, i) => {
              const t = stats?.totals || { Female: 0, Male: 0, total: 0 };
              const prev = i > 0 ? perYear[i - 1].stats?.totals : null;
              const change =
                prev && prev.total > 0
                  ? Math.round(((t.total - prev.total) / prev.total) * 1000) / 10
                  : null;
              return (
                <tr key={year} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-3 text-gray-700">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: yearColor(i) }}
                    />
                    AY {year}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-pink-600 font-medium">
                    {t.Female.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-blue-600 font-medium">
                    {t.Male.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">
                    {t.total.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-xs text-gray-400">
                    {t.pctFemale != null ? `${t.pctFemale}%` : "—"}
                  </td>
                  <td
                    className={`py-2.5 text-right text-xs font-medium ${
                      change == null
                        ? "text-gray-300"
                        : change < 0
                          ? "text-red-500"
                          : "text-emerald-600"
                    }`}
                  >
                    {change == null ? "—" : `${change > 0 ? "+" : ""}${change}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One small sex donut per selected year. */
export function YearSexDonuts({ perYear }) {
  return (
    <div
      className={`grid grid-cols-1 gap-5 ${
        perYear.length >= 3 ? "xl:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      {perYear.map(({ year, stats }) => (
        <div key={year}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            AY {year}
          </p>
          <SexDonut totals={stats?.totals || { Female: 0, Male: 0, total: 0 }} />
        </div>
      ))}
    </div>
  );
}


function YearBarTooltip({ active, payload, years }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={tooltipStyle} className="bg-white">
      <p className="mb-1 font-semibold text-gray-900">{row.name}</p>
      {years.map((year, i) => (
        <p key={year} className="text-gray-600">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: yearColor(i) }}
          />
          AY {year}: <strong>{(row[`total_${year}`] ?? 0).toLocaleString()}</strong>{" "}
          (F {(row[`female_${year}`] ?? 0).toLocaleString()} · M{" "}
          {(row[`male_${year}`] ?? 0).toLocaleString()})
        </p>
      ))}
    </div>
  );
}

/** Totals per category, one bar per selected year. The tooltip shows the
    Female/Male split for every year. */
export function YearGroupedBars({
  title,
  perYear,
  rowsOf,
  nameKey,
  height = 280,
}) {
  const years = perYear.map((p) => p.year);
  const names = unionNames(perYear, rowsOf, nameKey);
  const data = names.map((name) => {
    const row = { name };
    perYear.forEach(({ year, stats }) => {
      const found = findRow(stats, rowsOf, nameKey, name);
      row[`total_${year}`] = found ? rowTotalOf(found) : 0;
      row[`female_${year}`] = found?.Female || 0;
      row[`male_${year}`] = found?.Male || 0;
    });
    return row;
  });

  return (
    <div className={CARD_CLS}>
      <SectionTitle>{title}</SectionTitle>
      {data.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ left: -12, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              tickFormatter={(v) =>
                String(v).length > 14 ? `${String(v).slice(0, 13)}…` : v
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(243,244,246,0.5)" }}
              content={<YearBarTooltip years={years} />}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {years.map((year, i) => (
              <Bar
                key={year}
                dataKey={`total_${year}`}
                name={`AY ${year}`}
                fill={yearColor(i)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}


/** Table with a Female / Male / Total column group per selected year and the
    total change between the first and last selected year. */
export function YearComparisonTable({
  title,
  perYear,
  rowsOf,
  nameKey,
  nameHeader = "Category",
}) {
  const names = unionNames(perYear, rowsOf, nameKey);
  const first = perYear[0];
  const last = perYear[perYear.length - 1];

  return (
    <div className={CARD_CLS}>
      <SectionTitle>{title}</SectionTitle>
      {names.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-400">
                <th rowSpan={2} className="py-2 pr-3 font-medium align-bottom">
                  {nameHeader}
                </th>
                {perYear.map(({ year }, i) => (
                  <th
                    key={year}
                    colSpan={3}
                    className="px-2 pt-2 text-center font-semibold"
                    style={{ color: yearColor(i) }}
                  >
                    AY {year}
                  </th>
                ))}
                <th rowSpan={2} className="py-2 pl-3 font-medium text-right align-bottom">
                  Change
                </th>
              </tr>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                {perYear.map(({ year }) => (
                  <Fragment key={year}>
                    <th className="px-2 pb-2 font-medium text-right">F</th>
                    <th className="px-2 pb-2 font-medium text-right">M</th>
                    <th className="px-2 pb-2 font-medium text-right">Total</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {names.map((name) => {
                const firstTotal = rowTotalOf(
                  findRow(first.stats, rowsOf, nameKey, name),
                );
                const lastTotal = rowTotalOf(
                  findRow(last.stats, rowsOf, nameKey, name),
                );
                const diff = lastTotal - firstTotal;
                return (
                  <tr key={name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3 text-gray-700">{name}</td>
                    {perYear.map(({ year, stats }) => {
                      const row = findRow(stats, rowsOf, nameKey, name);
                      return (
                        <Fragment key={year}>
                          <td className="px-2 py-2.5 text-right text-pink-600 font-medium">
                            {(row?.Female || 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-2.5 text-right text-blue-600 font-medium">
                            {(row?.Male || 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-2.5 text-right font-semibold text-gray-900">
                            {rowTotalOf(row).toLocaleString()}
                          </td>
                        </Fragment>
                      );
                    })}
                    <td
                      className={`py-2.5 pl-3 text-right text-xs font-medium ${
                        diff < 0
                          ? "text-red-500"
                          : diff > 0
                            ? "text-emerald-600"
                            : "text-gray-400"
                      }`}
                    >
                      {signed(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

