"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCalendar, FaLocationArrow } from "react-icons/fa";

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
  const [showQrPrompt, setShowQrPrompt] = useState(false);

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
            : Promise.resolve({
                data: { participatedEvents: [], createdEvents: [] },
              }),
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
        setError(
          err.response?.data?.message || "Unable to load events. Please retry.",
        );
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
    router.push("/survey");
  };

  const registeredIds = useMemo(
    () => new Set(registeredEvents.map((evt) => evt._id)),
    [registeredEvents],
  );

  const isPast = (evt) => {
    const end = evt.end_date || evt.start_date || evt.date;
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  };

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

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((evt) => (
          <div
            key={evt._id}
            className="text-left border rounded-lg p-4 border-gray-200 bg-white hover:shadow-md transition space-y-2 cursor-pointer"
            onClick={() => router.push(`/events/discover/${evt._id}`)}
          >
            <h3 className="text-lg font-semibold mb-1">{evt.title}</h3>
            <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
              <FaCalendar />
              {formatRange(evt.start_date || evt.date, evt.end_date)}
            </p>
            {evt.venue && (
              <p className="text-sm text-gray-700 mb-2 flex items-center gap-2">
                <FaLocationArrow />
                {evt.venue}
              </p>
            )}
            {evt.description && (
              <p className="text-sm text-gray-700 line-clamp-2">
                {evt.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {["interested", "not_interested", "going"].map((s) => {
                const labels = {
                  interested: "Interested",
                  not_interested: "Not Interested",
                  going: "Going",
                };
                const active = getUserStatus(evt) === s;
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
    <div className="mx-auto p-5 font-sans space-y-6 max-w-5xl">
      {showQrPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold">Do you have an account?</h2>
            <p className="text-gray-600">
              We use your account to personalize your event experience. If you
              do not have one, we will take you to the quick survey.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={handleQrNoAccount}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                No, take survey
              </button>
              <button
                onClick={handleQrYesAccount}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Yes, I have an account
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discover Events</h1>
          <p className="text-gray-600 text-sm">Upcoming events you can join</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {renderCards(discoverEvents, "No available events to discover.")}
    </div>
  );
}
