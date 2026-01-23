"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import CreateEventModal from "./components/CreateEventModal";
import UpdateEventModal from "./components/UpdateEventModal";
import CancelEventModal from "./components/CancelEventModal";
import {
  FaCalendar,
  FaEdit,
  FaUsers,
  FaLocationArrow,
  FaClock,
} from "react-icons/fa";

export default function EventContent({ createdEvents = [] }) {
  const userId = useSelector((state) => state.auth.userId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const reloadEvents = () => window.location.reload();

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;

    setCancelLoading(true);
    setCancelError("");
    try {
      await axios.patch(`/api/events/${selectedEvent._id}/status`, {
        status: "cancelled",
        userId,
      });

      setIsCancelOpen(false);
      setSelectedEvent(null);
      reloadEvents();
    } catch (err) {
      setCancelError(err.response?.data?.message || "Failed to cancel event");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="mx-auto p-5 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Events</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Event
        </button>
      </div>

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onEventCreated={reloadEvents}
      />

      <section>
        {/* <h2 className="text-2xl font-semibold mb-4">Events You Created</h2> */}
        {createdEvents.length === 0 && (
          <p className="text-gray-500">No events created yet.</p>
        )}

        <div className="grid grid-cols-1 gap-4">
          {createdEvents.map((event) => (
            <div
              key={event._id}
              className="border border-gray-200 rounded-lg p-5 bg-white"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsEditOpen(true);
                    }}
                    disabled={event.status === "cancelled"}
                    className={`text-xl ${
                      event.status === "cancelled"
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:underline"
                    }`}
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>

              <p className="text-gray-700 mt-2 line-clamp-3">
                {event.description}
              </p>
              <div className="flex flex-row gap-8 py-2">
                <p className="text-gray-700 mt-1 flex flex-row items-center gap-2">
                  <strong>
                    <FaCalendar />
                  </strong>{" "}
                  {new Date(event.date).toLocaleDateString()}
                </p>
                <p className="text-gray-700 mt-1 flex flex-row items-center gap-2">
                  <strong>
                    <FaClock />
                  </strong>{" "}
                  {new Date(event.date).toLocaleTimeString()}
                </p>
                <p className="text-gray-700 mt-1 flex flex-row items-center gap-2">
                  <strong>
                    <FaLocationArrow />
                  </strong>{" "}
                  {event.venue || "TBD"}
                </p>
                <p className="text-gray-700 mt-1 flex flex-row items-center gap-2">
                  <strong>
                    <FaUsers />
                  </strong>{" "}
                  {event.registered_users?.length || 0} {""}
                  <span className="text-gray-400">participants</span>
                </p>
                <p className="text-md mt-2 flex flex-row items-center gap-2">
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
                    {event.status
                      ? event.status.charAt(0).toUpperCase() +
                        event.status.slice(1)
                      : ""}
                  </span>
                </p>
              </div>

              <div className="flex justify-end">
                {event.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsCancelOpen(true);
                    }}
                    className="text-sm text-white bg-red-600 px-4 py-1 rounded-md"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <UpdateEventModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEventUpdated={reloadEvents}
      />

      <CancelEventModal
        isOpen={isCancelOpen}
        onClose={() => {
          setIsCancelOpen(false);
          setSelectedEvent(null);
          setCancelError("");
        }}
        onConfirm={handleCancelEvent}
        loading={cancelLoading}
        error={cancelError}
      />
    </div>
  );
}
