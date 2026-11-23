"use client";

import { useState } from "react";
import { activityPillClasses } from "@/data/lib/activityTypeColors";
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
import {
  calendarStatus,
  eventDateRangeLabel,
  eventTimeLabel,
} from "../calendarDates";
import Button from "@/components/ui/Button";


const getStatusBadge = calendarStatus;
const getTimeLabel = eventTimeLabel;
const fmtDateRange = eventDateRangeLabel;

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
    activityPillClasses(event.type_of_activity);
  const organizerName = getOrganizerName(event);
  const offices = [
    ...(event.organizing_office_unit || []),
    ...(event.co_organizing_office_unit || []),
  ];
  const registeredCount = event.attended_count || 0;

  return (
    <li
      className={`overflow-hidden rounded-xl border transition-colors ${
        expanded
          ? "border-secondary-200 bg-secondary-50/30"
          : "border-line-subtle bg-subtle/50 hover:border-line"
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
          <span className="block truncate text-sm font-medium text-fg">
            {event.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
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
        <span className="mt-1 shrink-0 text-fg-muted">
          {expanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-secondary-100 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}
            >
              {status.label}
            </span>
            {event.type_of_activity && (
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${activityCls}`}
              >
                {event.type_of_activity}
              </span>
            )}
            {event.reference_number && (
              <span
                className="rounded-full border border-line bg-subtle px-2.5 py-1 font-mono text-2xs font-medium text-fg-muted"
                title="Event reference number"
              >
                {event.reference_number}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {dateRange && (
              <div className="flex items-start gap-2 text-xs text-fg-4">
                <FaCalendarAlt className="mt-0.5 shrink-0 text-fg-muted" />
                <span>{dateRange}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-fg-4">
              <FaRegClock className="mt-0.5 shrink-0 text-fg-muted" />
              <span>{timeLabel || "Time TBD"}</span>
            </div>
            {offices.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-fg-4">
                <FaBuilding className="mt-0.5 shrink-0 text-fg-muted" />
                <span>{offices.join(", ")}</span>
              </div>
            )}
            {registeredCount > 0 && (
              <div className="flex items-start gap-2 text-xs text-fg-4">
                <FaUsers className="mt-0.5 shrink-0 text-fg-muted" />
                <span>{registeredCount} registered</span>
              </div>
            )}
            {organizerName && (
              <div className="flex items-start gap-2 text-xs text-fg-4">
                <FaUserTag className="mt-0.5 shrink-0 text-fg-muted" />
                <span>Organized by {organizerName}</span>
              </div>
            )}
          </div>

          {event.description && (
            <div className="border-t border-secondary-100 pt-3">
              <p
                className={`text-xs leading-relaxed whitespace-pre-line text-fg-4 ${
                  descExpanded ? "" : "line-clamp-4"
                }`}
              >
                {event.description}
              </p>
              {event.description.length > 140 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 transition-colors hover:text-secondary-700"
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
            <Button
              variant="primary"
              className="w-full"
              type="button"
              onClick={() => onManage(event)}
            >
              Manage event
            </Button>
          ) : (
            <p className="text-center text-xs text-fg-muted">
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
    <div className="rounded-2xl border border-line-subtle bg-white shadow-sm">
      <div className="border-b border-line-subtle px-5 py-4">
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
          Selected date
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-fg">
          {dateLabel}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-line-subtle bg-subtle/50 px-4 py-3"
            >
              <div className="h-3 w-2/3 rounded bg-emphasis" />
              <div className="mt-2 h-2.5 w-1/2 rounded bg-emphasis" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-fg-faint">
            <FaRegCalendarTimes size={20} />
          </span>
          <p className="mt-3 text-sm font-medium text-fg-4">
            No events on this day.
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            Select another date on the calendar to see its events.
          </p>
        </div>
      ) : (
        <>
          <p className="px-5 pt-4 text-2xs font-semibold uppercase tracking-wider text-fg-muted">
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