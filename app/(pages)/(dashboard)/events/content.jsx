"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendar, FaLocationArrow } from "react-icons/fa";

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
  const [assignedParticipantNumber, setAssignedParticipantNumber] =
    useState(null);

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
    const end = evt.end_date || evt.start_date || evt.date;
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  };

  const upcomingRegistered = useMemo(
    () => registeredEvents.filter((evt) => !isPast(evt)),
    [registeredEvents],
  );

  const pastRegistered = useMemo(
    () => registeredEvents.filter((evt) => isPast(evt)),
    [registeredEvents],
  );

  const discoverEvents = useMemo(() => {
    return (allEvents || [])
      .filter((evt) => !isPast(evt))
      .filter((evt) => !registeredIds.has(evt._id))
      .filter((evt) => !createdIds.has(evt._id))
      .sort(
        (a, b) =>
          new Date(a.start_date || a.date).getTime() -
          new Date(b.start_date || b.date).getTime(),
      )
      .slice(0, 4);
  }, [allEvents, registeredIds, createdIds]);

  const formatRange = (start, end) => {
    if (!start) return "No date";
    const startStr = new Date(start).toLocaleString();
    if (!end) return startStr;
    return `${startStr} - ${new Date(end).toLocaleString()}`;
  };

  const renderCards = (list, emptyText) => {
    if (list.length === 0) {
      return (
        <div className="p-4 rounded border border-gray-200 text-gray-500">
          {emptyText}
        </div>
      );
    }

    const posterUrl = (evt) =>
      evt?.event_poster?.url || evt?.eventPoster?.url || evt?.poster?.url || "";

    const formatRange = (evt) => {
      let startDates = evt.start_dates || [];
      let endDates = evt.end_dates || [];

      if (Array.isArray(startDates) && startDates.length > 0) {
        return startDates.map((startDate, index) => {
          const dayNumber = index + 1;
          const endDate = endDates[index];
          const startStr = new Date(startDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const timeStart = new Date(startDate).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          if (!endDate) {
            return (
              <div key={index}>
                Day {dayNumber}: {startStr} {timeStart}
              </div>
            );
          }

          const timeEnd = new Date(endDate).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={index}>
              <div className="flex flex-row gap-2 items-center">
                <FaCalendar />
                Day {dayNumber}: {startStr} {timeStart} - {timeEnd}
              </div>
            </div>
          );
        });
      }
    };

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((evt) => (
          <div
            key={evt._id}
            className="text-left rounded-lg border border-gray-200 bg-white hover:shadow-md transition space-y-2 cursor-pointer"
            onClick={() => router.push(`/events/discover/${evt._id}`)}
          >
            {posterUrl(evt) && (
              <img
                src={posterUrl(evt)}
                alt={evt.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{evt.title}</h3>
              <p className="text-sm text-gray-600 flex flex-col mb-2">
                {formatRange(evt)}
              </p>
              {evt.venue && (
                <p className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                  <FaLocationArrow />
                  {evt.venue}
                </p>
              )}
              {evt.description && (
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                  {evt.description}
                </p>
              )}

              {(() => {
                const entry = evt.participant_numbers?.find(
                  (p) =>
                    (p.user_id?._id || p.user_id)?.toString() ===
                    userId?.toString(),
                );
                return entry?.number ? (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 mb-1">
                    Participant{" "}
                    <span className="font-bold">#{entry.number}</span>
                  </div>
                ) : null;
              })()}

              <div className="flex flex-wrap gap-2 pt-1">
                {["interested", "not_interested", "going"].map((s) => {
                  const current = getUserStatus(evt);
                  const labels = {
                    interested: "Interested",
                    not_interested: "Not Interested",
                    going: "Going",
                  };
                  const active = current === s;
                  <div className="text-xs text-gray-600 flex gap-4">
                    <span>Interested: {evt.interested_users?.length || 0}</span>
                    <span>
                      Not Interested: {evt.not_interested_users?.length || 0}
                    </span>
                    <span>Going: {evt.registered_users?.length || 0}</span>
                  </div>;
                  const disabled = isPast(evt) || statusUpdatingId === evt._id;
                  return (
                    <button
                      key={s}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatus(evt, s);
                      }}
                      disabled={disabled}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-800 border-gray-300 hover:border-blue-400"
                      } disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-200 disabled:cursor-not-allowed`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isUserInList = (list = [], id) =>
    list.some((u) => (u?._id || u)?.toString?.() === id?.toString());

  const getUserStatus = (evt) => {
    if (!evt || !userId) return null;
    if (isUserInList(evt.registered_users, userId)) return "going";
    if (isUserInList(evt.interested_users, userId)) return "interested";
    if (isUserInList(evt.not_interested_users, userId)) return "not_interested";
    return null;
  };

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

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading events...</div>
    );
  }

  return (
    <div className=" max-w-5xl mx-auto p-5 font-sans space-y-10">
      {showParticipantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-screen">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 text-center">
            <div className="text-5xl font-bold text-blue-600">
              #{assignedParticipantNumber}
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              You&apos;re on the lists!
            </h2>
            <p className="text-gray-500 text-sm">
              This is your participant number for this event.
            </p>
            <button
              onClick={() => setShowParticipantModal(false)}
              className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Events</h1>
      </div>

      <div className="border-b border-gray-200 flex justify-end gap-4">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 px-2 -mb-px border-b-2 text-sm font-medium transition ${
            activeTab === "upcoming"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Upcoming ({upcomingRegistered.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`pb-3 px-2 -mb-px border-b-2 text-sm font-medium transition ${
            activeTab === "past"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Past ({pastRegistered.length})
        </button>
      </div>

      {error && (
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {activeTab === "upcoming" && (
        <section className="space-y-4">
          {renderCards(upcomingRegistered, "No upcoming registered events.")}
        </section>
      )}

      {activeTab === "past" && (
        <section className="space-y-4">
          {renderCards(pastRegistered, "No past registered events.")}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Discover Events</h2>
            <span className="text-md text-gray-500">
              {discoverEvents.length}
            </span>
          </div>
          <button
            className="text-blue-500"
            onClick={() => router.push("/events/discover")}
          >
            View All
          </button>
        </div>

        {renderCards(discoverEvents, "No available events to discover.")}
      </section>
    </div>
  );
}
