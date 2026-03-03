"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendar, FaLocationArrow, FaArrowRight } from "react-icons/fa";

export default function EventsListContent() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const goToManage = (id) => {
    if (!id) return;
    router.push(`/events-list/${id}`);
  };

  useEffect(() => {
    const loadProfileAndEvents = async () => {
      try {
        const profileRes = await axios.get("/api/profile/my-profile");
        setUserId(profileRes.data?.user?._id || null);

        const eventsRes = await axios.get("/api/events");
        setEvents(eventsRes.data?.data || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load events. Please retry.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndEvents();
  }, []);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter(
        (evt) => new Date(evt.end_date || evt.start_date).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.start_date || a.date).getTime() -
          new Date(b.start_date || b.date).getTime(),
      );
  }, [events]);

  const pastEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((evt) => {
        const endMs = new Date(evt.end_date || evt.start_date).getTime();
        return (
          endMs < now &&
          (!userId ||
            evt.created_by === userId ||
            evt.created_by?._id === userId)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.start_date || b.date).getTime() -
          new Date(a.start_date || a.date).getTime(),
      );
  }, [events, userId]);

  const formatRange = (start, end) => {
    if (!start) return "No date";
    const startStr = new Date(start).toLocaleString();
    if (!end) return startStr;
    const endStr = new Date(end).toLocaleString();
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-500">Loading events...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Events</h1>
        <button
          onClick={() => router.push("/create")}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Create Event
        </button>
      </div>

      {error && (
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="border-b border-gray-200 flex justify-end gap-4">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 px-2 -mb-px border-b-2 text-sm font-medium transition ${
            activeTab === "upcoming"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`pb-3 px-2 -mb-px border-b-2 text-sm font-medium transition ${
            activeTab === "past"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Past ({pastEvents.length})
        </button>
      </div>

      {activeTab === "upcoming" && (
        <section className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <div className="p-4 rounded border border-gray-200 text-gray-500">
              No upcoming events.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt._id}
                  className="border rounded-lg p-4 border-gray-200 hover:shadow-md bg-white"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold mb-1">{evt.title}</h3>
                    <button
                      onClick={() => goToManage(evt._id)}
                      className="bg-black text-white text-sm py-1 px-4 rounded-md flex items-center gap-2"
                    >
                      Manage <FaArrowRight />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {formatRange(evt.start_date || evt.date, evt.end_date)}
                  </p>
                  {evt.venue && (
                    <p className="text-sm text-gray-700 mb-2">
                      Venue: {evt.venue}
                    </p>
                  )}
                  {evt.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {evt.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "past" && (
        <section className="space-y-4">
          {pastEvents.length === 0 ? (
            <div className="p-4 rounded border border-gray-200 text-gray-500">
              No past events you've created.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pastEvents.map((evt) => (
                <div
                  key={evt._id}
                  className="border rounded-lg p-4 border-gray-200 hover:shadow-md bg-white"
                >
                                    <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold mb-1">{evt.title}</h3>
                    <button
                      onClick={() => goToManage(evt._id)}
                      className="bg-black text-white text-sm py-1 px-4 rounded-md flex items-center gap-2"
                    >
                      Manage <FaArrowRight />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {formatRange(evt.start_date || evt.date, evt.end_date)}
                  </p>
                  {evt.venue && (
                    <p className="text-sm text-gray-700 mb-2">
                      Venue: {evt.venue}
                    </p>
                  )}
                  {evt.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {evt.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
