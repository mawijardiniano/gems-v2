"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendar,
  FaLocationArrow,
  FaClock,
  FaUserCheck,
  FaHeart,
  FaRegHeart,
  FaTimes,
  FaCheck,
  FaTag,
  FaChevronRight,
  FaEye,
  FaSearch,
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

function DateRangeDisplay({ event }) {
  const startDates = event.start_dates || [];
  const endDates = event.end_dates || [];

  if (startDates.length === 0) {
    return <span className="text-gray-400">No date set</span>;
  }

  if (startDates.length === 1) {
    const start = startDates[0];
    const end = endDates[0];
    const startDate = formatDate(start);
    const startTime = formatTime(start);

    if (!end) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FaCalendar className="shrink-0 text-gray-400" />
          <span>{startDate} at {startTime}</span>
        </div>
      );
    }

    const endTime = formatTime(end);
    const endDate = formatDate(end);

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

  // Multiple days
  return (
    <div className="space-y-1">
      {startDates.map((start, index) => {
        const end = endDates[index];
        const dayNum = index + 1;
        const dateStr = formatDate(start);
        const startTime = formatTime(start);

        return (
          <div key={index} className="flex items-center gap-1.5 text-xs text-gray-500">
            <FaCalendar className="shrink-0 text-gray-400" />
            <span>
              Day {dayNum}: {dateStr}{startTime ? `, ${startTime}` : ""}
              {end ? ` - ${formatTime(end)}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EventCard({ event, userId, onStatusClick, statusUpdatingId, onClick, isPast }) {
  const posterUrl = event?.event_poster?.url || event?.eventPoster?.url || event?.poster?.url || "";
  const status = !userId ? null : (() => {
    const userIdStr = userId?.toString();
    if ((event.registered_users || []).some(u => (u?._id || u)?.toString() === userIdStr)) return "going";
    if ((event.interested_users || []).some(u => (u?._id || u)?.toString() === userIdStr)) return "interested";
    if ((event.not_interested_users || []).some(u => (u?._id || u)?.toString() === userIdStr)) return "not_interested";
    return null;
  })();

  const isCancelled = event.status === "cancelled";
  const isCompleted = event.status === "completed";
  const isDisabledEvent = isPast || isCancelled || statusUpdatingId === event._id;

  const participantEntry = (event.participant_numbers || []).find(
    (p) => (p.user_id?._id || p.user_id)?.toString() === userId?.toString()
  );

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
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
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
            {event.title}
          </h3>
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

        {/* Participant number badge */}
        {participantEntry?.number && (
          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
            <FaUserCheck className="text-[10px]" />
            Participant #{participantEntry.number}
          </div>
        )}

        {/* Status action buttons */}
        <div className="flex items-center gap-2 pt-1">
          {[
            { key: "interested", label: "Interested", activeIcon: <FaHeart className="text-[10px]" />, inactiveIcon: <FaRegHeart className="text-[10px]" /> },
            { key: "going", label: "Going", activeIcon: <FaCheck className="text-[10px]" />, inactiveIcon: <FaCheck className="text-[10px]" /> },
            { key: "not_interested", label: "Not Interested", activeIcon: <FaTimes className="text-[10px]" />, inactiveIcon: <FaTimes className="text-[10px]" /> },
          ].map(({ key, label, activeIcon, inactiveIcon }) => {
            const active = status === key;
            return (
              <button
                key={key}
                disabled={isDisabledEvent}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusClick(event, key);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  active
                    ? key === "going"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : key === "interested"
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {active ? activeIcon : inactiveIcon}
                {label}
              </button>
            );
          })}
        </div>

        {/* View details link */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span title="Interested">
              <FaHeart className="inline mr-0.5 text-rose-400" /> {event.interested_users?.length || 0}
            </span>
            <span title="Going">
              <FaUserCheck className="inline mr-0.5 text-emerald-500" /> {event.registered_users?.length || 0}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
            View Details <FaChevronRight className="text-[8px]" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EventContent({
  participatedEvents = [],
  invitedEvents = [],
  createdEvents = [],
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [assignedParticipantNumber, setAssignedParticipantNumber] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setRegisteredEvents(participatedEvents || []);
  }, [participatedEvents]);

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

  const isPast = (evt) => {
    const end = evt.end_dates?.[evt.end_dates?.length - 1] || evt.start_dates?.[0] || evt.date;
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  };

  const isCancelled = (evt) => evt.status === "cancelled";

  const upcomingRegistered = useMemo(
    () => registeredEvents
      .filter((evt) => !isPast(evt))
      .sort((a, b) => new Date(a.start_dates?.[0] || a.date).getTime() - new Date(b.start_dates?.[0] || b.date).getTime()),
    [registeredEvents],
  );

  const pastRegistered = useMemo(
    () => registeredEvents
      .filter((evt) => isPast(evt))
      .sort((a, b) => {
        const aEnd = a.end_dates?.[a.end_dates?.length - 1] || a.start_dates?.[0] || a.date;
        const bEnd = b.end_dates?.[b.end_dates?.length - 1] || b.start_dates?.[0] || b.date;
        return new Date(bEnd).getTime() - new Date(aEnd).getTime();
      }),
    [registeredEvents],
  );

  const discoverEvents = useMemo(() => {
    let filtered = (allEvents || [])
      .filter((evt) => evt.status !== "cancelled")
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
      (a, b) =>
        new Date(a.start_dates?.[0] || a.date).getTime() -
        new Date(b.start_dates?.[0] || b.date).getTime(),
    );
  }, [allEvents, registeredIds, createdIds, searchQuery]);

  const isUserInList = (list = [], id) =>
    list.some((u) => (u?._id || u)?.toString?.() === id?.toString());

  const updateEventInLists = (updated) => {
    setAllEvents((prev) =>
      prev.map((e) => (e._id === updated._id ? updated : e)),
    );

    setRegisteredEvents((prev) => {
      const going = isUserInList(updated.registered_users, userId);
      const exists = prev.some((e) => e._id === updated._id);
      if (going && !exists) return [...prev, updated];
      if (!going && exists) return prev.filter((e) => e._id !== updated._id);
      return prev.map((e) => (e._id === updated._id ? updated : e));
    });
  };

  const handleStatus = async (evt, status) => {
    if (!evt || !evt._id) return;
    if (!userId) {
      setError("You need to be logged in to set a status.");
      return;
    }

    setStatusUpdatingId(evt._id);
    try {
      const res = await axios.post("/api/events/participation", {
        event_id: evt._id,
        user_id: userId,
        status,
      });

      const updatedEvent = res.data?.event || evt;
      updateEventInLists(updatedEvent);
      if (status === "going" || status === "interested") {
        const entry = updatedEvent?.participant_numbers?.find(
          (p) =>
            (p.user_id?._id || p.user_id)?.toString() === userId?.toString(),
        );
        if (entry?.number) {
          setAssignedParticipantNumber(entry.number);
          setShowParticipantModal(true);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update status. Please try again.",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

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
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-5 space-y-8">
      {/* Participant Modal */}
      {showParticipantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-screen">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-indigo-50 flex items-center justify-center">
              <span className="text-3xl font-bold text-indigo-600">#{assignedParticipantNumber}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">You're on the list!</h2>
            <p className="text-gray-500 text-sm">
              Thank You for choosing the College of Information and Computing Sciences. Your attendance is expected. See you there.
            </p>
            <button
              onClick={() => setShowParticipantModal(false)}
              className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 w-full font-medium text-sm transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

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
                ? "border-indigo-600 text-indigo-600"
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
                ? "border-indigo-600 text-indigo-600"
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
                  userId={userId}
                  onStatusClick={handleStatus}
                  statusUpdatingId={statusUpdatingId}
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
                  userId={userId}
                  onStatusClick={handleStatus}
                  statusUpdatingId={statusUpdatingId}
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
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
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
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
        </div>

        {discoverEvents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {discoverEvents.map((evt) => (
              <EventCard
                key={evt._id}
                event={evt}
                userId={userId}
                onStatusClick={handleStatus}
                statusUpdatingId={statusUpdatingId}
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