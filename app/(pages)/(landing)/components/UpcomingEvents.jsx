"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";
import Skeleton from "@/components/Skeleton";
import EventDetailsModal from "./EventDetailsModal";

const ACTIVITY_COLORS = {
  Academic: "bg-blue-50 text-blue-700 border-blue-200",
  Administrative: "bg-purple-50 text-purple-700 border-purple-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Research: "bg-amber-50 text-amber-700 border-amber-200",
  Students: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Others: "bg-gray-50 text-gray-700 border-gray-200",
};

const MAX_EVENTS = 6;

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

function getDateRangeLabel(event) {
  const startDates = event.start_dates || [];
  const endDates = event.end_dates || [];
  if (startDates.length === 0) return null;

  const firstStart = startDates[0];
  const lastEnd = endDates[endDates.length - 1] || firstStart;
  const startDate = formatDate(firstStart);
  const endDate = formatDate(lastEnd);

  if (startDate === endDate) {
    const startTime = formatTime(firstStart);
    const endTime = formatTime(lastEnd);
    return startTime && endTime && startTime !== endTime
      ? `${startDate}, ${startTime} - ${endTime}`
      : startDate;
  }

  return `${startDate} - ${endDate}`;
}

function UpcomingEventCard({ event, onOpen, isRegistered = false }) {
  const posterUrl = event?.event_poster?.url || "";
  const dateLabel = getDateRangeLabel(event);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(event);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${event.title}`}
      onClick={() => onOpen(event)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {/* Poster */}
      {posterUrl ? (
        <div className="relative">
          <img
            src={posterUrl}
            alt={event.title}
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className="h-2 bg-gradient-to-r from-indigo-50 to-purple-50" />
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Title & Activity Type */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 transition-colors group-hover:text-indigo-600">
            {event.title}
          </h3>
          {event.type_of_activity && (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                ACTIVITY_COLORS[event.type_of_activity] ||
                "bg-gray-50 text-gray-700 border-gray-200"
              }`}
            >
              {event.type_of_activity}
            </span>
          )}
        </div>

        {/* Date */}
        {dateLabel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FaCalendarAlt className="shrink-0 text-gray-400" />
            <span>{dateLabel}</span>
          </div>
        )}

        {/* Venue */}
        {event.venue && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FaMapMarkerAlt className="shrink-0 text-gray-400" />
            <span className="truncate">{event.venue}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Registered pill */}
        {isRegistered && (
          <div className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <FaCheckCircle className="text-[10px]" />
            Registered ✓
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingEventsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading upcoming events"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[...Array(3)].map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-2.5 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registeredIds, setRegisteredIds] = useState(() => new Set());

  const handleRegistered = (eventId) => {
    setRegisteredIds((prev) => new Set(prev).add(eventId));
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/events/upcoming")
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setEvents(data.slice(0, MAX_EVENTS));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fail silently - hide the whole section offline or on error.
        setHidden(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <UpcomingEventsSkeleton />
        </div>
      </section>
    );
  }

  // No events (or request failed) -> render nothing so the landing page stays clean.
  if (hidden || events.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
              What&apos;s on campus
            </p>
            <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
            <p className="mt-2 text-gray-600">
              GAD activities, trainings, and university-wide gatherings you can
              join.
            </p>
          </div>
          <Link
            href="/events/discover"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            View all events
            <FaArrowRight className="text-xs" />
          </Link>
        </div>

        {/* Event cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <UpcomingEventCard
              key={event._id}
              event={event}
              onOpen={setSelectedEvent}
              isRegistered={registeredIds.has(event._id)}
            />
          ))}
        </div>
      </div>

      {/* Details modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRegistered={handleRegistered}
        />
      )}
    </section>
  );
}