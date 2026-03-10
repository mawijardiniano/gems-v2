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
  const femaleCount = data.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Female",
  ).length;
  const maleCount = data.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Male",
  ).length;

  const genderData = [
    { name: "Female", value: femaleCount },
    { name: "Male", value: maleCount },
  ];

  const preferenceOptions = ["Male", "Female", "LGBTQIA+"];
  const preferenceCounts = preferenceOptions.map((option) => ({
    name: option,
    value: data.filter(
      (d) => d.personal_info_id?.gadData?.gender_preference === option,
    ).length,
  }));

  const unspecifiedCount = data.filter((d) => {
    const pref = d.personal_info_id?.gadData?.gender_preference;
    return !preferenceOptions.includes(pref);
  }).length;

  const preferenceData =
    unspecifiedCount > 0
      ? [
          ...preferenceCounts,
          { name: "Not specified", value: unspecifiedCount },
        ]
      : preferenceCounts;

  const COLORS = ["#8B5CF6", "#3B82F6", "#F59E0B", "#10B981", "#ef4444"]; // purple, blue, yellow, green, red

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
          <h2 className="font-semibold mb-2">Sex at Birth Breakdown</h2>
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
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
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[(index + 2) % COLORS.length]}
                  />
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
