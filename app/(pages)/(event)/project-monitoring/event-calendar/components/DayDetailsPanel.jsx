"use client";

import { useState } from "react";
import {
  FaBuilding,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronUp,
  FaMapMarkerAlt,
  FaRegCalendarTimes,
  FaRegClock,
  FaUserTag,
  FaUsers,
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

const getEventStart = (e) =>
  e?.start_date ||
  (Array.isArray(e?.start_dates) ? e.start_dates[0] : null) ||
  e?.date ||
  null;

const getEventEnd = (e) =>
  e?.end_date ||
  (Array.isArray(e?.end_dates) ? e.end_dates[e.end_dates.length - 1] : null) ||
  getEventStart(e);

function getStatusBadge(event) {
  if (event?.status === "cancelled")
    return {
      label: "Cancelled",
      dot: "bg-red-500",
      cls: "bg-red-50 text-red-700 border-red-200",
    };
  if (event?.status === "completed")
    return {
      label: "Completed",
      dot: "bg-emerald-500",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

  const start = getEventStart(event);
  const end = getEventEnd(event);
  const startT = start ? new Date(start).getTime() : NaN;
  const endT = end ? new Date(end).getTime() : NaN;
  if (Number.isNaN(startT) || Number.isNaN(endT))
    return {
      label: "Unknown",
      dot: "bg-gray-400",
      cls: "bg-gray-50 text-gray-600 border-gray-200",
    };

  const now = Date.now();
  if (endT < now)
    return {
      label: "Past",
      dot: "bg-gray-400",
      cls: "bg-gray-50 text-gray-600 border-gray-200",
    };
  if (startT <= now)
    return {
      label: "Ongoing",
      dot: "bg-green-500",
      cls: "bg-green-50 text-green-700 border-green-200",
    };
  return {
    label: "Upcoming",
    dot: "bg-blue-500",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

const fmtTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const hasTimeComponent = (value) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getHours() !== 0 || d.getMinutes() !== 0;
};

function getTimeLabel(event) {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  if (!start) return "";
  if (!hasTimeComponent(start) && !hasTimeComponent(end)) return "All day";
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

const fmtDateRange = (event) => {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  if (!start) return "";
  const opts = { month: "short", day: "numeric", year: "numeric" };
  const startStr = new Date(start).toLocaleDateString("en-US", opts);
  if (!end) return startStr;
  const endStr = new Date(end).toLocaleDateString("en-US", opts);
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
};

function getOrganizerName(event) {
  const creator = event?.created_by;
  if (!creator || typeof creator !== "object") return "";
  const info = creator.personal_info_id || {};
  const personal = info.personal || {};
  const fullName = [personal.first_name, personal.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || creator.username || "";
}

function EventRow({ event, expanded, onToggle, canManage, onManage }) {
  const [descExpanded, setDescExpanded] = useState(false);

  const status = getStatusBadge(event);
  const timeLabel = getTimeLabel(event);
  const dateRange = fmtDateRange(event);
  const activityCls =
    ACTIVITY_COLORS[event.type_of_activity] || ACTIVITY_COLORS.Others;
  const organizerName = getOrganizerName(event);
  const offices = [
    ...(event.organizing_office_unit || []),
    ...(event.co_organizing_office_unit || []),
  ];
  const eligibility = (event.eligibility_criteria || []).filter(
    (crit) => crit && crit !== "None",
  );
  const registeredCount = (event.registered_users || []).length;
  const target = event.target_number_of_participants;

  return (
    <li
      className={`overflow-hidden rounded-xl border transition-colors ${
        expanded
          ? "border-blue-200 bg-blue-50/30"
          : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(event._id)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-900">
            {event.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {timeLabel && (
              <span className="flex items-center gap-1">
                <FaRegClock size={11} />
                {timeLabel}
              </span>
            )}
            {event.venue && (
              <span className="flex max-w-full items-center gap-1">
                <FaMapMarkerAlt size={11} className="shrink-0" />
                <span className="truncate">{event.venue}</span>
              </span>
            )}
            <span className="font-medium">{status.label}</span>
          </span>
        </span>
        <span className="mt-1 shrink-0 text-gray-400">
          {expanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-blue-100 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}
            >
              {status.label}
            </span>
            {event.type_of_activity && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${activityCls}`}
              >
                {event.type_of_activity}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {dateRange && (
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <FaCalendarAlt className="mt-0.5 shrink-0 text-gray-400" />
                <span>{dateRange}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <FaRegClock className="mt-0.5 shrink-0 text-gray-400" />
              <span>{timeLabel || "Time TBD"}</span>
            </div>
            {offices.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <FaBuilding className="mt-0.5 shrink-0 text-gray-400" />
                <span>{offices.join(", ")}</span>
              </div>
            )}
            {(registeredCount > 0 || target) && (
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <FaUsers className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {registeredCount} registered
                  {target ? ` of ${target} target participants` : ""}
                </span>
              </div>
            )}
            {organizerName && (
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <FaUserTag className="mt-0.5 shrink-0 text-gray-400" />
                <span>Organized by {organizerName}</span>
              </div>
            )}
          </div>

          {eligibility.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                Who can join
              </p>
              <div className="flex flex-wrap gap-1.5">
                {eligibility.map((crit) => (
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

          {event.description && (
            <div className="border-t border-blue-100 pt-3">
              <p
                className={`text-xs leading-relaxed whitespace-pre-line text-gray-600 ${
                  descExpanded ? "" : "line-clamp-4"
                }`}
              >
                {event.description}
              </p>
              {event.description.length > 140 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  {descExpanded ? (
                    <>
                      Show less <FaChevronUp size={9} />
                    </>
                  ) : (
                    <>
                      Read more <FaChevronDown size={9} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {canManage ? (
            <button
              type="button"
              onClick={() => onManage(event)}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99]"
            >
              Manage event
            </button>
          ) : (
            <p className="text-center text-[11px] text-gray-400">
              Only the event organizer can manage this event.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function DayDetailsPanel({
  selectedKey = "",
  events = [],
  loading = false,
  expandedEventId = "",
  onToggleExpand,
  canManageEvent,
  onManage,
}) {
  const dateLabel = selectedKey
    ? new Date(`${selectedKey}T00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Select a date";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Selected date
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-gray-900">
          {dateLabel}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
            >
              <div className="h-3 w-2/3 rounded bg-gray-200" />
              <div className="mt-2 h-2.5 w-1/2 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <FaRegCalendarTimes size={20} />
          </span>
          <p className="mt-3 text-sm font-medium text-gray-600">
            No events on this day.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Select another date on the calendar to see its events.
          </p>
        </div>
      ) : (
        <>
          <p className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-3 p-5">
            {events.map((event) => (
              <EventRow
                key={event._id}
                event={event}
                expanded={expandedEventId === event._id}
                onToggle={onToggleExpand}
                canManage={canManageEvent(event)}
                onManage={onManage}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}