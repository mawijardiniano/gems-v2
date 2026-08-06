"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { socketMethods } from "@/utils/socket";
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
  FaFolder,
} from "react-icons/fa";

const ActivityTypeBadge = ({ type }) => {
  const colorMap = {
    Academic: "bg-blue-100 text-blue-700",
    Administrative: "bg-purple-100 text-purple-700",
    GAD: "bg-emerald-100 text-emerald-700",
    Extension: "bg-amber-100 text-amber-700",
    Research: "bg-rose-100 text-rose-700",
    Students: "bg-cyan-100 text-cyan-700",
    Others: "bg-gray-100 text-gray-700",
  };
  const classes = colorMap[type] || colorMap.Others;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {type}
    </span>
  );
};

const EventStatusBadge = ({ event }) => {
  const getStatus = () => {
    const end = Array.isArray(event.end_dates) && event.end_dates.length > 0
      ? event.end_dates[event.end_dates.length - 1]
      : event.end_date || event.start_date || event.date;
    if (!end) return { label: "Unknown", classes: "bg-gray-100 text-gray-600" };

    const now = new Date();
    const endDate = new Date(end);
    const start = Array.isArray(event.start_dates) && event.start_dates.length > 0
      ? event.start_dates[0]
      : event.start_date || event.date;
    const startDate = new Date(start);

    if (endDate.getTime() < now.getTime())
      return { label: "Past", classes: "bg-red-50 text-red-600 border border-red-200" };
    if (startDate.getTime() <= now.getTime() && endDate.getTime() >= now.getTime())
      return { label: "Ongoing", classes: "bg-green-50 text-green-600 border border-green-200" };
    return { label: "Upcoming", classes: "bg-blue-50 text-blue-600 border border-blue-200" };
  };

  const status = getStatus();
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.classes}`}>
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
    </div>
  </div>
);

export default function DeanProjectsContent() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityType, setActivityType] = useState("");
  const [userId, setUserId] = useState(null);

  const activityTypes = ["Academic", "Administrative", "GAD", "Extension", "Research", "Students", "Others"];

  const goToManage = (id) => {
    if (!id) return;
    router.push(`/dean/projects/${id}`);
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const profileRes = await axios.get("/api/profile/my-profile");
        const currentUserId = profileRes.data?.user?._id;
        if (!currentUserId) return;

        setUserId(currentUserId);

        const eventsRes = await axios.get("/api/events", {
          params: { created_by: currentUserId },
        });

        if (mounted) {
          setEvents(eventsRes.data?.data || []);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Unable to load events. Please retry.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    const handleEventCreated = (data) => {
      if (!data?.event) return;
      if (data.event.created_by === userId || data.createdBy === userId) {
        setEvents((prev) => {
          if (prev.some((e) => e._id === data.event._id)) return prev;
          return [data.event, ...prev];
        });
      }
    };

    socketMethods.on("event:created", handleEventCreated);

    return () => {
      mounted = false;
      socketMethods.off("event:created", handleEventCreated);
    };
  }, [userId]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesType =
        !activityType ||
        evt.type_of_activity?.toLowerCase() === activityType.toLowerCase();
      return matchesType;
    });
  }, [events, activityType]);

  const formatRange = (evt) => {
    const startDates = evt.start_dates || [];
    const endDates = evt.end_dates || [];

    if (!Array.isArray(startDates) || startDates.length === 0) return null;

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
          <div key={index} className="flex items-center gap-2 text-gray-600">
            <FaCalendar className="text-gray-400 shrink-0" size={12} />
            <span>Day {dayNumber}: {startStr} at {timeStart}</span>
          </div>
        );
      }

      const timeEnd = new Date(endDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <div key={index} className="flex items-center gap-2 text-gray-600">
          <FaClock className="text-gray-400 shrink-0" size={12} />
          <span>Day {dayNumber}: {startStr}, {timeStart} – {timeEnd}</span>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 p-6">
        <div className="max-w-8xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <FaFolder className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Projects</h1>
              <p className="text-gray-500 text-sm mt-1">Events you have created and manage</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/dean/projects/create")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-emerald-200 hover:shadow-xl hover:from-emerald-700 hover:to-teal-600 transition-all duration-200"
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
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none cursor-pointer hover:border-gray-300 transition-colors"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                <option value="">All Types</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>

            {activityType && (
              <button
                onClick={() => setActivityType("")}
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
              <p className="text-gray-500 text-lg font-medium">No projects found</p>
              <p className="text-gray-400 text-sm mt-1">Create your first event to get started</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((evt, index) => (
                <div
                  key={evt._id}
                  className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-600" />

                  {evt.event_poster?.url ? (
                    <div className="overflow-hidden">
                      <img
                        src={evt.event_poster.url}
                        alt={evt.title}
                        className="w-full h-44 object-cover group-hover:scale-105 transition duration-500 ease-out"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                      <FaGlobeAsia className="text-emerald-300" size={40} />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                        {evt.title}
                      </h3>
                      {evt.type_of_activity && <ActivityTypeBadge type={evt.type_of_activity} />}
                    </div>

                    <div><EventStatusBadge event={evt} /></div>
                    <div className="space-y-1">{formatRange(evt)}</div>

                    {evt.venue && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FaLocationArrow className="text-gray-400 shrink-0" size={12} />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    )}

                    {evt.gad_activity && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">GAD Activity:</span>{" "}
                        <span className="text-gray-500">{evt.gad_activity}</span>
                      </div>
                    )}

                    {evt.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{evt.description}</p>
                    )}

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
                        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
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