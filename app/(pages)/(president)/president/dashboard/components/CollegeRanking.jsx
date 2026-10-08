"use client";

import Link from "next/link";
import { memo } from "react";

function CollegeRanking({ ranking }) {
  const rows = Array.isArray(ranking) ? ranking : [];
  const max = rows.reduce((m, r) => Math.max(m, r.total || 0), 0) || 1;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Largest Colleges & Offices
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Headcount by unit — female share highlighted
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No units to rank.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={`${r.kind}-${r.unit}`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-gray-800">
                  <span className="mr-1.5 text-gray-400">{i + 1}.</span>
                  {r.unit}
                  <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                    {r.kind}
                  </span>
                </span>
                <span className="shrink-0 text-gray-500">
                  {(r.total || 0).toLocaleString()} · {r.pctFemale}% F
                </span>
              </div>
              <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-violet-500"
                  style={{ width: `${((r.female || 0) / max) * 100}%` }}
                />
                <div
                  className="bg-blue-400"
                  style={{ width: `${((r.male || 0) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />Female</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-400" />Male</span>
      </div>
      <Link href="/president/gender-statistics/students" className="mt-3 inline-block text-xs font-medium text-violet-600 hover:underline">
        Open detailed statistics →
      </Link>
    </div>
  );
}

export default memo(CollegeRanking);
