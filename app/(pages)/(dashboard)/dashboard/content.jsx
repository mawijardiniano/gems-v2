"use client";

import {
  FaSignInAlt,
  FaUserEdit,
  FaPlusCircle,
  FaCalendarCheck,
  FaEdit,
  FaTimesCircle,
  FaCalendarAlt,
  FaArrowRight,
  FaUserGraduate,
  FaBriefcase,
  FaIdBadge,
  FaMapMarkerAlt,
  FaUniversity,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaTag,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "min", secs: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) return `${count} ${i.label}${count > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEventDateSummary(event) {
  const startDates = event.start_dates || [];
  const endDates = event.end_dates || [];

  if (startDates.length === 0) return "No date";

  const firstStart = formatDate(startDates[0]);
  const lastEnd = endDates.length > 0 ? formatDate(endDates[endDates.length - 1]) : null;

  if (startDates.length === 1) {
    if (lastEnd && lastEnd !== firstStart) {
      return `${firstStart} - ${lastEnd}`;
    }
    return firstStart;
  }

  return `${firstStart} - ${lastEnd || firstStart}`;
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg ${color}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-base font-semibold text-gray-900 truncate mt-0.5">{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onClick, compact = false }) {
  const eventDate = event.start_dates?.[0] || event.date;
  const endDate = event.end_dates?.[event.end_dates?.length - 1] || null;
  const isPast = eventDate ? new Date(endDate || eventDate).getTime() < Date.now() : false;
  const isCancelled = event.status === "cancelled";

  return (
    <div
      onClick={() => onClick(event._id)}
      className={`group cursor-pointer bg-white rounded-xl border ${
        isCancelled ? "border-red-100" : "border-gray-100"
      } p-4 hover:border-indigo-200 hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {event.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
            <FaCalendarAlt className="shrink-0" />
            <span>{getEventDateSummary(event)}</span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
              <FaMapMarkerAlt className="shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
          {event.type_of_activity && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
              <FaTag className="shrink-0" />
              <span>{event.type_of_activity}</span>
            </div>
          )}
        </div>
        <span
          className={`shrink-0 ml-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            isCancelled
              ? "bg-red-50 text-red-600"
              : isPast
              ? "bg-gray-100 text-gray-500"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {isCancelled ? "Cancelled" : isPast ? "Past" : "Upcoming"}
        </span>
      </div>
    </div>
  );
}

export default function DashboardContent({ profile, userId }) {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [createdIds, setCreatedIds] = useState(new Set());
  const [eventsLoading, setEventsLoading] = useState(true);
  const [pastEvents, setPastEvents] = useState([]);

  const personal = profile?.personal || {};
  const gadData = profile?.gadData || {};
  const affiliation = profile?.affiliation || {};
  const academic = affiliation.academic_information || {};
  const employment = affiliation.employment_information || {};
  const contact = profile?.contact || {};

  const isStudent = personal.currentStatus === "Student";
  const fullName = [personal.first_name, personal.middle_name, personal.last_name]
    .filter(Boolean)
    .join(" ");
  const initials = [personal.first_name, personal.last_name]
    .filter(Boolean)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");

  useEffect(() => {
    if (!userId) return;
    setEventsLoading(true);
    Promise.all([
      fetch("/api/events").then((res) => res.json()),
      fetch(`/api/events/user-events?user_id=${userId}`).then((res) => res.json()),
    ])
      .then(([eventsRes, userEventsRes]) => {
        setAllEvents(eventsRes.data || []);
        const participated = userEventsRes.participatedEvents || [];
        const created = userEventsRes.createdEvents || [];
        setRegisteredIds(new Set(participated.map((evt) => evt._id)));
        setCreatedIds(new Set(created.map((evt) => evt._id)));

        // Compute past events from participated: events whose end_date/start_dates are in the past, sorted newest first
        const now = Date.now();
        const past = participated
          .filter((evt) => {
            const end = evt.end_dates?.[evt.end_dates?.length - 1] || evt.start_dates?.[0] || evt.date;
            return end && new Date(end).getTime() < now;
          })
          .sort((a, b) => {
            const aEnd = a.end_dates?.[a.end_dates?.length - 1] || a.start_dates?.[0] || a.date;
            const bEnd = b.end_dates?.[b.end_dates?.length - 1] || b.start_dates?.[0] || b.date;
            return new Date(bEnd).getTime() - new Date(aEnd).getTime();
          })
          .slice(0, 4);
        setPastEvents(past);
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
  }, [userId]);

  const isPast = (evt) => {
    const end = evt.end_dates?.[evt.end_dates?.length - 1] || evt.start_dates?.[0] || evt.date;
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  };

  const discoverEvents = useMemo(() => {
    return (allEvents || [])
      .filter((evt) => evt.status !== "cancelled")
      .filter((evt) => !isPast(evt))
      .filter((evt) => !registeredIds.has(evt._id))
      .filter((evt) => !createdIds.has(evt._id))
      .sort(
        (a, b) =>
          new Date(a.start_dates?.[0] || a.date).getTime() -
          new Date(b.start_dates?.[0] || b.date).getTime(),
      )
      .slice(0, 4);
  }, [allEvents, registeredIds, createdIds]);

  const studentStats = [
    { icon: <FaUserGraduate />, label: "Status", value: personal.currentStatus, color: "bg-blue-50 text-blue-600" },
    { icon: <FaUniversity />, label: "Campus", value: academic.campus, color: "bg-purple-50 text-purple-600" },
    { icon: <FaGraduationCap />, label: "College", value: academic.college, color: "bg-indigo-50 text-indigo-600" },
    { icon: <FaLayerGroup />, label: "Course", value: academic.course, color: "bg-teal-50 text-teal-600" },
    { icon: <FaClock />, label: "Year Level", value: academic.year_level, color: "bg-amber-50 text-amber-600" },
    { icon: <FaIdBadge />, label: "Student ID", value: academic.student_id, color: "bg-rose-50 text-rose-600" },
  ];

  const employeeStats = [
    { icon: <FaUserGraduate />, label: "Status", value: personal.currentStatus, color: "bg-blue-50 text-blue-600" },
    { icon: <FaBriefcase />, label: "Office", value: employment.office, color: "bg-purple-50 text-purple-600" },
    { icon: <FaClock />, label: "Employment Status", value: employment.employment_status, color: "bg-teal-50 text-teal-600" },
    { icon: <FaIdBadge />, label: "Appointment", value: employment.employment_appointment_status, color: "bg-amber-50 text-amber-600" },
    { icon: <FaIdBadge />, label: "Employee ID", value: employment.employee_id, color: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="py-6 px-0 md:px-2 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {initials || "U"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your account today.</p>
          </div>
        </div>
      </div>

      {/* Profile Stats Grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile Overview</h2>
          <button
            onClick={() => router.push("/dashboard/personal-information")}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View Profile <FaArrowRight className="text-[10px]" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(isStudent ? studentStats : employeeStats).map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>
      </section>

      {/* Events Section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Discover Events */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Discover Events</h2>
              <button
                onClick={() => router.push("/events/discover")}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View All <FaArrowRight className="text-[10px]" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {eventsLoading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading events...</p>
              ) : discoverEvents.length > 0 ? (
                discoverEvents.map((evt) => (
                  <EventCard key={evt._id} event={evt} onClick={(id) => router.push(`/events/discover/${id}`)} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FaCalendarAlt className="mx-auto text-3xl mb-2 opacity-40" />
                  <p className="text-sm">No events to discover right now.</p>
                </div>
              )}
            </div>
          </div>

          {/* Past Events (renamed from "Your Events") */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Your Events</h2>
              <button
                onClick={() => router.push("/events")}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View All <FaArrowRight className="text-[10px]" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {eventsLoading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading events...</p>
              ) : pastEvents.length > 0 ? (
                pastEvents.map((evt) => (
                  <EventCard key={evt._id} event={evt} onClick={(id) => router.push(`/events/discover/${id}`)} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FaCalendarCheck className="mx-auto text-3xl mb-2 opacity-40" />
                  <p className="text-sm">No past events yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}