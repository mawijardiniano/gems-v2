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
  ClipboardCheck,
  Users,
  Building2,
  Activity,
  AlertCircle,
  BarChart3,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
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
    disapproved: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  const icons = {
    draft: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
    disapproved: XCircle,
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

function academicYearLabel(year) {
  const y = Number(year);
  return y ? `${y}-${y + 1}` : "";
}

function eventAcademicYearStart(event) {
  const raw =
    event?.start_date || (Array.isArray(event?.start_dates) ? event.start_dates[0] : null);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
}

function fmtPesoCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000000) return `₱${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `₱${n.toFixed(0)}`;
}

function StatCard({ icon: Icon, iconClass, label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-gray-400 truncate">{hint}</p>
          ) : null}
        </div>
        <div
          className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ percent, barClass = "bg-blue-500" }) {
  const safe = Math.max(0, Math.min(Number(percent) || 0, 100));
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

function SnapshotRow({ icon: Icon, label, value, percent, barClass }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-gray-600 min-w-0">
          {Icon ? <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="font-semibold text-gray-900 shrink-0">{value}</span>
      </div>
      {typeof percent === "number" && (
        <MiniBar percent={percent} barClass={barClass} />
      )}
    </div>
  );
}

function SnapshotSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-10 bg-gray-200 rounded" />
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function CardShell({ icon: Icon, iconClass, title, subtitle, action, children }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${iconClass}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {title}
              </h2>
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            </div>
          </div>
          {action}
        </div>
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

function ReadinessItem({ count, label, hint, clearLabel, linkLabel, onOpen }) {
  const clear = !count;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex items-start gap-2 min-w-0">
        {clear ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className={`text-sm ${clear ? "text-gray-500" : "text-gray-800"}`}>
            {clear ? clearLabel : `${count} ${label}`}
          </p>
          {!clear && hint ? (
            <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
          ) : null}
          {!clear && onOpen ? (
            <button
              onClick={onOpen}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {linkLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
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

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState("");

  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");

  const [genderStats, setGenderStats] = useState({
    students: null,
    employees: null,
  });
  const [genderLoading, setGenderLoading] = useState(true);
  const [genderError, setGenderError] = useState("");

  const router = useRouter();

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

  const yearEvents = useMemo(() => {
    const y = Number(selectedYear);
    if (!y) return events;
    return events.filter((event) => eventAcademicYearStart(event) === y);
  }, [events, selectedYear]);

  const eventStats = useMemo(() => {
    const active = yearEvents.filter((e) => e.status === "active").length;
    const completed = yearEvents.filter((e) => e.status === "completed").length;
    const cancelled = yearEvents.filter((e) => e.status === "cancelled").length;
    const totalParticipants = yearEvents.reduce(
      (sum, e) => sum + (e.registered_users?.length || 0),
      0,
    );
    return {
      active,
      completed,
      cancelled,
      total: yearEvents.length,
      totalParticipants,
    };
  }, [yearEvents]);


  const yearOptions = useMemo(() => {
    const years = new Set();
    GPB.forEach((g) => {
      const y = Number(g?.year);
      if (y) years.add(y);
    });
    gaaBudget.forEach((g) => {
      const y = Number(g?.year);
      if (y) years.add(y);
    });
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [GPB, gaaBudget]);


  useEffect(() => {
    if (yearOptions.length === 0) return;
    if (!yearOptions.some((y) => String(y) === String(selectedYear))) {
      setSelectedYear(String(yearOptions[0]));
    }
  }, [yearOptions, selectedYear]);

  const selectedYearLabel = useMemo(
    () => (selectedYear ? `AY ${academicYearLabel(selectedYear)}` : "all years"),
    [selectedYear],
  );

  const selectedGpb = useMemo(
    () => GPB.find((g) => String(g?.year) === String(selectedYear)) || null,
    [GPB, selectedYear],
  );

  const projectsSnapshot = useMemo(() => {
    const projects = (Array.isArray(selectedGpb?.projects)
      ? selectedGpb.projects
      : []
    ).filter(Boolean);
    const total = projects.length;

    const countByStatus = (status) =>
      projects.filter((p) => p?.project_status === status).length;

    const milestones = projects.flatMap((p) =>
      (Array.isArray(p?.milestones) ? p.milestones : []).filter((m) =>
        String(m?.title || "").trim(),
      ),
    );

    const allotted = projects.reduce(
      (sum, p) => sum + (Number(p?.gad_budget?.value) || 0),
      0,
    );
    const spent = projects.reduce(
      (sum, p) => sum + (Number(p?.actual_expenditures) || 0),
      0,
    );

    return {
      total,
      completed: countByStatus("completed"),
      ongoing: countByStatus("ongoing"),
      forReview: countByStatus("for-review"),
      completionPct: total ? Math.round((countByStatus("completed") / total) * 100) : 0,
      milestones: milestones.length,
      milestonesDone: milestones.filter((m) => m?.status === "completed").length,
      allotted,
      spent,
      utilizationPct: allotted > 0 ? Math.round((spent / allotted) * 100) : 0,
    };
  }, [selectedGpb]);

  const gaaChartData = useMemo(() => {
    return [...gaaBudget]
      .sort((a, b) => a.year - b.year)
      .map((g) => ({
        year: g.year,
        gaa: g.totalGAA,
        gad: g.gadAnnualBudget,
      }));
  }, [gaaBudget]);

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
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setGPB(list);
        /* The GPB list comes back newest-first, so it seeds the year selector. */
        setSelectedYear((prev) => String(prev || list[0]?.year || ""));
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

  useEffect(() => {
    const load = async () => {
      setUpcomingLoading(true);
      try {
        const res = await axios.get("/api/events/upcoming?limit=5");
        setUpcomingEvents(res.data?.data || []);
      } catch {
        setUpcomingEvents([]);
      } finally {
        setUpcomingLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    const load = async () => {
      setReadinessLoading(true);
      setReadinessError("");
      try {
        const res = await axios.get(
          `/api/analytics/report-readiness?year=${encodeURIComponent(selectedYear)}`,
        );
        setReadiness(res.data || null);
      } catch (err) {
        setReadiness(null);
        setReadinessError(
          err.response?.data?.message || "Unable to load report readiness.",
        );
      } finally {
        setReadinessLoading(false);
      }
    };
    load();
  }, [selectedYear]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setGenderLoading(true);
      setGenderError("");
      const studentQuery = selectedYear
        ? `?type=students&school_year=${encodeURIComponent(
            academicYearLabel(selectedYear),
          )}`
        : "?type=students";
      const [students, employees] = await Promise.allSettled([
        axios.get(`/api/analytics/gender-statistics${studentQuery}`),
        axios.get("/api/analytics/gender-statistics?type=employees"),
      ]);
      if (!mounted) return;
      const pick = (result) =>
        result.status === "fulfilled" ? result.value.data || null : null;
      const studentData = pick(students);
      const employeeData = pick(employees);
      setGenderStats({ students: studentData, employees: employeeData });
      if (!studentData && !employeeData) {
        setGenderError("Unable to load gender statistics.");
      }
      setGenderLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Events Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of events, report readiness, projects, and budget
            allocation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-year"
              className="text-xs font-medium text-gray-500"
            >
              Academic Year
            </label>
            <select
              id="dashboard-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>
                  {`AY ${year}-${year + 1}`}
                </option>
              ))}
            </select>
          </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {eventsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : eventStats.total === 0 ? (
          <div className="sm:col-span-2 xl:col-span-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <EmptyState
              icon={Inbox}
              title="No events this academic year"
              description={`No events were recorded for ${selectedYearLabel}. Pick a different academic year to see its activity.`}
            />
          </div>
        ) : (
          <>
            <StatCard
              icon={CalendarDays}
              iconClass="bg-blue-50 text-blue-600"
              label="Total Events"
              value={eventStats.total}
              hint={`${eventStats.cancelled} cancelled · ${selectedYearLabel}`}
            />
            <StatCard
              icon={Activity}
              iconClass="bg-emerald-50 text-emerald-600"
              label="Active Events"
              value={eventStats.active}
              hint={`Ongoing and upcoming · ${selectedYearLabel}`}
            />
            <StatCard
              icon={CalendarCheck}
              iconClass="bg-violet-50 text-violet-600"
              label="Completed Events"
              value={eventStats.completed}
              hint={`Finished activities · ${selectedYearLabel}`}
            />
            <StatCard
              icon={Users}
              iconClass="bg-amber-50 text-amber-600"
              label="Total Registrations"
              value={eventStats.totalParticipants.toLocaleString()}
              hint={`Across ${selectedYearLabel} events`}
            />
          </>
        )}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell
          icon={ClipboardCheck}
          iconClass="bg-amber-50 text-amber-600"
          title="Report Readiness"
          subtitle={selectedYear ? `GPB ${selectedYear}` : "No year selected"}
          action={
            readiness?.gpbStatus ? (
              <StatusBadge status={readiness.gpbStatus} />
            ) : null
          }
        >
          {readinessLoading ? (
            <SnapshotSkeleton rows={3} />
          ) : readinessError ? (
            <p className="text-xs text-gray-500 italic">{readinessError}</p>
          ) : !readiness ? (
            <p className="text-xs text-gray-500 italic">
              Select an academic year to see what is still missing.
            </p>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                <ReadinessItem
                  count={
                    readiness.projects?.missingAccomplishments?.length || 0
                  }
                  label="projects without an accomplishment entry"
                  clearLabel="Every project has an accomplishment entry"
                  linkLabel="Open GAD Projects"
                  onOpen={() => router.push("/project-monitoring/gad-projects")}
                />
                <ReadinessItem
                  count={readiness.projects?.missingEvidence?.length || 0}
                  label="projects with spending but no evidence"
                  clearLabel="All expenditures have supporting evidence"
                  linkLabel="Open GAD Projects"
                  onOpen={() => router.push("/project-monitoring/gad-projects")}
                />
                <ReadinessItem
                  count={readiness.events?.missingReports?.length || 0}
                  label="completed events without a report"
                  hint={`${readiness.events?.completed || 0} completed events this year`}
                  clearLabel="All completed events have accomplishment reports"
                  linkLabel="Open Events"
                  onOpen={() => router.push("/events-list")}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => router.push("/reports")}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                  Open Reports &amp; Readiness
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </CardShell>

        <CardShell
          icon={Target}
          iconClass="bg-rose-50 text-rose-600"
          title="GAD Projects"
          subtitle={
            selectedYear
              ? `AY ${selectedYear}-${Number(selectedYear) + 1}`
              : "Project monitoring"
          }
          action={
            projectsSnapshot.total > 0 ? (
              <span className="text-xs text-gray-400 shrink-0">
                {projectsSnapshot.total} listed
              </span>
            ) : null
          }
        >
          {gpbLoading ? (
            <SnapshotSkeleton rows={3} />
          ) : projectsSnapshot.total === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No projects"
              description={`No GAD projects recorded for ${
                selectedYear || "this year"
              } yet.`}
              action={
                <button
                  onClick={() =>
                    router.push("/project-monitoring/gad-projects")
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Open Project Monitoring
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-gray-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Accomplished
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {projectsSnapshot.completed}/{projectsSnapshot.total}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Milestones
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {projectsSnapshot.milestonesDone}/
                    {projectsSnapshot.milestones}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <SnapshotRow
                  icon={TrendingUp}
                  label={`Project completion (${projectsSnapshot.ongoing} ongoing)`}
                  value={`${projectsSnapshot.completionPct}%`}
                  percent={projectsSnapshot.completionPct}
                  barClass="bg-emerald-500"
                />
                <SnapshotRow
                  icon={PiggyBank}
                  label="Budget utilization"
                  value={`${fmtPesoCompact(
                    projectsSnapshot.spent,
                  )} / ${fmtPesoCompact(projectsSnapshot.allotted)}`}
                  percent={projectsSnapshot.utilizationPct}
                  barClass="bg-violet-500"
                />
                <SnapshotRow
                  icon={Clock}
                  label="Still for review"
                  value={`${projectsSnapshot.forReview} project${
                    projectsSnapshot.forReview === 1 ? "" : "s"
                  }`}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() =>
                    router.push("/project-monitoring/gad-projects")
                  }
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                  Open Project Monitoring
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </CardShell>

        <CardShell
          icon={Users}
          iconClass="bg-pink-50 text-pink-600"
          title="Gender Statistics"
          subtitle="Share of female records on file"
        >
          {genderLoading ? (
            <SnapshotSkeleton rows={2} />
          ) : genderError ? (
            <p className="text-xs text-gray-500 italic">{genderError}</p>
          ) : (
            <>
              <div className="space-y-4">
                {[
                  {
                    key: "students",
                    label: "Students",
                    scope: selectedYearLabel,
                    totals: genderStats.students?.totals,
                  },
                  {
                    key: "employees",
                    label: "Employees",
                    scope: "all years",
                    totals: genderStats.employees?.totals,
                  },
                ].map((row) => (
                  <div key={row.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">
                        {row.label}
                        <span className="text-gray-400"> · {row.scope}</span>
                      </span>
                      <span className="font-semibold text-gray-900">
                        {row.totals
                          ? `${row.totals.pctFemale}% female`
                          : "No data"}
                      </span>
                    </div>
                    <MiniBar
                      percent={row.totals?.pctFemale || 0}
                      barClass="bg-pink-500"
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>
                        {row.totals
                          ? `${row.totals.Female.toLocaleString()} female · ${row.totals.Male.toLocaleString()} male`
                          : `No records on file for ${row.scope}`}
                      </span>
                      <span>
                        {row.totals
                          ? `${row.totals.total.toLocaleString()} total`
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                <button
                  onClick={() => router.push("/gender-statistics/students")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                >
                  Students
                </button>
                <button
                  onClick={() => router.push("/gender-statistics/employees")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                >
                  Employees
                </button>
              </div>
            </>
          )}
        </CardShell>
      </div>

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
                {GPB.slice(0, 4).map((gpb, idx) => {
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
            {upcomingLoading ? (
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
                  const eventStartDate =
                    event.start_date || event.start_dates?.[0];
                  const startDate = eventStartDate
                    ? new Date(eventStartDate).toLocaleDateString(
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
                          {eventStartDate
                            ? new Date(eventStartDate)
                                .toLocaleDateString("en-US", { month: "short" })
                                .charAt(0)
                            : "—"}
                        </span>
                        <span className="text-lg font-bold text-blue-700 leading-tight">
                          {eventStartDate
                            ? new Date(eventStartDate).getDate()
                            : "—"}
                        </span>
                      </div>

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