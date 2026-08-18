import React, { useMemo, memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#8B5CF6", "#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

const SEX_COLORS = [COLORS[0], COLORS[1]];
const PREFERENCE_COLORS = [COLORS[0], COLORS[1], COLORS[2], COLORS[3]];

const RADIAN = Math.PI / 180;

const renderOutsideLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
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
      className="fill-gray-500 text-[11px]"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const tooltipContentStyle = {
  borderRadius: 8,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

const DonutCard = memo(function DonutCard({ title, total, data, colors }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 w-full shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">
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
                key={entry.name}
                fill={colors[index % colors.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value) => [value.toLocaleString(), "Count"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {data.map((entry, i) => (
          <div
            key={entry.name}
            className="flex items-center gap-1.5 text-xs text-gray-600"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {entry.name}:{" "}
            <span className="font-semibold">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

function GenderPanel({ data, genderPanel }) {
  const { genderData, preferenceData } = useMemo(() => {
    if (genderPanel) {
      return {
        genderData: genderPanel.genderData || [],
        preferenceData: genderPanel.preferenceData || [],
      };
    }

    let femaleCount = 0;
    let maleCount = 0;
    const prefCounts = { Male: 0, Female: 0, "LGBTQIA+": 0 };
    let unspecifiedCount = 0;

    for (const d of data) {
      const gad = d.personal_info_id?.gadData;
      if (gad?.sexAtBirth === "Female") femaleCount += 1;
      if (gad?.sexAtBirth === "Male") maleCount += 1;

      const pref = gad?.gender_preference;
      if (pref === "Male") prefCounts.Male += 1;
      else if (pref === "Female") prefCounts.Female += 1;
      else if (pref === "LGBTQIA+") prefCounts["LGBTQIA+"] += 1;
      else unspecifiedCount += 1;
    }

    const preferenceRows = [
      { name: "Male", value: prefCounts.Male },
      { name: "Female", value: prefCounts.Female },
      { name: "LGBTQIA+", value: prefCounts["LGBTQIA+"] },
    ];

    return {
      genderData: [
        { name: "Female", value: femaleCount },
        { name: "Male", value: maleCount },
      ],
      preferenceData:
        unspecifiedCount > 0
          ? [...preferenceRows, { name: "Not specified", value: unspecifiedCount }]
          : preferenceRows,
    };
  }, [data, genderPanel]);

  const sexTotal = genderData.reduce((a, b) => a + b.value, 0);
  const prefTotal = preferenceData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Gender, Sex & Identity Panel
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Used for gender analysis, equity monitoring, and GAD compliance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <DonutCard
          title="Sex at Birth"
          total={sexTotal}
          data={genderData}
          colors={SEX_COLORS}
        />
        <DonutCard
          title="Gender Identity / Preference"
          total={prefTotal}
          data={preferenceData}
          colors={PREFERENCE_COLORS}
        />
      </div>
    </div>
  );
}

export default memo(GenderPanel);