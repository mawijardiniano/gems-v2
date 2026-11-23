"use client";

import { useId, useState } from "react";
import {
  FaTimes,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBuilding,
} from "react-icons/fa";
import { useDialog } from "@/hooks/useDialog";

const ACTIVITY_COLORS = {
  Academic: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Administrative: "bg-secondary-50 text-secondary-700 border-secondary-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-success-subtle text-success border-success-border",
  Research: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Students: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Others: "bg-subtle text-fg-3 border-line",
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

  const titleId = useId();
  const dialogRef = useDialog(onClose);

  const scheduleRows = event.start_dates || [];

  // ── View: event details ─────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="touch-target absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-fg-4 shadow-md transition-colors hover:bg-white hover:text-fg"
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
          <div className="h-2 w-full shrink-0 bg-gradient-to-r from-secondary-50 to-secondary-100/60" />
        )}

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg leading-snug font-bold text-fg">
              {event.title}
            </h2>
            {event.type_of_activity && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  ACTIVITY_COLORS[event.type_of_activity] ||
                  "bg-subtle text-fg-3 border-line"
                }`}
              >
                {event.type_of_activity}
              </span>
            )}
          </div>

          {/* Schedule - every day with times */}
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Schedule
            </p>
            {scheduleRows.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <FaCalendarAlt className="shrink-0 text-fg-faint" />
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
                    className="flex items-start gap-2 text-sm text-fg-4"
                  >
                    <FaCalendarAlt className="mt-0.5 shrink-0 text-fg-muted" />
                    <span>
                      <span className="font-medium text-fg-2">
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
            <div className="mt-4 flex items-center gap-2 text-sm text-fg-4">
              <FaMapMarkerAlt className="shrink-0 text-fg-muted" />
              <span>Venue: {event.venue}</span>
            </div>
          )}

          {/* Organizing office(s) */}
          {(event.organizing_office_unit || []).length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-sm text-fg-4">
              <FaBuilding className="mt-0.5 shrink-0 text-fg-muted" />
              <span>{event.organizing_office_unit.join(", ")}</span>
            </div>
          )}

          {/* Full description - collapsed by default for long texts */}
          {event.description && (
            <div className="mt-4 border-t border-line-subtle pt-4">
              <p
                className={`text-sm leading-relaxed whitespace-pre-line text-fg-4 ${
                  descExpanded ? "" : "line-clamp-5"
                }`}
              >
                {event.description}
              </p>
              {event.description.length > 180 && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-xs font-semibold text-secondary-600 transition-colors hover:text-secondary-700"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Footer / Attendance CTA (no login — QR form) */}
        <div className="shrink-0 border-t border-line-subtle p-4">
          <a
            href={isCancelled || hasEnded ? undefined : `/attend/${event._id}`}
            aria-disabled={isCancelled || hasEnded}
            onClick={(e) => {
              if (isCancelled || hasEnded) e.preventDefault();
            }}
            className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition ${
              isCancelled || hasEnded
                ? "cursor-not-allowed bg-muted text-fg-disabled"
                : "bg-gradient-to-r from-secondary-700 to-secondary-500 text-white shadow-md hover:from-secondary-700 hover:to-secondary-700 active:scale-[0.99]"
            }`}
          >
            {isCancelled
              ? "This event is cancelled"
              : hasEnded
                ? "This event has ended"
                : "Mark Attendance"}
          </a>
          {!hasEnded && !isCancelled && (
            <p className="mt-2 text-center text-xs text-fg-muted">
              No login needed — scan the event QR at the venue and fill the form.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}