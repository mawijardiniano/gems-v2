"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  Users,
} from "lucide-react";
import { EmptyState } from "./DashboardUi";
import { APP_TIME_ZONE, appParts } from "@/data/lib/appTime";

/* The next upcoming events. */
export default function UpcomingEventsCard({ dashboard }) {
  const router = useRouter();
  const {
    upcomingEvents,
    eventStats,
    selectedYearLabel,
    upcomingLoading,
  } = dashboard;

  return (
    <div className=" rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Upcoming Events
              </h2>
              <p className="text-xs text-gray-500">
                Next {upcomingEvents.length} active events · {eventStats.active} active · {eventStats.completed} completed · {selectedYearLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/events-list")}
            className="text-xs font-medium text-secondary-600 hover:text-secondary-700 transition-colors"
          >
            View All
          </button>
        </div>
      </div>

      <div className="p-5">
        {upcomingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming events"
            description="Active events with upcoming dates will appear here."
            action={
              <button
                onClick={() => router.push("/create")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-secondary-600 rounded-lg hover:bg-secondary-700 transition-colors"
              >
                <Activity className="h-3.5 w-3.5" />
                Create Event
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event, idx) => {
              const eventStartDate =
                event.start_date || event.start_dates?.[0];
              const startDate = eventStartDate
                ? new Date(eventStartDate).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: APP_TIME_ZONE,
                    },
                  )
                : "TBD";

              const registrations = event.attended_count || 0;

              return (
                <div
                  key={event._id || idx}
                  className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  onClick={() =>
                    router.push(`/events-list/${event._id}`)
                  }
                >
                  {/* Date badge */}
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-secondary-700 leading-none">
                      {eventStartDate
                        ? new Date(eventStartDate)
                            .toLocaleDateString("en-US", {
                              month: "short",
                              timeZone: APP_TIME_ZONE,
                            })
                            .charAt(0)
                        : "—"}
                    </span>
                    <span className="text-lg font-bold text-secondary-700 leading-tight">
                      {eventStartDate
                        ? appParts(eventStartDate)?.day ?? "—"
                        : "—"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-secondary-600 transition-colors">
                      {event.title}
                    </p>
                    {event.reference_number && (
                      <span className="mt-0.5 inline-block rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                        {event.reference_number}
                      </span>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {event.venue || "Venue TBD"}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {registrations} registered
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-secondary-500 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
