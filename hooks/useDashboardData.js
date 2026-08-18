"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/utils/socket";


export default function useDashboardData(filters = {}, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        if (Array.isArray(value)) {
          value.forEach((v) => v && params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    const qs = params.toString();
    return `/api/analytics/dashboard${qs ? `?${qs}` : ""}`;
  }, [filters]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(buildQuery());
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const res = await fetch(buildQuery());
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error(err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [buildQuery, enabled]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleChange = () => {
      refresh();
    };

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