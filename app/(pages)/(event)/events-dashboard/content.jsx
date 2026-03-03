"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

export default function EventsDashboardContent() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("/api/events");
        setEvents(res.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load events.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const { now, todayStart } = useMemo(() => {
    const current = Date.now();
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return { now: current, todayStart: t.getTime() };
  }, []);

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getStart = (e) =>
    parseDate(e.start_date || e.date || e.startDate || e.event_date);
  const getEnd = (e) =>
    parseDate(e.end_date || e.endDate || e.finish_date || e.finishDate);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (statusFilter === "upcoming") {
      filtered = events.filter((e) => {
        const end = getEnd(e) || getStart(e);
        return end && end.getTime() >= todayStart;
      });
    } else if (statusFilter === "past") {
      filtered = events.filter((e) => {
        const end = getEnd(e) || getStart(e);
        return end && end.getTime() < todayStart;
      });
    } else if (statusFilter !== "all") {
      filtered = events.filter(
        (e) => (e.status || "").toLowerCase() === statusFilter,
      );
    }
    return filtered.slice(0, 4);
  }, [events, now, statusFilter]);

  const stats = useMemo(() => {
    const total = events.length;
    const active = events.filter(
      (e) => (e.status || "").toLowerCase() === "active",
    ).length;
    const cancelled = events.filter(
      (e) => (e.status || "").toLowerCase() === "cancelled",
    ).length;
    const upcoming = events.filter((e) => {
      const end = getEnd(e) || getStart(e);
      return end && end.getTime() >= todayStart;
    }).length;
    const past = events.filter((e) => {
      const end = getEnd(e) || getStart(e);
      return end && end.getTime() < todayStart;
    }).length;
    const totalRegistrations = events.reduce(
      (sum, e) =>
        sum +
        (Array.isArray(e.registered_users) ? e.registered_users.length : 0),
      0,
    );

    return { total, active, cancelled, upcoming, past, totalRegistrations };
  }, [events, now]);

  const monthlyData = useMemo(() => {
    const counts = {};
    events.forEach((e) => {
      const d = parseDate(e.start_date || e.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([name, value]) => ({ name, value }));
  }, [events]);

  const topEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const aCount = Array.isArray(a.registered_users)
          ? a.registered_users.length
          : 0;
        const bCount = Array.isArray(b.registered_users)
          ? b.registered_users.length
          : 0;
        return bCount - aCount;
      })
      .slice(0, 4);
  }, [events]);

  const formatRange = (start, end) => {
    if (!start) return "No date";
    const opts = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    const format = (value) => {
      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? "Invalid date"
        : d.toLocaleString(undefined, opts);
    };
    const startStr = format(start);
    if (!end) return startStr;
    return `${startStr} - ${format(end)}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Event Dashboard</h1>
          <p className="text-sm text-gray-600">
            Overview of events and registrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Filter</label>
          <select
            className="border border-gray-200 rounded px-3 py-2 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading events...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 w-full">
            <StatCard label="Total Events" value={stats.total} />
            <StatCard label="Upcoming" value={stats.upcoming} />
            <StatCard label="Past" value={stats.past} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-4 border border-gray-200 rounded-lg bg-white h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Events per Month</h2>
                <span className="text-xs text-gray-500">
                  Based on start date
                </span>
              </div>
              {monthlyData.length === 0 ? (
                <p className="text-sm text-gray-600">No data available.</p>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="value" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="p-4 border  border-gray-200 rounded-lg bg-white h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Top Events</h2>
                <span className="text-xs text-gray-500">By registrations</span>
              </div>
              {topEvents.length === 0 ? (
                <p className="text-sm text-gray-600">No events available.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {topEvents.map((evt, idx) => {
                    const regCount = Array.isArray(evt.registered_users)
                      ? evt.registered_users.length
                      : 0;
                    return (
                      <li key={evt._id || idx} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {evt.title || "Untitled"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatRange(
                                evt.start_date || evt.date,
                                evt.end_date,
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{regCount}</p>
                            <p className="text-xs text-gray-500">Registered</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="p-4 border  border-gray-200 rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Event List</h2>
              <span className="text-xs text-gray-500">Filtered view</span>
            </div>
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-gray-600">
                No events match this filter.
              </p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Title</th>
                      <th className="px-4 py-2 font-medium">Schedule</th>
                      <th className="px-4 py-2 font-medium">Registrations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEvents.map((evt) => {
                      const regCount = Array.isArray(evt.registered_users)
                        ? evt.registered_users.length
                        : 0;
                      return (
                        <tr key={evt._id || evt.title}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {evt.title || "Untitled"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatRange(
                              evt.start_date || evt.date,
                              evt.end_date,
                            )}
                          </td>
                          <td className="px-4 py-2">{regCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
