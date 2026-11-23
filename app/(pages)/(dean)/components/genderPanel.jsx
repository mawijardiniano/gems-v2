import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART, SERIES, colorForSex } from "@/data/lib/chartColors";

/* Slices are colored by name so Female / Male read the same in every chart. */
const colorForGenderRow = (name) =>
  name === "LGBTQIA+" ? SERIES.amber : colorForSex(name);

const RADIAN = Math.PI / 180;

const renderOutsideLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}) => {
  if (percent < 0.03) return null;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="fill-gray-500 text-xs"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function DonutCard({ title, total, data }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-line-subtle w-full shadow-sm">
      <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
      <p className="text-xs text-fg-muted mb-3">
        {total.toLocaleString()} total
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={85}
            innerRadius={50}
            label={renderOutsideLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colorForGenderRow(entry.name)}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${CHART.tooltipBorder}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 12,
            }}
            formatter={(value) => [value.toLocaleString(), "Count"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-fg-4">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: colorForGenderRow(entry.name) }}
            />
            {entry.name}: <span className="font-semibold">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GenderPanel({ data, college, genderPanel }) {
  if (genderPanel) {
    const genderData = genderPanel.genderData || [];
    const preferenceData = genderPanel.preferenceData || [];

    return (
      <div className="w-full rounded-xl border border-line-subtle bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-fg">
            Gender, Sex & Identity Panel
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            Used for gender analysis, equity monitoring, and GAD compliance
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <DonutCard
            title="Sex at Birth"
            total={genderData.reduce((a, b) => a + b.value, 0)}
            data={genderData}
          />
          <DonutCard
            title="Gender Identity / Preference"
            total={preferenceData.reduce((a, b) => a + b.value, 0)}
            data={preferenceData}
          />
        </div>
      </div>
    );
  }

  const students = data.filter((d) => {
    const acad = d?.personal_info_id?.affiliation?.academic_information;
    return !college || acad?.college === college;
  });

  const employees = data.filter((d) => {
    const emp = d?.personal_info_id?.affiliation?.employment_information;
    return !college || emp?.office === college;
  });

  const femaleCount = employees.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Female",
  ).length;
  const maleCount = employees.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Male",
  ).length;

  const genderData = [
    { name: "Female", value: femaleCount },
    { name: "Male", value: maleCount },
  ];

  const preferenceOptions = ["Male", "Female", "LGBTQIA+"];
  const preferenceCounts = preferenceOptions.map((option) => ({
    name: option,
    value: employees.filter(
      (d) => d.personal_info_id?.gadData?.gender_preference === option,
    ).length,
  }));

  const unspecifiedCount = employees.filter((d) => {
    const pref = d.personal_info_id?.gadData?.gender_preference;
    return !preferenceOptions.includes(pref);
  }).length;

  const preferenceData =
    unspecifiedCount > 0
      ? [...preferenceCounts, { name: "Not specified", value: unspecifiedCount }]
      : preferenceCounts;

  return (
    <div className="w-full rounded-xl border border-line-subtle bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-fg">
          Gender, Sex & Identity Panel
        </h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          Used for gender analysis, equity monitoring, and GAD compliance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <DonutCard
          title="Sex at Birth"
          total={genderData.reduce((a, b) => a + b.value, 0)}
          data={genderData}
        />
        <DonutCard
          title="Gender Identity / Preference"
          total={preferenceData.reduce((a, b) => a + b.value, 0)}
          data={preferenceData}
        />
      </div>
    </div>
  );
}