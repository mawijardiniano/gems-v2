"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FaEye, FaUsers, FaUserCheck, FaChartPie } from "react-icons/fa";

const getAttendantDetails = (att) => {
  const user = att?.user_id || {};
  const info = user.personal_info_id || user.personal_info || {};
  const personal = info.personal || user.personal || {};
  const gadData = info.gadData || user.gadData || {};

  const name =
    `${personal.first_name || ""} ${personal.last_name || ""}`.trim() ||
    user.username ||
    "Unknown participant";

  const rawSex = (gadData.sexAtBirth || "").toLowerCase();
  const sex =
    rawSex === "male" ? "Male" : rawSex === "female" ? "Female" : "Other";

  const rawStatus = personal.currentStatus || "";
  const sector = rawStatus
    ? rawStatus === "Student"
      ? "Student"
      : "Employee"
    : "Unspecified";

  return {
    key: user._id || `${name}-${att?.attended_at || ""}`,
    name,
    sex,
    sector,
    timeIn: att?.attended_at || null,
  };
};

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const fmtTimeIn = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
};

const pct = (part, total) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;


const getEventStatus = (e) => {
  if (e?.status === "cancelled")
    return { label: "Cancelled", cls: "bg-red-50 text-red-600 border-red-200" };
  if (e?.status === "completed")
    return {
      label: "Completed",
      cls: "bg-emerald-50 text-emerald-600 border-emerald-200",
    };

  const lastEndDate =
    e?.end_date ||
    (Array.isArray(e?.end_dates)
      ? e.end_dates[e.end_dates.length - 1]
      : null) ||
    e?.start_date ||
    (Array.isArray(e?.start_dates)
      ? e.start_dates[e.start_dates.length - 1]
      : null);
  const firstStartDate =
    e?.start_date ||
    (Array.isArray(e?.start_dates) ? e.start_dates[0] : null);
  const now = Date.now();
  const lastEnd = lastEndDate ? new Date(lastEndDate).getTime() : null;
  const firstStart = firstStartDate
    ? new Date(firstStartDate).getTime()
    : null;

  if (lastEnd && lastEnd < now)
    return { label: "Past", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  if (firstStart && firstStart <= now)
    return { label: "Ongoing", cls: "bg-green-50 text-green-600 border-green-200" };
  return { label: "Upcoming", cls: "bg-blue-50 text-blue-600 border-blue-200" };
};

const CARD_CLS =
  "rounded-xl border border-gray-100 bg-white p-5 shadow-sm";

const chartTooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  fontSize: 12,
  padding: "8px 12px",
};

function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
      <Icon className="text-gray-400" size={14} />
      {children}
    </h3>
  );
}

export default function AttendanceInsights({ event, allEvents = [] }) {
  const router = useRouter();

  const attendants = useMemo(
    () => (event?.attended_users || []).map(getAttendantDetails),
    [event?.attended_users],
  );

  const summary = useMemo(() => {
    const total = attendants.length;
    const female = attendants.filter((a) => a.sex === "Female").length;
    const male = attendants.filter((a) => a.sex === "Male").length;
    const other = total - female - male;
    const target = Number(event?.target_number_of_participants) || 0;
    const rate = target > 0 ? Math.min(pct(total, target), 100) : 0;
    return { total, female, male, other, target, rate };
  }, [attendants, event?.target_number_of_participants]);

  const sectorData = useMemo(() => {
    const sectors = ["Student", "Employee", "Unspecified"];
    return sectors
      .map((sector) => ({
        sector,
        Female: attendants.filter(
          (a) => a.sector === sector && a.sex === "Female",
        ).length,
        Male: attendants.filter(
          (a) => a.sector === sector && a.sex === "Male",
        ).length,
      }))
      .filter((row) => row.Female > 0 || row.Male > 0);
  }, [attendants]);

  const recentParticipants = useMemo(
    () =>
      [...attendants]
        .sort(
          (a, b) =>
            new Date(b.timeIn || 0).getTime() -
            new Date(a.timeIn || 0).getTime(),
        )
        .slice(0, 10),
    [attendants],
  );

  const siblingEvents = useMemo(() => {
    if (!event?.project || !event?._id) return [];
    return (allEvents || [])
      .filter(
        (e) =>
          e?._id &&
          e?.project &&
          String(e.project) === String(event.project),
      )
      .filter((e) => String(e._id) !== String(event._id))
      .sort(
        (a, b) =>
          new Date(
            a.start_date || a.start_dates?.[0] || 0,
          ).getTime() -
          new Date(
            b.start_date || b.start_dates?.[0] || 0,
          ).getTime(),
      );
  }, [allEvents, event?._id, event?.project]);

  const hasAttendance = attendants.length > 0;
  const showProjectEvents = Boolean(event?.project);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Summary */}
        <div className={CARD_CLS}>
          <SectionTitle icon={FaUserCheck}>Attendance Summary</SectionTitle>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-bold text-gray-900 leading-none">
              {summary.total}
            </span>
            <span className="text-sm text-gray-500 mb-0.5">Attended</span>
          </div>
          {hasAttendance ? (
            <ul className="space-y-2.5">
              {[
                { label: "Female", value: summary.female, dot: "bg-pink-500" },
                { label: "Male", value: summary.male, dot: "bg-blue-500" },
                {
                  label: "Other / Unspecified",
                  value: summary.other,
                  dot: "bg-gray-400",
                },
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                  <span className="text-gray-700">{row.label}</span>
                  <span className="ml-auto font-semibold text-gray-900">
                    {row.value}
                  </span>
                  <span className="text-xs text-gray-400 w-14 text-right">
                    {pct(row.value, summary.total)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">
              No attendance recorded yet for this event.
            </p>
          )}
        </div>

        <div className={CARD_CLS}>
          <SectionTitle icon={FaUsers}>Attendance per Sector</SectionTitle>
          {sectorData.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No attendance recorded yet for this event.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={sectorData}
                  margin={{ left: -20, right: 0, top: 4 }}
                  barSize={16}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="sector"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: "rgba(243,244,246,0.5)" }}
                  />
                  <Bar dataKey="Female" fill="#ec4899" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Male" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {[
                  { name: "Female", color: "#ec4899" },
                  { name: "Male", color: "#3b82f6" },
                ].map((l) => (
                  <div
                    key={l.name}
                    className="flex items-center gap-1.5 text-xs text-gray-600"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={CARD_CLS}>
          <SectionTitle icon={FaChartPie}>Attendance Rate</SectionTitle>
          {summary.target > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Attended", value: summary.total },
                      {
                        name: "Remaining",
                        value: Math.max(summary.target - summary.total, 0),
                      },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f3f4f6" />
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v, name) => [
                      v,
                      name === "Attended" ? "Attended" : "Remaining",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-gray-900">
                  {summary.rate}%
                </span>
                <span className="text-[11px] text-gray-400">
                  of {summary.target} target
                </span>
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">
                <span className="font-semibold text-gray-700">
                  {summary.total}
                </span>{" "}
                attended out of{" "}
                <span className="font-semibold text-gray-700">
                  {summary.target}
                </span>{" "}
                target participants
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              No target number of participants set for this event.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        {showProjectEvents && (
          <div className={CARD_CLS}>
            <SectionTitle icon={FaUsers}>Events under the Project</SectionTitle>
            {siblingEvents.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No other events are linked to this project yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">Event Title</th>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium text-center">
                        Registered
                      </th>
                      <th className="py-2 pr-3 font-medium text-center">
                        Attended
                      </th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siblingEvents.map((e, i) => {
                      const st = getEventStatus(e);
                      return (
                        <tr
                          key={e._id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                        >
                          <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 pr-3 font-medium text-gray-800 max-w-[220px] truncate">
                            {e.title || "Untitled event"}
                          </td>
                          <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">
                            {fmtDate(e.start_date || e.start_dates?.[0])}
                          </td>
                          <td className="py-2.5 pr-3 text-center text-gray-700">
                            {e.registered_users?.length ?? 0}
                          </td>
                          <td className="py-2.5 pr-3 text-center font-semibold text-gray-900">
                            {e.attended_users?.length ?? 0}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => router.push(`/events-list/${e._id}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                              title="View event"
                            >
                              <FaEye size={11} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className={CARD_CLS}>
          <SectionTitle icon={FaUserCheck}>Recent Participants</SectionTitle>
          {recentParticipants.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No attendance recorded yet for this event.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Sex</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 font-medium text-right">Time In</th>
                  </tr>
                </thead>
                <tbody>
                  {recentParticipants.map((p, i) => (
                    <tr
                      key={p.key}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 pr-3 font-medium text-gray-800 max-w-[200px] truncate">
                        {p.name}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{p.sex}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{p.sector}</td>
                      <td className="py-2.5 text-right text-gray-500 whitespace-nowrap">
                        {fmtTimeIn(p.timeIn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendants.length > 10 && (
                <p className="mt-3 text-xs text-gray-400">
                  Showing 10 of {attendants.length} participants
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



