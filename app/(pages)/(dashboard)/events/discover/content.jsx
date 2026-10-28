"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendar,
  FaLocationArrow,
  FaClock,
  FaTimes,
  FaSearch,
  FaChevronRight,
  FaEye,
  FaFilter,
} from "react-icons/fa";

const ACTIVITY_COLORS = {
  Academic: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Administrative: "bg-secondary-50 text-secondary-700 border-secondary-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Research: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Students: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Others: "bg-gray-50 text-gray-700 border-gray-200",
};

const ACTIVITY_TYPES = [
  "All",
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
  "Others",
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DateRangeDisplay({ event }) {
  const startDates = event.start_dates || [];
  const endDates = event.end_dates || [];

  if (startDates.length === 0) {
    return <span className="text-gray-400 text-xs">No date set</span>;
  }

  if (startDates.length === 1) {
    const start = startDates[0];
    const end = endDates[0];
    const startDate = formatDate(start);
    const startTime = formatTime(start);

    if (!end) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FaCalendar className="shrink-0 text-gray-400" />
          <span>{startDate} at {startTime}</span>
        </div>
      );
    }

    const endTime = formatTime(end);
    const endDate = formatDate(end);

    if (startDate === endDate) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FaCalendar className="shrink-0 text-gray-400" />
          <span>{startDate}, {startTime} - {endTime}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <FaCalendar className="shrink-0 text-gray-400" />
        <span>{startDate} {startTime} - {endDate} {endTime}</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {startDates.map((start, index) => {
        const end = endDates[index];
        const dayNum = index + 1;
        const dateStr = formatDate(start);
        const startTime = formatTime(start);
        return (
          <div key={index} className="flex items-center gap-1.5 text-xs text-gray-500">
            <FaCalendar className="shrink-0 text-gray-400" />
            <span>Day {dayNum}: {dateStr}{startTime ? `, ${startTime}` : ""}{end ? ` - ${formatTime(end)}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function EventCard({ event, onClick }) {
  const posterUrl = event?.event_poster?.url || event?.eventPoster?.url || event?.poster?.url || "";

  const isPast = (() => {
    const end = event.end_dates?.[event.end_dates?.length - 1] || event.start_dates?.[0] || event.date;
    return end ? new Date(end).getTime() < Date.now() : false;
  })();

  const isCancelled = event.status === "cancelled";

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-200 hover:border-secondary-200 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onClick(event._id)}
    >
      {/* Status banners */}
      {isCancelled && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1">
          Cancelled
        </div>
      )}

      {/* Poster */}
      {posterUrl ? (
        <div className={`relative ${isCancelled ? "mt-7" : ""}`}>
          <img src={posterUrl} alt={event.title} className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className={`h-2 bg-gradient-to-r from-secondary-50 to-secondary-100/60 ${isCancelled ? "mt-7" : ""}`} />
      )}

      <div className="p-4 space-y-3">
        {/* Title & Activity Type */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-secondary-600 transition-colors line-clamp-2">
              {event.title}
            </h3>
            {event.reference_number && (
              <span className="mt-1 inline-block rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-400">
                {event.reference_number}
              </span>
            )}
          </div>
          {event.type_of_activity && (
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              ACTIVITY_COLORS[event.type_of_activity] || "bg-gray-50 text-gray-700 border-gray-200"
            }`}>
              {event.type_of_activity}
            </span>
          )}
        </div>

        {/* Date */}
        <DateRangeDisplay event={event} />

        {/* Venue */}
        {event.venue && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FaLocationArrow className="shrink-0 text-gray-400" />
            <span className="truncate">{event.venue}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        {/* Stats & View link */}
        <div className="flex items-center justify-end pt-1 border-t border-gray-50">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity">
            View Details <FaChevronRight className="text-[8px]" />
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-300">{icon}</div>
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );
}

export default function DiscoverContent() {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    const load = async () => {
      try {
        const eventsRes = await axios.get("/api/events");
        setAllEvents(eventsRes.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load events. Please retry.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const discoverEvents = useMemo(() => {
    let filtered = (allEvents || [])
      .filter((evt) => evt.status !== "cancelled");

    // Type filter
    if (filterType !== "All") {
      filtered = filtered.filter((evt) => evt.type_of_activity === filterType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (evt) =>
          evt.title?.toLowerCase().includes(q) ||
          evt.description?.toLowerCase().includes(q) ||
          evt.venue?.toLowerCase().includes(q) ||
          evt.type_of_activity?.toLowerCase().includes(q)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(a.start_dates?.[0] || a.date).getTime() -
        new Date(b.start_dates?.[0] || b.date).getTime(),
    );
  }, [allEvents, searchQuery, filterType]);

  const updateEventInLists = (updated) => {
    setAllEvents((prev) =>
      prev.map((e) => (e._id === updated._id ? updated : e)),
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-5">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-secondary-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-5 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
        <p className="text-sm text-gray-500 mt-1">Explore and register for upcoming events</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <FaTimes className="shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search events by title, description, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300 transition-all"
          />
        </div>
        <div className="relative">
          <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300 transition-all cursor-pointer min-w-[140px]"
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>{type === "All" ? "All Activities" : type}</option>
            ))}
          </select>
          <FaChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] -rotate-90 pointer-events-none" />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {discoverEvents.length} event{discoverEvents.length !== 1 ? "s" : ""} available
      </div>

      {/* Event Cards */}
      {discoverEvents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {discoverEvents.map((evt) => (
            <EventCard
              key={evt._id}
              event={evt}
              onClick={(id) => router.push(`/events/discover/${id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FaEye />}
          title={searchQuery || filterType !== "All" ? "No events match your filters" : "No available events to discover"}
          description={searchQuery || filterType !== "All" ? "Try different search terms or clear the filters." : "Check back later for new events."}
        />
      )}
    </div>
  );
}