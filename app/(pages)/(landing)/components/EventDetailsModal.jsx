"use client";

import { useEffect, useState } from "react";
import {
  FaTimes,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBuilding,
} from "react-icons/fa";

const ACTIVITY_COLORS = {
  Academic: "bg-blue-50 text-blue-700 border-blue-200",
  Administrative: "bg-purple-50 text-purple-700 border-purple-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Research: "bg-amber-50 text-amber-700 border-amber-200",
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

export default function EventDetailsModal({ event, onClose }) {
  const [descExpanded, setDescExpanded] = useState(false);

  const posterUrl = event?.event_poster?.url || "";
  const isCancelled = event?.status === "cancelled";
  const endDates = event?.end_dates || [];
  const lastEnd = endDates[endDates.length - 1] || event?.start_dates?.[0];
  const hasEnded = lastEnd ? new Date(lastEnd).getTime() < Date.now() : false;

  // Lock body scroll while open + close on Escape
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const scheduleRows = event.start_dates || [];

  // ── View: event details ─────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-md transition-colors hover:bg-white hover:text-gray-900"
        >
          <FaTimes size={14} />
        </button>

        {/* Poster header */}
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={event.title}
            className="h-36 w-full shrink-0 object-cover"
          />
        ) : (
          <div className="h-2 w-full shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50" />
        )}

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg leading-snug font-bold text-gray-900">
              {event.title}
            </h2>
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

          {/* Schedule - every day with times */}
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Schedule
            </p>
            {scheduleRows.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <FaCalendarAlt className="shrink-0 text-gray-300" />
                No date set
              </p>
            ) : (
              scheduleRows.map((start, i) => {
                const end = endDates[i];
                const sameDay =
                  end && formatDate(start) === formatDate(end);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <FaCalendarAlt className="mt-0.5 shrink-0 text-gray-400" />
                    <span>
                      <span className="font-medium text-gray-800">
                        Day {i + 1}:
                      </span>{" "}
                      {formatDate(start)}, {formatTime(start)}
                      {end && !sameDay && (
                        <> – {formatDate(end)}, {formatTime(end)}</>
                      )}
                      {end && sameDay && <> – {formatTime(end)}</>}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Venue */}
          {event.venue && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <FaMapMarkerAlt className="shrink-0 text-gray-400" />
              <span>Venue: {event.venue}</span>
            </div>
          )}

          {/* Organizing office(s) */}
          {(event.organizing_office_unit || []).length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
              <FaBuilding className="mt-0.5 shrink-0 text-gray-400" />
              <span>{event.organizing_office_unit.join(", ")}</span>
            </div>
          )}

          {/* Full description - collapsed by default for long texts */}
          {event.description && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p
                className={`text-sm leading-relaxed whitespace-pre-line text-gray-600 ${
                  descExpanded ? "" : "line-clamp-5"
                }`}
              >
                {event.description}
              </p>
              {event.description.length > 180 && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Footer / Attendance CTA (no login — QR form) */}
        <div className="shrink-0 border-t border-gray-100 p-4">
          <a
            href={isCancelled || hasEnded ? undefined : `/attend/${event._id}`}
            aria-disabled={isCancelled || hasEnded}
            onClick={(e) => {
              if (isCancelled || hasEnded) e.preventDefault();
            }}
            className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
              isCancelled || hasEnded
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:from-violet-700 hover:to-indigo-700 active:scale-[0.99]"
            }`}
          >
            {isCancelled
              ? "This event is cancelled"
              : hasEnded
                ? "This event has ended"
                : "Mark Attendance"}
          </a>
          {!hasEnded && !isCancelled && (
            <p className="mt-2 text-center text-xs text-gray-400">
              No login needed — scan the event QR at the venue and fill the form.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}