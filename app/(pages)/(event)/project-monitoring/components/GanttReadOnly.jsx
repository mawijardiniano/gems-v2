"use client";

import { calcDurationDays, toInputDate } from "@/lib/gantt";
import GanttTimeline from "./GanttTimeline";

const fmt = (value) => {
  const iso = toInputDate(value);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Year shown on the timeline: first activity start, else project start/year. */
const pickYear = (project, activities) => {
  const first = activities.find((a) => toInputDate(a.start_date));
  const iso =
    (first && toInputDate(first.start_date)) ||
    toInputDate(project?.start_date);
  if (iso) return Number(iso.slice(0, 4));
  return Number(project?.year) || new Date().getFullYear();
};

/** Read-only Gantt activities table + timeline for a project. */
export default function GanttReadOnly({ project, compact = false }) {
  const activities = Array.isArray(project?.gantt_activities)
    ? project.gantt_activities.filter((a) => a && String(a.activity || "").trim())
    : [];

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Gantt Activities{compact ? ` (${activities.length})` : ""}
      </p>
      {activities.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          No Gantt activities encoded yet.
        </p>
      ) : compact ? (
        <>
          <ol className="space-y-1.5 text-xs text-gray-600">
            {activities.map((row, i) => (
              <li key={i}>
                <span className="font-medium text-gray-800">
                  {i + 1}. {row.activity}
                </span>
                <div className="text-gray-400">
                  {fmt(row.start_date)} → {fmt(row.end_date)} ·{" "}
                  {calcDurationDays(row.start_date, row.end_date)} days
                  {row.person_responsible
                    ? ` · ${row.person_responsible}`
                    : ""}
                </div>
              </li>
            ))}
          </ol>
          <GanttTimeline
            activities={activities}
            year={pickYear(project, activities)}
          />
        </>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-2 py-1.5 font-semibold">#</th>
                  <th className="px-2 py-1.5 font-semibold">Activity</th>
                  <th className="px-2 py-1.5 font-semibold whitespace-nowrap">
                    Start
                  </th>
                  <th className="px-2 py-1.5 font-semibold whitespace-nowrap">
                    End
                  </th>
                  <th className="px-2 py-1.5 font-semibold">Days</th>
                  <th className="px-2 py-1.5 font-semibold">Person</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {activities.map((row, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5 font-medium text-gray-800">
                      {row.activity}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {fmt(row.start_date)}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {fmt(row.end_date)}
                    </td>
                    <td className="px-2 py-1.5">
                      {calcDurationDays(row.start_date, row.end_date) || "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.person_responsible || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <GanttTimeline
            activities={activities}
            year={pickYear(project, activities)}
          />
        </>
      )}
    </div>
  );
}
