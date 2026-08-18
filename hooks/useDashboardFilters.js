"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/utils/socket";

export default function useDashboardFilters() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/filters");
      if (!res.ok) throw new Error("Failed to fetch filter options");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchFilters = async () => {
      try {
        const res = await fetch("/api/analytics/filters");
        if (!res.ok) throw new Error("Failed to fetch filter options");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error(err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleChange = () => refresh();

    socket.on("profile:new", handleChange);
    socket.on("profile:updated", handleChange);
    socket.on("profile:deleted", handleChange);

    return () => {
      socket.off("profile:new", handleChange);
      socket.off("profile:updated", handleChange);
      socket.off("profile:deleted", handleChange);
    };
  }, [refresh]);

  return { data, loading, refresh };
}