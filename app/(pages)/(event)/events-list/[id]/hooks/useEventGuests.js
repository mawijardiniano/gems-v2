"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";

const EMPTY_COUNTS = { pending: 0, approved: 0, rejected: 0 };

/* The event's guest sheet (QR check-ins and manual records) and validating
   it. Loaded while a tab that reads guests is open: Overview (the pending
   badge), Attendance and Insights (approved guests join every headcount). */
export function useEventGuests(eventId, { active = true } = {}) {
  const [guests, setGuests] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  /* A failed load used to look like an empty sheet ("No attendance recorded
     yet" and zero counts). */
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!active || !eventId) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `/api/events/guests?event_id=${eventId}&validation_status=all`,
        );
        if (cancelled) return;
        setGuests(res.data?.data || []);
        if (res.data?.counts) setCounts(res.data.counts);
      } catch (err) {
        if (!cancelled) {
          setGuests([]);
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              "Unable to load the attendance sheet.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [active, eventId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /* Approve / reject / reset one or many guest rows, then refresh. */
  const validate = async (guestIds, action, note) => {
    const ids = (Array.isArray(guestIds) ? guestIds : [guestIds]).filter(
      Boolean,
    );
    if (ids.length === 0 || !eventId) return;
    await axios.patch("/api/events/guests", {
      event_id: eventId,
      guest_ids: ids,
      action,
      note: note || "",
    });
    reload();
  };

  return { guests, counts, loading, error, reload, validate };
}
