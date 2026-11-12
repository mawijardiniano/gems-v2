"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  FaCalendar,
  FaLocationArrow,
  FaArrowRight,
  FaClock,
  FaUsers,
  FaFilter,
  FaSearch,
  FaPlus,
  FaChevronDown,
  FaGlobeAsia,
} from "react-icons/fa";
import { eventPhaseStyle } from "@/lib/eventStatus";

const ActivityTypeBadge = ({ type }) => {
  const colorMap = {
    Academic: { bg: "bg-secondary-100", text: "text-secondary-700", dot: "bg-secondary-500" },
    Administrative: {
      bg: "bg-secondary-100",
      text: "text-secondary-700",
      dot: "bg-secondary-500",
    },
    GAD: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    Extension: {
      bg: "bg-secondary-100",
      text: "text-secondary-700",
      dot: "bg-secondary-500",
    },
    Research: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
    Students: {
      bg: "bg-cyan-100",
      text: "text-cyan-700",
      dot: "bg-cyan-500",
    },
    Others: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-500",
    },
  };

  const colors = colorMap[type] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    dot: "bg-gray-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {type}
    </span>
  );
};

/* Phase comes from lib/eventStatus so this badge can never disagree with the
   discover page or the attendance window. Before this, the badge read only the
   dates and ignored `status`, so a cancelled event with a future date still
   read "Upcoming" here while the discover page showed a red "Cancelled". */
const EventStatusBadge = ({ event }) => {
  const style = eventPhaseStyle(event);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};

/* How many event cards one request returns. The API caps this server-side too. */
const PAGE_SIZE = 60;

const SkeletonCard = () => (
  <div className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
    <div className="h-44 bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  </div>
);

export default function EventsListContent() {
  const router = useRouter();
  const userId = useSelector((state) => state.auth.userId);

  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityType, setActivityType] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const activityTypes = [
    "Academic",
    "Administrative",
    "GAD",
    "Extension",
    "Research",
    "Students",
    "Others",
  ];

  const goToManage = (id) => {
    if (!id) return;
    router.push(`/events-list/${id}`);
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        setProjects(res.data?.data || []);
      } catch (err) {
        setProjects([]);
      }
    };

    loadProjects();
  }, []);

  /* Filters are resolved by the API now. The page used to download every event
     in the system (each with a decrypted creator identity) and throw almost all
     of it away in `filteredEvents`. Re-runs whenever a filter changes, and the
     AbortController drops a response that a newer filter has already replaced. */
  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          created_by: userId,
          limit: String(PAGE_SIZE),
          page: String(page),
        });
        if (activityType) params.set("type", activityType);
        if (selectedYear) params.set("year", String(selectedYear));

        const res = await axios.get(`/api/events?${params.toString()}`, {
          signal: controller.signal,
        });

        setEvents(res.data?.data || []);
        setTotal(res.data?.meta?.total ?? (res.data?.data || []).length);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setError(
          err.response?.data?.message || "Unable to load events. Please retry."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadEvents();

    return () => controller.abort();
  }, [userId, activityType, selectedYear, page]);

  /* A filter change can leave the view on a page that no longer exists — page 4
     of a result that now has one page. Send the reader back to the top. */
  useEffect(() => {
    setPage(1);
  }, [activityType, selectedYear]);

  const availableYears = useMemo(() => {
    const years = [...new Set(projects.map((p) => p.year))];
    return years.sort((a, b) => b - a);
  }, [projects]);

  /* The API applies the creator, type and year filters, so the response is
     already what the organiser should see. This used to walk every event in the
     system on the client and discard almost all of them. */
  const filteredEvents = events;

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  const formatRange = (evt) => {
    const start = evt.start_date || (evt.start_dates || [])[0];
    const end = evt.end_date || (evt.end_dates || []).slice(-1).pop() || start;

    if (!start) return null;

    const startStr = new Date(start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeStart = new Date(start).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const timeEnd =
      end && new Date(end).getTime() !== new Date(start).getTime()
        ? new Date(end).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null;

    return (
      <div className="flex items-center gap-2 text-gray-600">
        <FaCalendar className="text-gray-400 shrink-0" size={12} />
        <span>
          {startStr} at {timeStart}
          {timeEnd ? ` – ${timeEnd}` : ""}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-secondary-50 p-6">
        <div className="max-w-8xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-secondary-50/30">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Events
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Browse and manage your university events
            </p>
          </div>

          <button
            onClick={() => router.push("/create")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-secondary-200 hover:shadow-xl hover:from-secondary-700 hover:to-secondary-600 transition-all duration-200"
          >
            <FaPlus size={14} />
            Create Event
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <FaFilter className="text-gray-400" size={14} />
            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 focus:outline-none cursor-pointer hover:border-gray-300 transition-colors"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">All GPB Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>

            <div className="relative">
              <select
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 focus:outline-none cursor-pointer hover:border-gray-300 transition-colors"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                <option value="">All Types</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>

            {(activityType || selectedYear) && (
              <button
                onClick={() => {
                  setActivityType("");
                  setSelectedYear("");
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-sm text-gray-400">
              {total > filteredEvents.length
                ? `Showing ${filteredEvents.length} of ${total} events`
                : `${filteredEvents.length} event${filteredEvents.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* Event Cards */}
        <section>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FaSearch className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 text-lg font-medium">
                No events found
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your filters or create a new event
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((evt, index) => (
                <div
                  key={evt._id}
                  className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Top color accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary-400 to-secondary-600" />

                  {/* Poster */}
                  {evt.event_poster?.url ? (
                    <div className="overflow-hidden">
                      <img
                        src={evt.event_poster.url}
                        alt={evt.title}
                        className="w-full h-44 object-cover group-hover:scale-105 transition duration-500 ease-out"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-secondary-50 to-secondary-100/60 flex items-center justify-center">
                      <FaGlobeAsia className="text-secondary-300" size={40} />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    {/* Title + Type Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-secondary-600 transition-colors line-clamp-2">
                          {evt.title}
                        </h3>
                        {evt.reference_number && (
                          <span className="mt-1 inline-block rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                            {evt.reference_number}
                          </span>
                        )}
                      </div>
                      {evt.type_of_activity && (
                        <ActivityTypeBadge type={evt.type_of_activity} />
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <EventStatusBadge event={evt} />
                    </div>

                    {/* Date Range */}
                    <div className="space-y-1">{formatRange(evt)}</div>

                    {/* Venue */}
                    {evt.venue && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FaLocationArrow
                          className="text-gray-400 shrink-0"
                          size={12}
                        />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    )}

                    {/* GAD Activity */}
                    {evt.gad_activity && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">
                          GAD Activity:
                        </span>{" "}
                        <span className="text-gray-500">{evt.gad_activity}</span>
                      </div>
                    )}

                    {/* Description */}
                    {evt.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}

                    {/* Manage Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <FaUsers size={12} />
                        <span>
                          {evt.attended_users?.length || 0} participant
                          {(evt.attended_users?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => goToManage(evt._id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-secondary-50 hover:bg-secondary-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Manage <FaArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination. The API caps a page at PAGE_SIZE; without this the
              reader could see "Showing 60 of 340" and never reach the other 280. */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-secondary-300 hover:text-secondary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-secondary-300 hover:text-secondary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}