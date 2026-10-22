"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FaHistory, FaSpinner, FaUserTie } from "react-icons/fa";
import { getOfficialPersonName } from "@/lib/universityOfficialsMerge";

/**
 * The tenure trail of one seat, expanded beneath its row in the roster table.
 *
 * WHAT THIS ANSWERS
 * The roster table shows who holds a seat *this year*. This panel shows everyone
 * who ever held it, in order, with the dates of each span — so "who was the
 * president in 2024-2025" is answerable from the page instead of from the
 * database.
 *
 * WHERE THE DATA COMES FROM
 * `/api/university-officials/history?header=&name=`, which reads OfficialTerm
 * (real start/end spans) and merges the activity-log handovers that happened
 * *within* a span. It is fetched lazily, on first expand, because most seats are
 * never opened and the trail is not needed to render the table.
 *
 * @param {{ header: string, name: string }} seat
 */
export default function SeatHistoryPanel({ header, name }) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });

  const load = useCallback(async () => {
    setState((prev) => (prev.status === "loading" ? prev : { ...prev, status: "loading" }));
    try {
      const res = await fetch(
        `/api/university-officials/history?header=${encodeURIComponent(header)}&name=${encodeURIComponent(name)}`,
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setState({ status: "done", data: body.data, error: "" });
    } catch (err) {
      setState({ status: "error", data: null, error: err.message || "Failed to load history" });
    }
  }, [header, name]);

  /* Lazy: nothing is requested until the panel actually mounts, which happens
     only when the user clicks History on a seat. */
  useEffect(() => {
    load();
  }, [load]);

  const entries = state.data?.roster || [];
  const turnover = state.data?.turnover || [];

  return (
    <div className="bg-gray-50/70 border-t border-gray-100 px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <FaHistory className="h-3.5 w-3.5 text-gray-400" />
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Tenure history — {name}
        </h4>
      </div>

      {state.status === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <FaSpinner className="h-3.5 w-3.5 animate-spin" />
          Loading history…
        </p>
      ) : state.status === "error" ? (
        <div className="text-sm text-red-600">
          {state.error}
          <button
            type="button"
            onClick={load}
            className="ml-2 text-xs font-medium text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">
          {state.data?.seat_exists === false
            ? "This seat is not registered in Positions, so it has no history."
            : "No one has held this seat yet."}
        </p>
      ) : (
        <ol className="space-y-2.5">
          {entries.map((entry) => (
            <HistoryRow key={String(entry._id)} entry={entry} />
          ))}
        </ol>
      )}

      {turnover.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Recorded handovers
          </h5>
          <ul className="space-y-1.5">
            {turnover.map((event) => (
              <li key={String(event._id)} className="text-xs text-gray-600">
                <span className="text-gray-400">{formatDate(event.createdAt)}</span>
                {" — "}
                {event.prev_name && event.new_name
                  ? `${event.prev_name} → ${event.new_name}`
                  : event.description || event.action}
                {event.academic_year ? (
                  <span className="text-gray-400"> (AY {event.academic_year})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** One span in the trail: the holder, the dates, and how long it ran. */
function HistoryRow({ entry }) {
  const person = entry.official_text
    ? getOfficialPersonName(entry.official_text)
    : "Vacant";
  return (
    <li className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0 mt-0.5">
        {entry.official_text ? (
          (person[0] || "?").toUpperCase()
        ) : (
          <FaUserTie className="h-3 w-3 text-gray-400" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm ${
              entry.official_text ? "font-medium text-gray-900" : "text-gray-500 italic"
            }`}
          >
            {person}
          </span>
          {entry.status && entry.status !== "substantive" ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 capitalize">
              {entry.status}
            </span>
          ) : null}
          {entry.isOpen ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              Current
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(entry.startDate)} → {entry.isOpen ? "present" : formatDate(entry.endDate)}
          {entry.academic_year ? ` · AY ${entry.academic_year}` : ""}
        </p>
      </div>
    </li>
  );
}

/** "Aug 1, 2025" — the day a term opened or closed. */
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
