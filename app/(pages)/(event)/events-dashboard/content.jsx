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
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  TrendingUp,
  PiggyBank,
  Target,
  ArrowRight,
  CalendarCheck,
  Users,
  Building2,
  Activity,
  AlertCircle,
  BarChart3,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
} from "lucide-react";

// ─── Skeleton Loader ───────────────────────────────────────────────
function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100 p-6 ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="animate-pulse h-72 flex items-end gap-3 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded-t-lg"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}





function StatusBadge({ status }) {
  const styles = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  const icons = {
    draft: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
    completed: CheckCircle2,
    active: CheckCircle2,
    cancelled: XCircle,
  };

  const s = (status || "draft").toLowerCase();
  const Icon = icons[s] || Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
        styles[s] || "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {s}
    </span>
  );
}

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 text-center max-w-xs mb-4">
        {description}
      </p>
      {action}
    </div>
  );
}


function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            ₱ {Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function EventsDashboardContent() {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [GPB, setGPB] = useState([]);
  const [gpbLoading, setGpbLoading] = useState(true);
  const [gpbError, setGpbError] = useState("");

  const [gaaBudget, setGAABudget] = useState([]);
  const [gaaLoading, setGaaLoading] = useState(true);
  const [gaaError, setGaaError] = useState("");

  const router = useRouter();

  // ── Computed values ──────────────────────────────────────────────
  const { totalGAA, totalGAD, avgGADPercent } = useMemo(() => {
    const totalGAA = gaaBudget.reduce((sum, g) => sum + (g.totalGAA || 0), 0);
    const totalGAD = gaaBudget.reduce(
      (sum, g) => sum + (g.gadAnnualBudget || 0),
      0,
    );
    const avgGADPercent =
      gaaBudget.length > 0
        ? (
            gaaBudget.reduce((sum, g) => sum + (g.gadPercent || 0), 0) /
            gaaBudget.length
          ).toFixed(2)
        : 0;

    return {
      totalGAA: totalGAA.toLocaleString(),
      totalGAD: totalGAD.toLocaleString(),
      avgGADPercent,
    };
  }, [gaaBudget]);

  const eventStats = useMemo(() => {
    const active = events.filter((e) => e.status === "active").length;
    const completed = events.filter((e) => e.status === "completed").length;
    const cancelled = events.filter((e) => e.status === "cancelled").length;
    const totalParticipants = events.reduce(
      (sum, e) => sum + (e.registered_users?.length || 0),
      0,
    );
    return { active, completed, cancelled, total: events.length, totalParticipants };
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => {
        if (e.status !== "active" || !e.start_dates?.length) return false;
        // Check if the last end date is still in the future (or today)
        const lastEndDate = e.end_dates?.length
          ? new Date(e.end_dates[e.end_dates.length - 1])
          : new Date(e.start_dates[e.start_dates.length - 1]);
        return lastEndDate >= now;
      })
      .sort((a, b) => new Date(a.start_dates[0]) - new Date(b.start_dates[0]))
      .slice(0, 5);
  }, [events]);

  const gaaChartData = useMemo(() => {
    return [...gaaBudget]
      .sort((a, b) => a.year - b.year)
      .map((g) => ({
        year: g.year,
        gaa: g.totalGAA,
        gad: g.gadAnnualBudget,
      }));
  }, [gaaBudget]);

  // ── Data fetching ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setGaaLoading(true);
      setGaaError("");
      try {
        const res = await axios.get("/api/gaa-budget");
        setGAABudget(res.data?.data?.slice(0, 5) || []);
      } catch (err) {
        setGaaError(
          err.response?.data?.message || "Unable to load GAA budget.",
        );
      } finally {
        setGaaLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setGpbLoading(true);
      setGpbError("");
      try {
        const res = await axios.get("/api/gpb");
        setGPB(res.data?.data?.slice(0, 4) || []);
      } catch (err) {
        setGpbError(err.response?.data?.message || "Unable to load GPB.");
      } finally {
        setGpbLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setEventsLoading(true);
      setEventsError("");
      try {
        const res = await axios.get("/api/events");
        setEvents(res.data?.data || []);
      } catch (err) {
        setEventsError(
          err.response?.data?.message || "Unable to load events.",
        );
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, []);

  const isLoading = eventsLoading || gpbLoading || gaaLoading;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Events Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of events, GPB, and GAA budget allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/events-list")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
          >
            <CalendarDays className="h-4 w-4" />
            View Events
          </button>
          <button
            onClick={() => router.push("/create")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-200"
          >
            <Activity className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* ── Error Banners ───────────────────────────────────────── */}
      {eventsError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-slide-up">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{eventsError}</span>
        </div>
      )}
      {gpbError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm animate-slide-up">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{gpbError}</span>
        </div>
      )}
      {gaaError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm animate-slide-up">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{gaaError}</span>
        </div>
      )}

      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
        <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    GAA Budget per Year
                  </h2>
                  <p className="text-xs text-gray-500">
                    GAD allocation from total budget
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {gaaLoading ? (
              <SkeletonChart />
            ) : gaaBudget.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No budget data"
                description="GAA budget records will appear here once added."
              />
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gaaChartData}>
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `₱${(value / 1000000).toFixed(0)}M`
                      }
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    />
                    <Bar
                      dataKey="gaa"
                      name="Total GAA"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    >
                      <LabelList
                        dataKey="gaa"
                        position="top"
                        formatter={(value) =>
                          `₱${(value / 1000000).toFixed(1)}M`
                        }
                        style={{ fontSize: "10px", fill: "#6b7280" }}
                      />
                    </Bar>
                    <Bar
                      dataKey="gad"
                      name="GAD Budget"
                      fill="#16a34a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    >
                      <LabelList
                        dataKey="gad"
                        position="top"
                        formatter={(value) =>
                          `₱${(value / 1000000).toFixed(1)}M`
                        }
                        style={{ fontSize: "10px", fill: "#6b7280" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── GPB Overview ──────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    GPB Overview
                  </h2>
                  <p className="text-xs text-gray-500">Projects per year</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {gpbLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : GPB.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No GPB records"
                description="GPB records will appear here once created."
                action={
                  <button
                    onClick={() => router.push("/gpb")}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Create GPB
                  </button>
                }
              />
            ) : (
              <div className="space-y-1">
                {GPB.map((gpb, idx) => {
                  const projectCount = Array.isArray(gpb.projects)
                    ? gpb.projects.length
                    : 0;
                  return (
                    <div
                      key={gpb._id || idx}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                      onClick={() => router.push(`/gpb/${gpb.year}`)}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                          GPB {gpb.year}
                        </p>
                        <p className="text-xs text-gray-500">
                          {projectCount} project
                          {projectCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={gpb?.status_of_gpb?.status} />
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {GPB.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => router.push("/gpb")}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                  View All GPB
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className=" rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Upcoming Events
                  </h2>
                  <p className="text-xs text-gray-500">
                    Next {upcomingEvents.length} active events
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/events-list")}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View All
              </button>
            </div>
          </div>

          <div className="p-5">
            {eventsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-48 bg-gray-200 rounded" />
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming events"
                description="Active events with upcoming dates will appear here."
                action={
                  <button
                    onClick={() => router.push("/create")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Create Event
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event, idx) => {
                  const startDate = event.start_dates?.[0]
                    ? new Date(event.start_dates[0]).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "TBD";

                  const registrations = event.registered_users?.length || 0;
                  const target = event.target_number_of_participants || 0;
                  const fillPercent = target > 0 ? (registrations / target) * 100 : 0;

                  return (
                    <div
                      key={event._id || idx}
                      className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                      onClick={() =>
                        router.push(`/events-list/${event._id}`)
                      }
                    >
                      {/* Date badge */}
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-700 leading-none">
                          {event.start_dates?.[0]
                            ? new Date(event.start_dates[0])
                                .toLocaleDateString("en-US", { month: "short" })
                                .charAt(0)
                            : "—"}
                        </span>
                        <span className="text-lg font-bold text-blue-700 leading-tight">
                          {event.start_dates?.[0]
                            ? new Date(event.start_dates[0]).getDate()
                            : "—"}
                        </span>
                      </div>

                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {event.venue || "Venue TBD"}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {registrations}/{target || "—"}
                          </span>
                        </div>
                        {/* Progress bar */}
                        {target > 0 && (
                          <div className="mt-1.5 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(fillPercent, 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── GAA Budget Table ──────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <PiggyBank className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    GAA Budget
                  </h2>
                  <p className="text-xs text-gray-500">Annual allocation</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {gaaLoading ? (
              <SkeletonTable rows={4} />
            ) : gaaBudget.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No budget data"
                description="GAA budget records will appear here once added."
              />
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total GAA
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        GAD %
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        GAD Budget
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gaaBudget.map((gaa, idx) => (
                      <tr
                        key={gaa._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-3 pr-4 text-sm font-semibold text-gray-900">
                          {gaa.year}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">
                          ₱ {Number(gaa.totalGAA).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {gaa.gadPercent}%
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right text-sm font-semibold text-emerald-600">
                          ₱ {Number(gaa.gadAnnualBudget).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {gaaBudget.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => router.push("/gaa-budget")}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                  View All Budgets
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}