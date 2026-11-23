"use client";

import axios from "axios";
import { canManageEvent as canManageEventRule } from "@/data/lib/eventAccess";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarDay,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
} from "react-icons/fa";
import DayDetailsPanel from "./components/DayDetailsPanel";
import { calendarStatus, eventDayKeys, manilaToday } from "./calendarDates";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_SPAN_DAYS = 62;

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;


const getEventStatus = calendarStatus;

export default function EventCalendarContent() {
  const router = useRouter();
  /* Manila's today, so the highlighted day is the university's day. */
  const today = useMemo(() => manilaToday(), []);

  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month); // 0-11
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(() => today.key);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState("");

  /* Only the weeks the grid shows (plus a margin for multi-day events),
     instead of every event in the system on every visit. */
  /* Each load gets a number; only the latest one may write. Clicking Next
     twice quickly let the slower, older month overwrite the newer one. */
  const loadSeq = useRef(0);
  const loadEvents = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError("");
    try {
      const pad = (n) => String(n).padStart(2, "0");
      const from = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
      const to = new Date(Date.UTC(viewYear, viewMonth + 2, 0));
      const iso = (d) =>
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      const res = await axios.get("/api/events", {
        params: { from: iso(from), to: iso(to) },
      });
      if (seq !== loadSeq.current) return;
      setEvents(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(
        err?.response?.data?.message || "Failed to load events. Please try again.",
      );
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile");
        setCurrentUser({
          id: res.data?.user?._id?.toString() || "",
          role: res.data?.user?.role || "",
        });
      } catch (err) {
        setCurrentUser(null);
      }
    };
    loadProfile();
  }, []);

  /* The shared rule (creator or Admin), as the event API enforces it. */
  const canManageEvent = useCallback(
    (event) =>
      Boolean(currentUser?.id) &&
      canManageEventRule({ _id: currentUser.id, role: currentUser.role }, event),
    [currentUser],
  );

  /* Selecting a date always keeps a day in view (no toggle-off) */
  const selectDate = (key) => {
    if (!key) return;
    setSelectedKey(key);
    setExpandedEventId("");
  };

  const handleToggleExpand = (eventId) => {
    setExpandedEventId((prev) => (prev === eventId ? "" : eventId));
  };

  /* Only owners/Admins have a manage destination in this route group */
  const handleManageEvent = (event) => {
    if (!event?._id || !canManageEvent(event)) return;
    router.push(`/events-list/${event._id}`);
  };

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const event of events) {
      for (const key of eventDayKeys(event, MAX_SPAN_DAYS)) {
        (map[key] ||= []).push(event);
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

  /* Distinct events with a day in this month. It counted days that had
     events, so three events on one day read "1 event". */
  const monthEventCount = useMemo(() => {
    const ids = new Set();
    cells
      .filter((c) => c.inMonth)
      .forEach((c) =>
        (eventsByDay[c.key] || []).forEach((ev) => ids.add(String(ev?._id))),
      );
    return ids.size;
  }, [cells, eventsByDay]);

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
    setViewYear(today.year);
    setViewMonth(today.month);
    selectDate(today.key);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0 lg:items-start animate-fade-in">
      <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary-700 to-secondary-500 flex items-center justify-center text-white shadow-lg shadow-secondary-200">
              <FaCalendarDay size={18} />
            </span>
            Event Calendar
          </h1>
          <p className="text-fg-muted text-sm mt-1">
            All events on a monthly calendar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="touch-target h-9 w-9 rounded-lg border border-line bg-white text-fg-4 hover:bg-subtle flex items-center justify-center transition-colors"
            aria-label="Previous month"
          >
            <FaChevronLeft size={13} />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-fg">
            {MONTH_LABELS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="touch-target h-9 w-9 rounded-lg border border-line bg-white text-fg-4 hover:bg-subtle flex items-center justify-center transition-colors"
            aria-label="Next month"
          >
            <FaChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-700 hover:bg-secondary-100 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="lg:col-span-12 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-4">
        <span className="font-medium text-fg-muted uppercase tracking-wider">
          {loading ? "Loading…" : `${monthEventCount} event${monthEventCount === 1 ? "" : "s"} this month`}
        </span>
        {[
          { label: "Upcoming", dot: "bg-secondary-500" },
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
        <div className="lg:col-span-12 flex items-center justify-between rounded-xl border border-danger-border bg-danger-subtle px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={loadEvents}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="lg:col-span-8 rounded-2xl border border-line-subtle bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line-subtle bg-subtle/70">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center gap-3 text-fg-muted text-sm">
            <FaSpinner className="animate-spin text-secondary-500" size={18} />
            Loading calendar…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const dayEvents = eventsByDay[cell.key] || [];
              const isToday = cell.key === today.key;
              const isSelected = cell.key === selectedKey;
              return (
                <button
                  type="button"
                  key={cell.key}
                  onClick={() => selectDate(cell.key)}
                  className={`min-h-[92px] border-b border-r border-line-subtle p-1.5 text-left align-top transition-colors last:border-r-0 ${
                    cell.inMonth ? "bg-white" : "bg-subtle/50"
                  } ${isSelected ? "ring-2 ring-inset ring-secondary-500" : "hover:bg-secondary-50/40"}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                      isToday
                        ? "bg-secondary-600 text-white"
                        : cell.inMonth
                          ? "text-fg-3"
                          : "text-fg-muted"
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
                          selectDate(cell.key);
                          setExpandedEventId(event._id);
                        }}
                        className={`mt-0.5 flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer ${st.chip}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                        <span className="truncate">{event.title}</span>
                      </span>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="mt-0.5 block text-xs text-fg-muted font-medium">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <aside className="lg:col-span-4 lg:sticky lg:top-20">
        <DayDetailsPanel
          selectedKey={selectedKey}
          events={selectedEvents}
          loading={loading}
          expandedEventId={expandedEventId}
          onToggleExpand={handleToggleExpand}
          canManageEvent={canManageEvent}
          onManage={handleManageEvent}
        />
      </aside>
    </div>
  );
}




