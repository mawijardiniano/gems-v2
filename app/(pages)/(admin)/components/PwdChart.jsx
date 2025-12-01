
"use client"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function PwdChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">
          PWD Distribution by Gender
        </h2>
      </div>
      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="gender" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="PWD" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
