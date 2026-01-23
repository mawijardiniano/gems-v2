import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = {
  Never: "#22c55e",
  Rarely: "#f59e0b",
  Sometimes: "#f97316",
  Often: "#dc2626",
  Always: "#2563eb",
};

const GENDER_BASED = [
  "verbal_and_emotional_abuse",
  "mental_and_emotional_anguish",
  "public_humiliation",
  "workplace_discrimination_intimidation",
  "malicious_green_jokes",
  "sexual_advances_by_coworker",
];

const OTHER_EXPERIENCES = [
  "physical_harm",
  "fear_of_imminent_physical_harm",
  "harassment",
  "harassment_of_self_or_family",
  "emotional_distress",
  "stalking",
];

const formatLabel = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function PeaceJustice({ data }) {
  const counts = useMemo(() => {
    const init = (arr) =>
      Object.fromEntries(
        arr.map((k) => [
          k,
          { Never: 0, Rarely: 0, Sometimes: 0, Often: 0, Always: 0 },
        ])
      );

    const result = {
      gender: init(GENDER_BASED),
      other: init(OTHER_EXPERIENCES),
    };

    data.forEach((person) => {
      const spj = person.security_peace;
      if (!spj) return;

      GENDER_BASED.forEach((k) => {
        const v = spj.gender_based_experiences?.[k];
        if (v && result.gender[k][v] !== undefined) result.gender[k][v]++;
      });

      OTHER_EXPERIENCES.forEach((k) => {
        const v = spj.other_experiences?.[k];
        if (v && result.other[k][v] !== undefined) result.other[k][v]++;
      });
    });

    return result;
  }, [data]);

  const renderSection = (title, group) => (
    <>
      <h3 className="text-md font-semibold mb-4 mt-6">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(group).map(([key, values]) => {
          const pieData = Object.entries(values)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));

          if (pieData.length === 0) {
            pieData.push({ name: "No Data", value: 1 });
          }

          const total = pieData.reduce((acc, item) => acc + item.value, 0);

          return (
            <div key={key} className="bg-gray-50 rounded-md p-6 h-72">
              <h4 className="text-sm font-semibold mb-2">{formatLabel(key)}</h4>

              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    label={({ name, value }) =>
                      `${name}: ${Math.round((value / total) * 100)}%`
                    }
                  >
                    {pieData.map((e, i) => (
                      <Cell
                        key={i}
                        fill={STATUS_COLORS[e.name] || "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <h2 className="text-lg font-semibold">
        Peace, Justice & Safety – Experience Distribution
      </h2>

      {renderSection("Gender-Based Experiences", counts.gender)}
      {renderSection("Other Safety & Justice Experiences", counts.other)}
    </div>
  );
}
