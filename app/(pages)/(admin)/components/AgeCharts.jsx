"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const AXIS_TICK = { fontSize: 11, fill: "#6B7280" };

function AgeChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">Age Distribution</h2>
      </div>
      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={AXIS_TICK} />
            <YAxis dataKey="age" type="category" tick={AXIS_TICK} width={70} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Bar dataKey="count" fill="#8884d8">
              <LabelList dataKey="count" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(AgeChart);