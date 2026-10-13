"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaCalendar, FaLocationArrow } from "react-icons/fa";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export default function DiscoverEventContent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/api/events/${eventId}`);
        const data = res.data?.data || null;
        if (!data) {
          setError("Event not found.");
        }
        setEvent(data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Unable to load event.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const isPast = (evt) => {
    if (!evt) return false;
    const endDates = Array.isArray(evt.end_dates)
      ? evt.end_dates.filter(Boolean).map((d) => new Date(d).getTime())
      : [];
    const end = evt?.end_date || evt?.start_date || evt?.date;
    const latestEnd =
      endDates.length > 0
        ? Math.max(...endDates)
        : end
          ? new Date(end).getTime()
          : null;
    if (latestEnd === null) return false;
    return latestEnd < Date.now();
  };

  const isAttendanceAllowed = (evt) => {
    if (!evt) return false;
    const now = Date.now();
    const startDates = Array.isArray(evt.start_dates)
      ? evt.start_dates.filter(Boolean).map((d) => new Date(d).getTime())
      : [];
    const endDates = Array.isArray(evt.end_dates)
      ? evt.end_dates.filter(Boolean).map((d) => new Date(d).getTime())
      : [];

    const earliestStart =
      startDates.length > 0 ? Math.min(...startDates) : null;
    const latestEnd = endDates.length > 0 ? Math.max(...endDates) : null;

    if (earliestStart !== null && now < earliestStart) return false;
    if (latestEnd !== null && now > latestEnd) return false;
    return true;
  };

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

  const requirements = [];

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading event...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>

        <button
          onClick={() => router.push("/events/discover")}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center text-gray-500">Event not found.</div>
    );
  }

  return (
    <div className="mx-auto p-5 font-sans space-y-6 max-w-6xl">
      {event ? (
        <>

      <div className="relative rounded-xl overflow-hidden">
        {posterUrl(event) && (
          <img
            src={posterUrl(event)}
            alt={event.title}
            className="w-full h-[400px] object-cover"
          />
        )}

        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
          <button
            onClick={() => router.push("/events/discover")}
            className="self-start text-sm hover:underline"
          >
            ← Back to Discover
          </button>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold">{event.title}</h1>

            <div className="flex flex-col gap-2">{formatRange(event)}</div>

            {event.venue && (
              <p className="flex items-center gap-2">
                <FaLocationArrow />
                {event.venue}
              </p>
            )}

            {!isAttendanceAllowed(event) && (
              <div className="mt-2 px-4 py-2 bg-gray-500/50 text-white rounded-lg text-sm font-semibold inline-block">
                {isPast(event)
                  ? "Attendance closed - Event has ended"
                  : "Attendance opens when the event starts"}
              </div>
            )}
            {isAttendanceAllowed(event) && !isPast(event) && (
              <a
                href={`/attend/${event._id}`}
                className="inline-block mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
              >
                Mark Attendance (scan QR at venue)
              </a>
            )}
          </div>
        </div>
      </div>

      <div className=" space-y-3">
        {isPast(event) && (
          <p className="text-sm text-gray-500">This event has ended.</p>
        )}
      </div>

      {event.description && (
        <div className="p-4 bg-white rounded border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">
            {event.description}
          </p>
        </div>
      )}

        </>
      ) : (
        <div className="py-16 text-center">
          <p className="font-medium text-gray-600">
            Sign in to view this event.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Event details will appear here once you sign in or create an
            account.
          </p>
        </div>
      )}

      <PWAInstallPrompt />
    </div>
  );
}
