"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28EFF"];

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

function GenderChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">Gender Breakdown</h2>
      </div>

      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              innerRadius={60}
              label
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(GenderChart);