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

const ActivityTypeBadge = ({ type }) => {
  const colorMap = {
    Academic: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
    Administrative: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      dot: "bg-purple-500",
    },
    GAD: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    Extension: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-500",
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

const EventStatusBadge = ({ event }) => {
  const getStatus = () => {
    let end = event.end_date || event.start_date || event.date;
    if (
      Array.isArray(event.end_dates) &&
      event.end_dates.length > 0
    ) {
      end = event.end_dates[event.end_dates.length - 1];
    }
    if (!end) return { label: "Unknown", classes: "bg-gray-100 text-gray-600" };

    const now = new Date();
    const endDate = new Date(end);

    let start = event.start_date || event.date;
    if (
      Array.isArray(event.start_dates) &&
      event.start_dates.length > 0
    ) {
      start = event.start_dates[0];
    }
    const startDate = new Date(start);

    if (endDate.getTime() < now.getTime()) {
      return {
        label: "Past",
        classes: "bg-red-50 text-red-600 border border-red-200",
      };
    }
    if (startDate.getTime() <= now.getTime() && endDate.getTime() >= now.getTime()) {
      return {
        label: "Ongoing",
        classes: "bg-green-50 text-green-600 border border-green-200",
      };
    }
    return {
      label: "Upcoming",
      classes: "bg-blue-50 text-blue-600 border border-blue-200",
    };
  };

  const status = getStatus();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.classes}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.label}
    </span>
  );
};

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
    const loadData = async () => {
      try {
        setLoading(true);
        const [eventsRes, projectsRes] = await Promise.all([
          axios.get("/api/events"),
          axios.get("/api/project"),
        ]);
        setEvents(eventsRes.data?.data || []);
        setProjects(projectsRes.data?.data || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load events. Please retry."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const availableYears = useMemo(() => {
    const years = [...new Set(projects.map((p) => p.year))];
    return years.sort((a, b) => b - a);
  }, [projects]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const creatorId =
        typeof evt.created_by === "object" && evt.created_by?._id
          ? evt.created_by._id.toString()
          : evt.created_by?.toString?.() || "";

      const matchesCreator = userId ? creatorId === userId.toString() : true;

      const matchesType =
        !activityType ||
        evt.type_of_activity?.toLowerCase() === activityType.toLowerCase();

      let matchesYear = true;

      if (selectedYear) {
        const relatedProject = projects.find((p) => p._id === evt.project);
        matchesYear =
          relatedProject &&
          Number(relatedProject.year) === Number(selectedYear);
      }

      return matchesCreator && matchesType && matchesYear;
    });
  }, [events, projects, activityType, selectedYear, userId]);

  const formatRange = (evt) => {
    let startDates = evt.start_dates || [];
    let endDates = evt.end_dates || [];

    if (Array.isArray(startDates) && startDates.length > 0) {
      return startDates.map((startDate, index) => {
        const dayNumber = index + 1;
        const endDate = endDates[index];
        const startStr = new Date(startDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const timeStart = new Date(startDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        if (!endDate) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 text-gray-600"
            >
              <FaCalendar className="text-gray-400 shrink-0" size={12} />
              <span>
                Day {dayNumber}: {startStr} at {timeStart}
              </span>
            </div>
          );
        }

        const timeEnd = new Date(endDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={index}
            className="flex items-center gap-2 text-gray-600"
          >
            <FaClock className="text-gray-400 shrink-0" size={12} />
            <span>
              Day {dayNumber}: {startStr}, {timeStart} – {timeEnd}
            </span>
          </div>
        );
      });
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
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
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200"
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
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer hover:border-gray-300 transition-colors"
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
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer hover:border-gray-300 transition-colors"
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
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
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
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600" />

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
                    <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                      <FaGlobeAsia className="text-blue-300" size={40} />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    {/* Title + Type Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {evt.title}
                      </h3>
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
                          {evt.registered_users?.length || 0} participant
                          {(evt.registered_users?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => goToManage(evt._id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Manage <FaArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}