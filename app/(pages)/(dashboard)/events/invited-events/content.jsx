"use client";

import axios from "axios";
import { useSelector } from "react-redux";
import { useState, useEffect, useMemo } from "react";
import { FaCalendar, FaClock, FaLocationArrow } from "react-icons/fa";

export default function InvitedContent({
  participatedEvents = [],
  invitedEvents = [],
}) {
  const userId = useSelector((state) => state.auth.userId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [registered, setRegistered] = useState(
    participatedEvents.reduce((acc, e) => {
      acc[e._id] = e.registered_users?.includes(userId) || false;
      return acc;
    }, {}),
  );

  const [eligibility, setEligibility] = useState({});
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  useEffect(() => {
    if (!invitedEvents.length) {
      setLoadingEligibility(false);
      return;
    }

    const fetchEligibility = async () => {
      setLoadingEligibility(true);
      try {
        const promises = invitedEvents.map((event) =>
          axios
            .get(
              `/api/events/participate?event_id=${event._id}&user_id=${userId}`,
            )
            .then((res) => [event._id, res.data.eligible])
            .catch(() => [event._id, false]),
        );

        const results = await Promise.all(promises);

        const newEligibility = results.reduce((acc, [id, eligible]) => {
          acc[id] = eligible;
          return acc;
        }, {});

        setEligibility(newEligibility);
      } catch (err) {
        console.error("Error fetching eligibility:", err);
        const fallback = invitedEvents.reduce(
          (acc, e) => ({ ...acc, [e._id]: false }),
          {},
        );
        setEligibility(fallback);
      } finally {
        setLoadingEligibility(false);
      }
    };

    fetchEligibility();
  }, [invitedEvents, userId]);

  const handleRegister = async (eventId) => {
    const allEvents = [...participatedEvents, ...invitedEvents];
    const evt = allEvents.find((e) => e._id === eventId);
    if (evt && evt.status === "completed") {
      setError((prev) => ({
        ...prev,
        [eventId]: "Cannot register: event already completed.",
      }));
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, [eventId]: true }));

      const response = await axios.post("/api/events/participate", {
        event_id: eventId,
        user_id: userId,
      });

      if (response.data.eligible) {
        setRegistered((prev) => ({ ...prev, [eventId]: true }));
        setError((prev) => ({ ...prev, [eventId]: "" }));
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to register for event";
      setError((prev) => ({ ...prev, [eventId]: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const visibleEvents = useMemo(() => {
    return [
      ...participatedEvents,
      ...invitedEvents.filter((event) => eligibility[event._id] === true),
    ];
  }, [participatedEvents, invitedEvents, eligibility]);

  if (loadingEligibility) {
    return (
      <div className="py-6 flex justify-center items-center">
        <p className="text-gray-500 text-lg">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className="text-3xl font-bold mb-4">
        Events You Are Invited To / Participated
      </h2>

      {visibleEvents.length === 0 && (
        <p className="text-gray-500">No events yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
        {visibleEvents.map((event) => {
          const isRegistered = registered[event._id];
          const isEligible = eligibility[event._id];
          const isLoading = loading[event._id];
          const hasError = error[event._id];

          return (
            <div
              key={event._id}
              className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-row justify-between items-center">
                  <h3 className="text-xl font-semibold mb-2">{event.title}</h3>

                  {!isRegistered &&
                    isEligible &&
                    event.status !== "completed" && (
                      <button
                        disabled={isLoading}
                        onClick={() => {
                          setSelectedEventId(event._id);
                          setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Registering..." : "Register"}
                      </button>
                    )}
                </div>

                <p className="text-gray-700 mb-2">{event.description}</p>

                <div className="flex flex-row gap-8 flex-wrap">
                  <p className="flex gap-2 items-center">
                    <FaCalendar /> {new Date(event.date).toLocaleDateString()}
                  </p>
                  <p className="flex gap-2 items-center">
                    <FaClock /> {new Date(event.date).toLocaleTimeString()}
                  </p>
                  <p className="flex gap-2 items-center">
                    <FaLocationArrow /> {event.venue || "TBD"}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`font-medium ${
                        event.status === "cancelled"
                          ? "text-red-600"
                          : event.status === "completed"
                            ? "text-gray-600"
                            : "text-green-600"
                      }`}
                    >
                      {event.status?.charAt(0).toUpperCase() +
                        event.status?.slice(1)}
                    </span>
                  </p>
                </div>

                {isRegistered && (
                  <p className="text-blue-600 font-semibold mt-2">
                    You are registered ✅
                  </p>
                )}

                {hasError && (
                  <p className="text-red-500 text-sm mt-2">{hasError}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Confirm Registration</h3>

            <p className="text-gray-700 mb-6">
              Are you sure you want to register for this event?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedEventId(null);
                }}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleRegister(selectedEventId);
                  setIsModalOpen(false);
                  setSelectedEventId(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
