"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaCalendar,
  FaLocationArrow,
  FaClock,
  FaUserCheck,
  FaHeart,
  FaRegHeart,
  FaTimes,
  FaCheck,
  FaSearch,
  FaChevronRight,
  FaEye,
  FaFilter,
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

const ACTIVITY_TYPES = [
  "All",
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
  "Others",
];

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
    return <span className="text-gray-400 text-xs">No date set</span>;
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

  return (
    <div className="space-y-0.5">
      {startDates.map((start, index) => {
        const end = endDates[index];
        const dayNum = index + 1;
        const dateStr = formatDate(start);
        const startTime = formatTime(start);
        return (
          <div key={index} className="flex items-center gap-1.5 text-xs text-gray-500">
            <FaCalendar className="shrink-0 text-gray-400" />
            <span>Day {dayNum}: {dateStr}{startTime ? `, ${startTime}` : ""}{end ? ` - ${formatTime(end)}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function EventCard({ event, userId, onStatusClick, statusUpdatingId, onClick }) {
  const posterUrl = event?.event_poster?.url || event?.eventPoster?.url || event?.poster?.url || "";
  const status = !userId ? null : (() => {
    const uid = userId?.toString();
    if ((event.registered_users || []).some(u => (u?._id || u)?.toString() === uid)) return "going";
    if ((event.interested_users || []).some(u => (u?._id || u)?.toString() === uid)) return "interested";
    if ((event.not_interested_users || []).some(u => (u?._id || u)?.toString() === uid)) return "not_interested";
    return null;
  })();

  const isPast = (() => {
    const end = event.end_dates?.[event.end_dates?.length - 1] || event.start_dates?.[0] || event.date;
    return end ? new Date(end).getTime() < Date.now() : false;
  })();

  const isCancelled = event.status === "cancelled";
  const isDisabled = isPast || isCancelled || statusUpdatingId === event._id;

  const participantEntry = (event.participant_numbers || []).find(
    (p) => (p.user_id?._id || p.user_id)?.toString() === userId?.toString()
  );

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onClick(event._id)}
    >
      {/* Status banners */}
      {isCancelled && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1">
          Cancelled
        </div>
      )}

      {/* Poster */}
      {posterUrl ? (
        <div className={`relative ${isCancelled ? "mt-7" : ""}`}>
          <img src={posterUrl} alt={event.title} className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className={`h-2 bg-gradient-to-r from-indigo-50 to-purple-50 ${isCancelled ? "mt-7" : ""}`} />
      )}

      <div className="p-4 space-y-3">
        {/* Title & Activity Type */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
            {event.title}
          </h3>
          {event.type_of_activity && (
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              ACTIVITY_COLORS[event.type_of_activity] || "bg-gray-50 text-gray-700 border-gray-200"
            }`}>
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
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{event.description}</p>
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
                disabled={isDisabled}
                onClick={(e) => { e.stopPropagation(); onStatusClick(event, key); }}
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

        {/* Stats & View link */}
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

function EmptyState({ icon, title, description }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-300">{icon}</div>
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );
}

export default function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [createdIds, setCreatedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [assignedParticipantNumber, setAssignedParticipantNumber] = useState(null);
  const [showQrPrompt, setShowQrPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    const load = async () => {
      try {
        let uid = null;
        try {
          const profileRes = await axios.get("/api/profile/my-profile");
          uid = profileRes.data?.user?._id || null;
          setUserId(uid);
        } catch (profileErr) {
          const status = profileErr?.response?.status;
          if (status !== 401 && status !== 403) throw profileErr;
          setUserId(null);
        }

        const [eventsRes, userEventsRes] = await Promise.all([
          axios.get("/api/events"),
          uid
            ? axios.get(`/api/events/user-events?user_id=${uid}`)
            : Promise.resolve({ data: { participatedEvents: [], createdEvents: [] } }),
        ]);

        setAllEvents(eventsRes.data?.data || []);

        const participated = userEventsRes.data?.participatedEvents || [];
        const created = userEventsRes.data?.createdEvents || [];

        const seen = new Set();
        const registered = [...participated].filter((evt) => {
          if (!evt || !evt._id) return false;
          if (seen.has(evt._id)) return false;
          seen.add(evt._id);
          return true;
        });

        setRegisteredEvents(registered);
        setCreatedIds(new Set(created.map((evt) => evt._id)));
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load events. Please retry.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (searchParams?.get("qr") === "1") {
      setShowQrPrompt(true);
    }
  }, [searchParams]);

  const handleQrYesAccount = () => {
    setShowQrPrompt(false);
    if (userId) return;
    router.push("/authentication/signin?redirect=/events/discover?qr=1");
  };

  const handleQrNoAccount = () => {
    setShowQrPrompt(false);
    router.push("/profile-registration");
  };

  const registeredIds = useMemo(
    () => new Set(registeredEvents.map((evt) => evt._id)),
    [registeredEvents],
  );

  const discoverEvents = useMemo(() => {
    let filtered = (allEvents || [])
      .filter((evt) => evt.status !== "cancelled")
      .filter((evt) => !registeredIds.has(evt._id))
      .filter((evt) => !createdIds.has(evt._id));

    // Type filter
    if (filterType !== "All") {
      filtered = filtered.filter((evt) => evt.type_of_activity === filterType);
    }

    // Search filter
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
  }, [allEvents, registeredIds, createdIds, searchQuery, filterType]);

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
          (p) => (p.user_id?._id || p.user_id)?.toString() === userId?.toString(),
        );
        if (entry?.number) {
          setAssignedParticipantNumber(entry.number);
          setShowParticipantModal(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status. Please try again.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

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
    <div className="mx-auto p-5 space-y-8 max-w-5xl">
      {/* Participant Modal */}
      {showParticipantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-screen">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-indigo-50 flex items-center justify-center">
              <span className="text-3xl font-bold text-indigo-600">#{assignedParticipantNumber}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">You're on the list!</h2>
            <p className="text-gray-500 text-sm">
              This is your participant number for this event. Keep this for your records.
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

      {/* QR Prompt Modal */}
      {showQrPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Do you have an account?</h2>
            <p className="text-sm text-gray-600">
              We use your account to personalize your event experience. If you do not have one, we will take you to the quick survey.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
              <button
                onClick={handleQrNoAccount}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                No, take survey
              </button>
              <button
                onClick={handleQrYesAccount}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Yes, I have an account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
        <p className="text-sm text-gray-500 mt-1">Explore and register for upcoming events</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <FaTimes className="shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search events by title, description, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
        </div>
        <div className="relative">
          <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all cursor-pointer min-w-[140px]"
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>{type === "All" ? "All Activities" : type}</option>
            ))}
          </select>
          <FaChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] -rotate-90 pointer-events-none" />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {discoverEvents.length} event{discoverEvents.length !== 1 ? "s" : ""} available
      </div>

      {/* Event Cards */}
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
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FaEye />}
          title={searchQuery || filterType !== "All" ? "No events match your filters" : "No available events to discover"}
          description={searchQuery || filterType !== "All" ? "Try different search terms or clear the filters." : "Check back later for new events."}
        />
      )}
    </div>
  );
}