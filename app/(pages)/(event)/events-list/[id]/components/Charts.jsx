"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

const COLORS = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#06b6d4", "#ef4444", "#ec4899"];

const chartTooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  fontSize: 12,
  padding: "8px 12px",
};

const axisTick = { fontSize: 11, fill: "#9CA3AF" };
const axisLabel = { fontSize: 11, fill: "#6B7280" };

function InlineLegend({ data, colors }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {data.map((entry, i) => (
        <div
          key={entry.name}
          className="flex items-center gap-1.5 text-xs text-gray-600"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colors[i % colors.length] }}
          />
          {entry.name}:{" "}
          <span className="font-semibold ml-0.5">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, total, height = 240, children }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        {total !== undefined && (
          <p className="mt-1 text-xs text-gray-400">
            <span className="font-semibold text-gray-700">
              {total.toLocaleString()}
            </span>{" "}
            total
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Pie / Donut charts ─────────────────────────────────────────── */
function DonutChart({ data, height = 200, innerRadius = 40, outerRadius = 70 }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => [`${v}`, "Count"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={COLORS} />
    </>
  );
}

export function SexChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <ChartCard title="Sex Breakdown" subtitle="Distribution by sex at birth" total={total}>
      {safeData.length === 0 ? (
        <p className="text-sm text-gray-400">No data available.</p>
      ) : (
        <DonutChart data={safeData} />
      )}
    </ChartCard>
  );
}

export function StatusChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <ChartCard title="Status Breakdown" subtitle="Distribution by participant status" total={total}>
      {safeData.length === 0 ? (
        <p className="text-sm text-gray-400">No data available.</p>
      ) : (
        <DonutChart data={safeData} />
      )}
    </ChartCard>
  );
}

export function EventChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <ChartCard title="Event Breakdown" subtitle="Interested vs going vs not interested" total={total}>
      {safeData.length === 0 ? (
        <p className="text-sm text-gray-400">No data available.</p>
      ) : (
        <DonutChart data={safeData} />
      )}
    </ChartCard>
  );
}

/* ── Horizontal bar charts ──────────────────────────────────────── */
function HorzBarChart({ data, height = 280, yWidth = 140 }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={yWidth}
            tick={axisLabel}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => [`${v}`, "Count"]}
            cursor={{ fill: "rgba(243,244,246,0.5)" }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={COLORS} />
    </>
  );
}

export function CollegeChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <ChartCard title="College" subtitle="Participants by college" total={total}>
      {safeData.length === 0 ? (
        <p className="text-sm text-gray-400">No data available.</p>
      ) : (
        <HorzBarChart data={safeData} height={280} yWidth={150} />
      )}
    </ChartCard>
  );
}

export function PerYearChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <ChartCard title="Per Year" subtitle="Participants by year level" total={total}>
      {safeData.length === 0 ? (
        <p className="text-sm text-gray-400">No data available.</p>
      ) : (
        <HorzBarChart data={safeData} height={280} yWidth={90} />
      )}
    </ChartCard>
  );
}

/* ── Vertical bar chart ─────────────────────────────────────────── */
export function AgeChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <ChartCard title="Age Group" subtitle="Participants by age bracket" total={total}>
      {safeData.length === 0 ? (
        <p className="text-sm text-gray-400">No data available.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={safeData} margin={{ left: 0, right: 0 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={axisLabel}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v) => [`${v}`, "Count"]}
                cursor={{ fill: "rgba(243,244,246,0.5)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {safeData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InlineLegend data={safeData} colors={COLORS} />
        </>
      )}
    </ChartCard>
  );
}