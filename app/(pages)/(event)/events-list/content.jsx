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
  const [activityType, setActivityType] = useState("");

  const activityTypes = [
    "Academic",
    "Administrative",
    "GAD",
    "Extension",
    "Research",
    "Students",
    "Others",
  ];

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
      .filter((evt) => {
        // Support new schema: arrays of start_dates and end_dates
        const end =
          Array.isArray(evt.end_dates) && evt.end_dates.length > 0
            ? evt.end_dates[evt.end_dates.length - 1]
            : evt.end_date || evt.start_date;
        return (
          new Date(end).getTime() >= now &&
          (!activityType || evt.type_of_activity === activityType)
        );
      })
      .sort((a, b) => {
        const aStart =
          Array.isArray(a.start_dates) && a.start_dates.length > 0
            ? a.start_dates[0]
            : a.start_date || a.date;
        const bStart =
          Array.isArray(b.start_dates) && b.start_dates.length > 0
            ? b.start_dates[0]
            : b.start_date || b.date;
        return new Date(aStart).getTime() - new Date(bStart).getTime();
      });
  }, [events, activityType]);

  const pastEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((evt) => {
        const end =
          Array.isArray(evt.end_dates) && evt.end_dates.length > 0
            ? evt.end_dates[evt.end_dates.length - 1]
            : evt.end_date || evt.start_date;
        return (
          new Date(end).getTime() < now &&
          (!activityType || evt.type_of_activity === activityType)
        );
      })
      .sort((a, b) => {
        const aStart =
          Array.isArray(a.start_dates) && a.start_dates.length > 0
            ? a.start_dates[0]
            : a.start_date || a.date;
        const bStart =
          Array.isArray(b.start_dates) && b.start_dates.length > 0
            ? b.start_dates[0]
            : b.start_date || b.date;
        return new Date(bStart).getTime() - new Date(aStart).getTime();
      });
  }, [events, activityType]);

  // Format a date range for multi-day events
  const formatRange = (evt) => {
    let start = evt.start_date || evt.date;
    let end = evt.end_date;
    if (Array.isArray(evt.start_dates) && evt.start_dates.length > 0) {
      start = evt.start_dates[0];
    }
    if (Array.isArray(evt.end_dates) && evt.end_dates.length > 0) {
      end = evt.end_dates[evt.end_dates.length - 1];
    }
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
    <div className="max-w-5xl mx-auto space-y-10 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Events</h1>
        </div>
        <div className="flex gap-6 items-center">
          <select
            className="border rounded px-2 py-2 text-sm"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
            <option value="">All Types</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            onClick={() => router.push("/create")}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Create Event
          </button>
        </div>
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
                  className="border rounded-lg border-gray-200 hover:shadow-md bg-white"
                >
                  {evt.event_poster && (
                    <img
                      src={evt.event_poster.url}
                      alt={evt.title}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold mb-1">
                        {evt.title}
                      </h3>
                      <button
                        onClick={() => goToManage(evt._id)}
                        className="bg-black text-white text-sm py-1 px-4 rounded-md flex items-center gap-2"
                      >
                        Manage <FaArrowRight />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {formatRange(evt)}
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
                  className="border rounded-lg border-gray-200 hover:shadow-md bg-white"
                >
                  {evt.event_poster && (
                    <img
                      src={evt.event_poster.url}
                      alt={evt.title}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold mb-1">
                        {evt.title}
                      </h3>
                      <button
                        onClick={() => goToManage(evt._id)}
                        className="bg-black text-white text-sm py-1 px-4 rounded-md flex items-center gap-2"
                      >
                        Manage <FaArrowRight />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatRange(evt)}
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
