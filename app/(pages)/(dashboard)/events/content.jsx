"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendar,
  FaLocationArrow,
  FaClock,
  FaTag,
  FaChevronRight,
  FaEye,
  FaSearch,
} from "react-icons/fa";
import { effectiveStatus, isEventOpen, eventSpan } from "@/lib/eventStatus";

const ACTIVITY_COLORS = {
  Academic: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Administrative: "bg-secondary-50 text-secondary-700 border-secondary-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Research: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Students: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Others: "bg-gray-50 text-gray-700 border-gray-200",
};

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
  /* eventSpan() resolves the dates: scalars first, legacy arrays as fallback.
     The multi-day branch below still renders one line per stored day for rows
     that genuinely carry several; there are none today, but the shape is kept
     so a future multi-day event does not silently collapse to a single line. */
  const { start, end } = eventSpan(event);

  if (start === null) {
    return <span className="text-gray-400">No date set</span>;
  }

  const startDate = formatDate(new Date(start));
  const startTime = formatTime(new Date(start));

  if (end === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <FaCalendar className="shrink-0 text-gray-400" />
        <span>{startDate} at {startTime}</span>
      </div>
    );
  }

  const endDate = formatDate(new Date(end));
  const endTime = formatTime(new Date(end));

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

function EventCard({ event, onClick, isPast }) {
  const posterUrl = event?.event_poster?.url || event?.eventPoster?.url || event?.poster?.url || "";

  /* One phase for the whole banner: a cancelled event is cancelled, a finished
     one is completed, and the dates only decide between upcoming/ongoing. This
     card used to read `status` alone while the manage list read dates alone, so
     the two pages disagreed about the same record. */
  const phase = effectiveStatus(event);
  const isCancelled = phase === "cancelled";
  const isCompleted = phase === "completed";

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-200 hover:border-secondary-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onClick(event._id)}
    >
      {/* Status banner */}
      {isCancelled && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1">
          Cancelled
        </div>
      )}
      {isCompleted && !isCancelled && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1">
          Completed
        </div>
      )}

      {/* Poster */}
      {posterUrl ? (
        <div className={`relative ${isCancelled || isCompleted ? "mt-7" : ""}`}>
          <img
            src={posterUrl}
            alt={event.title}
            className="w-full h-44 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      ) : (
        <div className={`h-3 ${isCancelled || isCompleted ? "" : ""}`} />
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
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ACTIVITY_COLORS[event.type_of_activity] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
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
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* View details link */}
        <div className="flex items-center justify-end pt-1 border-t border-gray-50">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity">
            View Details <FaChevronRight className="text-[8px]" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EventContent({
  participatedEvents = [],
  createdEvents = [],
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setRegisteredEvents([]);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [eventsRes, profileRes] = await Promise.all([
          axios.get("/api/events"),
          axios.get("/api/profile/my-profile"),
        ]);
        setAllEvents(eventsRes.data?.data || []);
        setUserId(profileRes.data?.user?._id || null);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load events. Please retry.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const registeredIds = useMemo(
    () => new Set(registeredEvents.map((evt) => evt._id)),
    [registeredEvents],
  );

  const createdIds = useMemo(
    () => new Set(createdEvents.map((evt) => evt._id)),
    [createdEvents],
  );

  /* Reads the shared lifecycle rules instead of a second, subtly different date
     chain. This page used to prefer `end_dates` over `end_date` — the exact
     opposite of the manage list — so the two disagreed about events that had
     both fields. Cancelled events are never "past-upcoming": they are excluded
     from Discover below and kept in the past list. */
  const isPast = (evt) => effectiveStatus(evt) === "completed";

  const upcomingRegistered = useMemo(
    () => registeredEvents
      .filter((evt) => !isPast(evt))
      .sort((a, b) => (eventSpan(a).start ?? 0) - (eventSpan(b).start ?? 0)),
    [registeredEvents],
  );

  const pastRegistered = useMemo(
    () => registeredEvents
      .filter((evt) => isPast(evt))
      .sort((a, b) => (eventSpan(b).end ?? 0) - (eventSpan(a).end ?? 0)),
    [registeredEvents],
  );

  const discoverEvents = useMemo(() => {
    let filtered = (allEvents || [])
      .filter((evt) => isEventOpen(evt))
      .filter((evt) => !isPast(evt))
      .filter((evt) => !registeredIds.has(evt._id))
      .filter((evt) => !createdIds.has(evt._id));

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
      (a, b) => (eventSpan(a).start ?? 0) - (eventSpan(b).start ?? 0),
    );
  }, [allEvents, registeredIds, createdIds, searchQuery]);

  const EmptyState = ({ icon, title, description }) => (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-300">{icon}</div>
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );

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
    <div className="max-w-5xl mx-auto p-5 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Events</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your event registrations and discover new ones.</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <FaTimes className="shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-3 px-1 -mb-px border-b-2 text-sm font-medium transition ${
              activeTab === "upcoming"
                ? "border-secondary-600 text-secondary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Upcoming
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{upcomingRegistered.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`pb-3 px-1 -mb-px border-b-2 text-sm font-medium transition ${
              activeTab === "past"
                ? "border-secondary-600 text-secondary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Past
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{pastRegistered.length}</span>
          </button>
        </div>
      </div>

      {/* Registered Events */}
      {activeTab === "upcoming" && (
        <section>
          {upcomingRegistered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingRegistered.map((evt) => (
                <EventCard
                  key={evt._id}
                  event={evt}
                  onClick={(id) => router.push(`/events/discover/${id}`)}
                  isPast={false}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FaCalendar />}
              title="No upcoming registered events"
              description="Events you register for will appear here."
            />
          )}
        </section>
      )}

      {activeTab === "past" && (
        <section>
          {pastRegistered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pastRegistered.map((evt) => (
                <EventCard
                  key={evt._id}
                  event={evt}
                  onClick={(id) => router.push(`/events/discover/${id}`)}
                  isPast={true}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FaClock />}
              title="No past events yet"
              description="Your past event registrations will show here."
            />
          )}
        </section>
      )}

      {/* Discover Events */}
      <section className="space-y-5 pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Discover Events</h2>
            <p className="text-sm text-gray-500 mt-0.5">Find and register for upcoming events</p>
          </div>
          <button
            className="text-sm font-medium text-secondary-600 hover:text-secondary-700 flex items-center gap-1 shrink-0"
            onClick={() => router.push("/events/discover")}
          >
            View All <FaChevronRight className="text-[10px]" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search events by title, description, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300 transition-all"
          />
        </div>

        {discoverEvents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {discoverEvents.map((evt) => (
              <EventCard
                key={evt._id}
                event={evt}
                onClick={(id) => router.push(`/events/discover/${id}`)}
                isPast={false}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FaEye />}
            title={searchQuery ? "No events match your search" : "No available events to discover"}
            description={searchQuery ? "Try a different search term or clear the filter." : "Check back later for new events."}
          />
        )}
      </section>
    </div>
  );
}