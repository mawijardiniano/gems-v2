"use client";

import { TIMELINE_MONTHS, timelineLayout, timelineYears } from "@/lib/gantt";

const BAR_COLORS = [
  "bg-primary-400",
  "bg-emerald-400",
  "bg-secondary-400",
  "bg-orange-300",
  "bg-secondary-400",
  "bg-teal-400",
];

/*
 * Jan-Dec bar timeline of the Gantt activities (pure CSS). A project that
 * crosses New Year renders one block per calendar year - the same
 * `timelineYears()` list the PDF uses, so the page and the download agree -
 * and a bar that spills out of its year gets a chevron so it is never read as
 * finishing on Dec 31.
 */
export default function GanttTimeline({ activities, year }) {
  const years = timelineYears(activities, year);

  return (
    <div className="space-y-2">
      {years.map((blockYear) => {
        const layout = timelineLayout(activities, blockYear);
        const hasBars = layout.some(Boolean);

        return (
          <div
            key={blockYear}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              {blockYear} Timeline
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
                      <>
                        {bar.continuesBefore && (
                          <span
                            className="absolute left-0 top-1 z-10 text-[10px] leading-4 text-gray-500"
                            title={`Started before ${blockYear}`}
                          >
                            ◀
                          </span>
                        )}
                        <div
                          className={`absolute top-0.5 h-4 rounded ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{
                            left: `${bar.left}%`,
                            width: `${bar.width}%`,
                          }}
                          title={`${row.activity || "Activity"}: ${row.start_date} to ${row.end_date}`}
                        />
                        {bar.continuesAfter && (
                          <span
                            className="absolute right-0 top-1 z-10 text-[10px] leading-4 text-gray-500"
                            title={`Continues into ${blockYear + 1}`}
                          >
                            ▶
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {!hasBars && (
                <p className="relative py-3 text-center text-xs italic text-gray-400">
                  No activity falls within {blockYear}.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
