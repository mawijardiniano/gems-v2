import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function Awareness({ data }) {
  const laws = [
    "RA 11313", // Safe Spaces Act
    "RA 9262",  // Anti-VAWC
    "RA 10354", // Reproductive Health
    "RA 6275",  // Clean Air
    "RA 7192",  // Women in Development
    "RA 7877",  // Anti-Sexual Harassment
    "RA 8972",  // Solo Parents
    "RA 9710",  // Magna Carta of Women
    "RA 9262",  // VAWC
    "RA 7277",  // PWD
  ];

  const computePercent = (key, law) => {
    const total = data.length;
    const count = data.filter((d) => {
      const val =
        key === "training"
          ? d.social_development_rights_protection?.legal_awareness_training_needs?.other_training_needs || []
          : key === "awareness"
          ? d.social_development_rights_protection?.legal_awareness_and_observance?.awareness?.[law]
          : d.social_development_rights_protection?.legal_awareness_and_observance?.observed_in_university_or_community?.[law];

      if (key === "training") return val.length > 0; 
      return val === "Yes";
    }).length;

    return total > 0 ? count / total : 0;
  };

  const chartData = laws.map((law) => ({
    law,
    awareness: computePercent("awareness", law),
    observed: computePercent("observed", law),
    training: computePercent("training", law),
  }));

  const colors = {
    awareness: "#3B82F6", // Blue
    observed: "#10B981",  // Green
    training: "#F59E0B",  // Orange
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-black">
          Legal Awareness & GAD Laws
        </h1>
        <p className="text-sm text-gray-500">
          Knowledge of gender and development regulations
        </p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
        >
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(value) => `${Math.round(value * 100)}%`}
          />
          <YAxis type="category" dataKey="law" width={200} />
          <Tooltip formatter={(value) => `${Math.round(value * 100)}%`} />

          <Bar dataKey="awareness" fill={colors.awareness} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="awareness"
              position="right"
              formatter={(val) => `${Math.round(val * 100)}%`}
            />
          </Bar>

          <Bar dataKey="observed" fill={colors.observed} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="observed"
              position="right"
              formatter={(val) => `${Math.round(val * 100)}%`}
            />
          </Bar>

          <Bar dataKey="training" fill={colors.training} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="training"
              position="right"
              formatter={(val) => `${Math.round(val * 100)}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          📌 Top Known Law:{" "}
          <strong>
            {chartData.reduce((a, b) => (b.awareness > a.awareness ? b : a)).law}
          </strong>
        </p>
        <p>
          ⚠️ Lowest Awareness:{" "}
          <strong>
            {chartData
              .filter(
                (d) =>
                  d.awareness ===
                  Math.min(...chartData.map((x) => x.awareness))
              )
              .map((d) => d.law)
              .join(", ")}
          </strong>
        </p>
        <p>📅 Schedule GAD Legal Awareness Training based on gaps</p>
      </div>
    </div>
  );
}
