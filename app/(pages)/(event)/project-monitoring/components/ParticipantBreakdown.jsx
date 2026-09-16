"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { FaChartPie } from "react-icons/fa";
import { getParticipantBreakdown } from "@/lib/accomplishmentSummary";

/* Fixed pixel size: ResponsiveContainer mis-measures inside flex rows and can both
   render nothing and spill out of the card, so the donut is drawn at a known size. */
const CHART_SIZE = 200;
const OUTER_RADIUS = 84;
const INNER_RADIUS = 56;

/* Colours mirror the event attendance insights so the same slice always reads the same way. */
const SEX_COLORS = {
  Female: "#ec4899",
  Male: "#3b82f6",
  Unspecified: "#9ca3af",
};

const SECTOR_COLORS = {
  Student: "#8b5cf6",
  Employee: "#14b8a6",
  Unspecified: "#9ca3af",
};

const TABS = [
  { key: "sex", label: "By Sex" },
  { key: "sector", label: "By Sector" },
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  fontSize: 12,
};

const pct = (part, total) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

/**
 * Aggregated participation of every (non-cancelled) event linked to a project,
 * shown as a donut chart with a By Sex / By Sector switch.
 */
export default function ParticipantBreakdown({ project }) {
  const [tab, setTab] = useState("sex");

  const breakdown = useMemo(
    () => getParticipantBreakdown(project),
    [project],
  );

  const data = tab === "sex" ? breakdown.bySex : breakdown.bySector;
  const colors = tab === "sex" ? SEX_COLORS : SECTOR_COLORS;

  return (
    <section className="rounded-xl bg-white border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <FaChartPie className="h-3 w-3" />
          Participant Breakdown
        </p>
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTab(item.key);
              }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tab === item.key
                  ? "bg-white text-rose-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {breakdown.totalAttended === 0 ? (
        <p className="text-xs text-gray-400 italic">
          {breakdown.eventCount === 0
            ? "No linked events yet."
            : "No attendance recorded yet for this project's events."}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div
            className="relative shrink-0"
            style={{ width: CHART_SIZE, height: CHART_SIZE }}
          >
            <PieChart width={CHART_SIZE} height={CHART_SIZE}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={INNER_RADIUS}
                outerRadius={OUTER_RADIUS}
                paddingAngle={data.length > 1 ? 2 : 0}
                stroke="none"
                /* Mount animations can leave the pie invisible after a remount
                   (StrictMode / tab switch), so it is drawn immediately. */
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={colors[entry.name] || "#9ca3af"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  `${value} (${pct(value, breakdown.totalAttended)}%)`,
                  name,
                ]}
              />
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900">
                {breakdown.totalAttended}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                Total
              </span>
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2">
            {data.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-2 text-xs text-gray-700"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[row.name] || "#9ca3af" }}
                />
                <span>{row.name}</span>
                <span className="ml-auto font-semibold text-gray-900">
                  {row.value}
                </span>
                <span className="w-14 text-right text-gray-400">
                  {pct(row.value, breakdown.totalAttended)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {breakdown.totalAttended > 0 && (
        <p className="mt-3 text-[11px] text-gray-400">
          Aggregated from {breakdown.eventCount} linked event
          {breakdown.eventCount !== 1 ? "s" : ""}
          {tab === "sector"
            ? " — sector follows each participant's status (Student / Employee)."
            : "."}
        </p>
      )}
    </section>
  );
}