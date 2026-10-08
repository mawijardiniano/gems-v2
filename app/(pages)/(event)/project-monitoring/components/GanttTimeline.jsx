"use client";

import { TIMELINE_MONTHS, timelineLayout } from "@/lib/gantt";

const BAR_COLORS = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-orange-300",
  "bg-violet-400",
  "bg-teal-400",
];

/** Jan–Dec bar timeline of the Gantt activities (pure CSS). */
export default function GanttTimeline({ activities, year }) {
  const layout = timelineLayout(activities, year);
  const hasBars = layout.some(Boolean);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {year} Timeline
      </p>
      <div className="grid grid-cols-12 text-center text-[10px] text-gray-500 border-b border-gray-100 pb-1">
        {TIMELINE_MONTHS.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
      <div className="relative mt-1 space-y-1">
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
          {TIMELINE_MONTHS.map((month) => (
            <span key={month} className="border-r border-gray-100" />
          ))}
        </div>
        {activities.map((row, i) => {
          const bar = layout[i];
          return (
            <div key={i} className="relative h-5">
              {bar && (
                <div
                  className={`absolute top-0.5 h-4 rounded ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                  title={`${row.activity || "Activity"}: ${row.start_date} to ${row.end_date}`}
                />
              )}
            </div>
          );
        })}
        {!hasBars && (
          <p className="relative py-3 text-center text-xs italic text-gray-400">
            Add activities with start and end dates in {year} to see the bars.
          </p>
        )}
      </div>
    </div>
  );
}
