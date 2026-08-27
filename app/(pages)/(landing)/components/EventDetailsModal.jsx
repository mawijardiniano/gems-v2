"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  FaTimes,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBuilding,
  FaUserTag,
} from "react-icons/fa";
import SignIn from "./SignIn";

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

export default function EventDetailsModal({ event, onClose, onRegistered }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const userId = useSelector((state) => state.auth.userId);

  // views: details | signin | success
  const [view, setView] = useState("details");
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [participantNumber, setParticipantNumber] = useState(null);
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

  const handleJoin = async () => {
    // Guest -> flip modal to the sign-in form
    if (!isAuthenticated || !userId) {
      setView("signin");
      return;
    }

    setJoining(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/events/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event._id,
          user_id: userId,
          status: "going",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to register.");
      }

      // Server returns the updated event - find this user's participant number.
      const entry = (data?.event?.participant_numbers || []).find(
        (p) => (p.user_id?._id || p.user_id)?.toString() === userId?.toString(),
      );
      setParticipantNumber(entry?.number || null);
      onRegistered?.(event._id);
      setView("success");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setJoining(false);
    }
  };

  const scheduleRows = event.start_dates || [];

  // ── View: guest sign-in ─────────────────────────────────
  if (view === "signin") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <FaTimes size={14} />
          </button>

          {/* Compact context strip */}
          <div className="border-b border-indigo-50 bg-indigo-50/60 px-5 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-indigo-600 uppercase">
              Sign in to join
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
              {event.title}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              You&apos;ll be taken to this event&apos;s page to finish registering.
            </p>
          </div>

          <SignIn compact redirect={`/events/discover/${event._id}`} />
        </div>
      </div>
    );
  }

  // ── View: registered confirmation ───────────────────────
  if (view === "success") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <span className="text-3xl font-bold text-emerald-600">
              #{participantNumber ?? "✓"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">You&apos;re on the list!</h2>
          <p className="text-sm text-gray-500">
            Your registration for{" "}
            <span className="font-medium text-gray-700">{event.title}</span> is
            confirmed. This is your participant number — keep it for your
            records.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

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

          {/* Eligibility chips */}
          {(event.eligibility_criteria || []).length > 0 &&
            !event.eligibility_criteria.includes("None") && (
              <div className="mt-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  <FaUserTag /> Who can join
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {event.eligibility_criteria.map((crit) => (
                    <span
                      key={crit}
                      className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                    >
                      {crit}
                    </span>
                  ))}
                </div>
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
        {/* Footer / Join CTA */}
        <div className="shrink-0 border-t border-gray-100 p-4">
          {errorMsg && (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMsg}
            </p>
          )}
          <button
            onClick={handleJoin}
            disabled={joining || isCancelled || hasEnded}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
              isCancelled || hasEnded
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:from-violet-700 hover:to-indigo-700 active:scale-[0.99]"
            }`}
          >
            {isCancelled
              ? "This event is cancelled"
              : hasEnded
                ? "This event has ended"
                : joining
                  ? "Registering..."
                  : isAuthenticated
                    ? "Join Event"
                    : "Sign in to join"}
          </button>
          {!isAuthenticated && !hasEnded && !isCancelled && (
            <p className="mt-2 text-center text-xs text-gray-400">
              You&apos;ll be asked to sign in first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}