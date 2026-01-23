import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function GenderPanel({ data }) {
  const total = data.length;

  const femaleCount = data.filter(d => d.personal_information.sex === "Female").length;
  const maleCount = data.filter(d => d.personal_information.sex === "Male").length;

  const genderData = [
    { name: "Female", value: femaleCount },
    { name: "Male", value: maleCount },
  ];

  const preferNotSayCount = data.filter(d => d.personal_information.gender_preference === "Prefer not to say").length;
  const statedCount = total - preferNotSayCount;

  const preferenceData = [
    { name: "Prefer not to say", value: preferNotSayCount },
    { name: "Stated preference", value: statedCount },
  ];

  const COLORS = ["#8B5CF6", "#3B82F6", "#F59E0B", "#10B981"]; // purple, blue, yellow, green

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-black">
          Gender, Sex & Identity Panel
        </h1>
        <p className="text-sm text-gray-500">
          Used for gender analysis, equity monitoring, and GAD compliance
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="bg-gray-50 p-4 w-full rounded-md">
          <h2 className="font-semibold mb-2">Gender & Sex Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={genderData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-50 p-4 w-full rounded-md">
          <h2 className="font-semibold mb-2">Gender Preference</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={preferenceData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {preferenceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
