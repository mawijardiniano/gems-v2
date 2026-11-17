"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

/* Loads the event and the signed-in user. `reload()` re-fetches in the
   background: after a manual encode or a status change the page keeps what is
   on screen instead of going back to the full-page spinner, which would
   unmount the Attendance tab and the encode modal with its confirmation. */
export function useEventRecord(eventId) {
  const [event, setEvent] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  /* The event id last loaded successfully: a reload of the same event is a
     background refresh, a different id is a fresh load with the spinner. */
  const loadedFor = useRef(null);

  useEffect(() => {
    const isRefresh = loadedFor.current === eventId;
    let cancelled = false;

    const load = async () => {
      if (!isRefresh) {
        setLoading(true);
        setError("");
      }
      try {
        try {
          const profileRes = await axios.get("/api/profile/my-profile");
          if (cancelled) return;
          setUserId(profileRes.data?.user?._id || null);
          setUserRole(profileRes.data?.user?.role || null);
        } catch (profileErr) {
          const status = profileErr?.response?.status;
          if (status !== 401 && status !== 403) throw profileErr;
          if (!cancelled) setUserId(null);
        }

        if (!eventId) {
          if (!cancelled) setError("Event id is missing.");
          return;
        }

        const res = await axios.get(`/api/events/${eventId}`);
        if (cancelled) return;
        setEvent(res.data?.data || null);
        loadedFor.current = eventId;
      } catch (err) {
        /* A failed background refresh keeps the page that is already on
           screen; only the first load swaps it for an error. */
        if (!isRefresh && !cancelled)
          setError(err.response?.data?.message || "Unable to load event.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { event, setEvent, userId, userRole, loading, error, reload };
}
