"use client";

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

export default function AgeChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">Age Distribution</h2>
      </div>
      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          {/* <BarChart data={data} layout="vertical" margin={{ left: 50 }}> */}
          <BarChart data={data} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="age" type="category" />
            <Tooltip />
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
