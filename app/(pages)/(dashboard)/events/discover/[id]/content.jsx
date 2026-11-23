"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { eventSpan, attendanceWindow } from "@/data/lib/eventStatus";
import { formatEventWhen } from "@/data/lib/eventDates";
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
    /* end is the latest instant the event occupies; null means no dates at all,
       which is not "past". */
    const end = eventSpan(evt).end;
    return end !== null && end < Date.now();
  };

  const isCancelled = (evt) => evt?.status === "cancelled";

  const isAttendanceAllowed = (evt) => {
    if (!evt || isCancelled(evt)) return false;
    /* This used to read only the legacy arrays, so once events stopped writing
       them it would have reported "closed" for every new event. The shared
       window reads scalars first. */
    const { earliestStart, latestEnd } = attendanceWindow(evt);
    const now = Date.now();

    if (earliestStart !== null && now < earliestStart) return false;
    if (latestEnd !== null && now > latestEnd) return false;
    return true;
  };

  const posterUrl = (evt) =>
    evt?.event_poster?.url || evt?.eventPoster?.url || evt?.poster?.url || "";

  /* Dates only for whole-day events; see data/lib/eventDates.js. */
  const formatRange = (evt) => {
    const when = formatEventWhen(evt);
    if (!when) return null;
    return (
      <div className="flex flex-row gap-2 items-center">
        <FaCalendar />
        {when}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-fg-muted">Loading event...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="p-4 rounded border border-red-300 bg-danger-subtle text-danger">
          {error}
        </div>

        <button
          onClick={() => router.push("/events/discover")}
          className="px-4 py-2 border rounded hover:bg-muted"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center text-fg-muted">Event not found.</div>
    );
  }

  return (
    <div className="mx-auto p-5 font-sans space-y-6 max-w-6xl">
      {/* `event` is always set here: the loading, error and not-found states
          return above. */}
      <>
          {/* Without a poster the overlay used to collapse to zero height and hide
              the title, dates and buttons; the minimum height and backdrop keep
              the header visible either way. */}
          <div className="relative rounded-xl overflow-hidden min-h-[400px] bg-linear-to-br from-secondary-800 to-secondary-600">
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
                    {isCancelled(event)
                      ? "This event has been cancelled"
                      : isPast(event)
                        ? "Attendance closed - Event has ended"
                        : "Attendance opens when the event starts"}
                  </div>
                )}
                {isAttendanceAllowed(event) && !isPast(event) && (
                  <a
                    href={`/attend/${event._id}`}
                    className="inline-block mt-2 px-4 py-2 bg-success-solid text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                  >
                    Mark Attendance (scan QR at venue)
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className=" space-y-3">
            {isPast(event) && (
              <p className="text-sm text-fg-muted">This event has ended.</p>
            )}
          </div>

          {event.description && (
            <div className="p-4 bg-white rounded border border-line">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-fg-3 whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
      </>

      <PWAInstallPrompt />
    </div>
  );
}
