import React, { useMemo } from "react";

export default function Health({ data }) {
  const total = data.length;

  const percent = (count) => (total === 0 ? 0 : Math.round((count / total) * 100));

  const rest = percent(
    data.filter(
      (d) =>
        d.social_development?.housing_work_life_balance?.enough_rest === true
    ).length
  );

  const stressManageable = percent(
    data.filter(
      (d) =>
        d.social_development?.housing_work_life_balance?.manage_stress === true
    ).length
  );

  const healthProblemBreakdown = useMemo(() => {
    const breakdown = {};
    data.forEach((d) => {
      d.personal_information?.health_problems?.forEach((h) => {
        if (h && h.trim() !== "" && h.toLowerCase() !== "none") {
          breakdown[h] = (breakdown[h] || 0) + 1;
        }
      });
    });
    return breakdown;
  }, [data]);

  const ProgressBar = ({ label, value }) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Health & Stress</h1>
        <p className="text-sm text-gray-500">
          Justifies wellness & mental health programs
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {Object.keys(healthProblemBreakdown).length > 0 ? (
            <>
              <h3 className="font-medium mb-2">Health Problem Breakdown</h3>
              <ul className="grid grid-cols-2 gap-2 space-y-1">
                {Object.entries(healthProblemBreakdown).map(([type, count]) => (
                  <li
                    key={type}
                    className="flex justify-between bg-gray-50 p-2 rounded"
                  >
                    <span>{type}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-gray-400">No health problems reported.</p>
          )}
        </div>
        <div>
          <h3 className="font-medium mb-2">Stress Indicators</h3>
          <ProgressBar label="Enough Rest" value={rest} />
          <ProgressBar label="Stress Manageable" value={stressManageable} />
        </div>
      </div>
    </div>
  );
}
