"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarDay,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaMapMarkerAlt,
  FaRegClock,
  FaSpinner,
} from "react-icons/fa";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_SPAN_DAYS = 62;

const getEventStart = (e) =>
  e.start_date || (Array.isArray(e.start_dates) ? e.start_dates[0] : null) || e.date || null;

const getEventEnd = (e) =>
  e.end_date ||
  (Array.isArray(e.end_dates) ? e.end_dates[e.end_dates.length - 1] : null) ||
  getEventStart(e);

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const sameDay = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtTime = (d) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

function getEventStatus(e) {
  if (e.status === "cancelled")
    return { label: "Cancelled", dot: "bg-red-500", chip: "bg-red-50 text-red-700 hover:bg-red-100" };
  if (e.status === "completed")
    return { label: "Completed", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" };

  const start = getEventStart(e);
  const end = getEventEnd(e);
  if (!start)
    return { label: "Unknown", dot: "bg-gray-400", chip: "bg-gray-50 text-gray-600 hover:bg-gray-100" };

  const now = Date.now();
  const startT = new Date(start).getTime();
  const endT = new Date(end).getTime();

  if (endT < now)
    return { label: "Past", dot: "bg-gray-400", chip: "bg-gray-50 text-gray-600 hover:bg-gray-100" };
  if (startT <= now)
    return { label: "Ongoing", dot: "bg-green-500", chip: "bg-green-50 text-green-700 hover:bg-green-100" };
  return { label: "Upcoming", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 hover:bg-blue-100" };
}

export default function EventCalendarContent() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/events");
      setEvents(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load events. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const event of events) {
      const start = new Date(getEventStart(event) || 0);
      const end = new Date(getEventEnd(event) || 0);
      if (Number.isNaN(start.getTime())) continue;
      const safeEnd = Number.isNaN(end.getTime()) || end < start ? start : end;
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(safeEnd.getFullYear(), safeEnd.getMonth(), safeEnd.getDate());
      let steps = 0;
      while (cursor <= last && steps < MAX_SPAN_DAYS) {
        const key = dateKey(cursor);
        (map[key] ||= []).push(event);
        cursor.setDate(cursor.getDate() + 1);
        steps += 1;
      }
    }
    return map;
  }, [events]);

  /* Grid cells for the visible month (always full weeks) */
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(viewYear, viewMonth, i - first.getDay() + 1);
      return { date: d, key: dateKey(d), inMonth: d.getMonth() === viewMonth };
    });
  }, [viewYear, viewMonth]);

  const monthEventCount = useMemo(
    () =>
      cells.filter((c) => c.inMonth && (eventsByDay[c.key] || []).length > 0)
        .length,
    [cells, eventsByDay],
  );

  const selectedEvents = useMemo(
    () => eventsByDay[selectedKey] || [],
    [eventsByDay, selectedKey],
  );

  const goPrev = () => {
    const m = viewMonth - 1;
    if (m < 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth(m);
  };
  const goNext = () => {
    const m = viewMonth + 1;
    if (m > 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth(m);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedKey(dateKey(today));
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FaCalendarDay size={18} />
            </span>
            Event Calendar
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            All events on a monthly calendar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors"
            aria-label="Previous month"
          >
            <FaChevronLeft size={13} />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-gray-900">
            {MONTH_LABELS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors"
            aria-label="Next month"
          >
            <FaChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
        <span className="font-medium text-gray-400 uppercase tracking-wider">
          {loading ? "Loading…" : `${monthEventCount} event${monthEventCount === 1 ? "" : "s"} this month`}
        </span>
        {[
          { label: "Upcoming", dot: "bg-blue-500" },
          { label: "Ongoing", dot: "bg-green-500" },
          { label: "Past", dot: "bg-gray-400" },
          { label: "Cancelled", dot: "bg-red-500" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
            {l.label}
          </span>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadEvents}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center gap-3 text-gray-400 text-sm">
            <FaSpinner className="animate-spin text-blue-500" size={18} />
            Loading calendar…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const dayEvents = eventsByDay[cell.key] || [];
              const isToday = sameDay(cell.date, today);
              const isSelected = cell.key === selectedKey;
              return (
                <button
                  type="button"
                  key={cell.key}
                  onClick={() =>
                    setSelectedKey((prev) => (prev === cell.key ? "" : cell.key))
                  }
                  className={`min-h-[92px] border-b border-r border-gray-100 p-1.5 text-left align-top transition-colors last:border-r-0 ${
                    cell.inMonth ? "bg-white" : "bg-gray-50/50"
                  } ${isSelected ? "ring-2 ring-inset ring-blue-500" : "hover:bg-blue-50/40"}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : cell.inMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>

                  {dayEvents.slice(0, 2).map((event) => {
                    const st = getEventStatus(event);
                    return (
                      <span
                        key={event._id}
                        title={event.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/events-list/${event._id}`);
                        }}
                        className={`mt-0.5 flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer ${st.chip}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                        <span className="truncate">{event.title}</span>
                      </span>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="mt-0.5 block text-[10px] text-gray-400 font-medium">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedKey && !loading && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {new Date(`${selectedKey}T00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>

          {selectedEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No events on this day.
            </p>
          ) : (
            <ul className="space-y-3">
              {selectedEvents.map((event) => {
                const st = getEventStatus(event);
                const start = new Date(getEventStart(event));
                const end = new Date(getEventEnd(event));
                const validTimes =
                  !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());
                const hasTime =
                  validTimes &&
                  (start.getHours() !== 0 ||
                    start.getMinutes() !== 0 ||
                    end.getHours() !== 0 ||
                    end.getMinutes() !== 0);
                return (
                  <li
                    key={event._id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${st.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                        {validTimes && (
                          <span className="flex items-center gap-1">
                            <FaRegClock size={11} />
                            {hasTime
                              ? `${fmtTime(start)} – ${fmtTime(end)}`
                              : "All day"}
                          </span>
                        )}
                        {event.venue && (
                          <span className="flex items-center gap-1">
                            <FaMapMarkerAlt size={11} />
                            {event.venue}
                          </span>
                        )}
                        <span className="font-medium">{st.label}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/events-list/${event._id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                    >
                      <FaEye size={11} />
                      View
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}




