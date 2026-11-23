"use client";

import { BarChart3, Inbox } from "lucide-react";
import { ChartTooltip, EmptyState, SkeletonChart } from "./DashboardUi";
import {
  Bar,
  BarChart,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, SERIES } from "@/data/lib/chartColors";

/* GAA and GAD budget per year, from the budget attached to each GPB. */
export default function GaaBudgetChart({ dashboard }) {
  const {
    gpbLoading,
    planBudgets,
    gaaChartData,
  } = dashboard;

  return (
    <div className="lg:col-span-2 rounded-2xl bg-white border border-line-subtle shadow-sm overflow-hidden">
      <div className="p-5 border-b border-line-faint">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary-50 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">
                GAA Budget per Year
              </h2>
              <p className="text-xs text-fg-muted">
                Budget attached to each year's GPB
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {gpbLoading ? (
          <SkeletonChart />
        ) : planBudgets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No budget data"
            description="Budgets appear here once a GPB has one attached."
          />
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gaaChartData}>
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART.axisText }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    `₱${(value / 1000000).toFixed(0)}M`
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART.axisText }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="gaa"
                  name="Total GAA"
                  fill="var(--color-primary-600)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  <LabelList
                    dataKey="gaa"
                    position="top"
                    formatter={(value) =>
                      value == null ? "" : `₱${(value / 1000000).toFixed(1)}M`
                    }
                    style={{ fontSize: "10px", fill: CHART.axisText }}
                  />
                </Bar>
                <Bar
                  dataKey="gad"
                  name="GAD Budget"
                  fill={SERIES.mint}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  <LabelList
                    dataKey="gad"
                    position="top"
                    formatter={(value) =>
                      value == null ? "" : `₱${(value / 1000000).toFixed(1)}M`
                    }
                    style={{ fontSize: "10px", fill: CHART.axisText }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
