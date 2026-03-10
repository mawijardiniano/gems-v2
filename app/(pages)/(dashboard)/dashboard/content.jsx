"use client";

import {
  FaTimesCircle,
  FaSignInAlt,
  FaUserEdit,
  FaPlusCircle,
  FaCalendarCheck,
  FaEdit,
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

export default function DashboardContent({ profile, userId }) {
  const [previousEvents, setPreviousEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const personal = profile?.personal || {};
  const gadData = profile?.gadData || {};
  const affiliation = profile?.affiliation || {};
  const academic = affiliation.academic_information || {};
  const employment = affiliation.employment_information || {};
  const contact = profile?.contact || {};

  const isStudent = personal.currentStatus === "Student";

  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    setEventsLoading(true);
    Promise.all([
      fetch("/api/events").then((res) => res.json()),
      fetch(`/api/events/user-events?user_id=${userId}`).then((res) =>
        res.json(),
      ),
    ])
      .then(([eventsRes, userEventsRes]) => {
        setAllEvents(eventsRes.data || []);
        const participated = userEventsRes.participatedEvents || [];
        const created = userEventsRes.createdEvents || [];
        setRegisteredIds(new Set(participated.map((evt) => evt._id)));
        setCreatedIds(new Set(created.map((evt) => evt._id)));
        setPreviousEvents(participated.slice(0, 4));
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
  }, [userId]);

  const [allEvents, setAllEvents] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [createdIds, setCreatedIds] = useState(new Set());

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

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/activity?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const latestActivities = (data.activities || []).slice(0, 4);
        setActivities(latestActivities);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p className="text-gray-500">Loading Dashboard...</p>;
  if (activities.length === 0)
    return <p className="text-gray-500">No activity yet</p>;

  return (
    <div className="mt-20 px-4 md:px-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard Overview</h1>

      <h2 className="text-3xl font-medium mb-8">
        Welcome{" "}
        {[personal.first_name, personal.middle_name, personal.last_name]
          .filter(Boolean)
          .join(" ")}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <div className="lg:col-span-4">
          {isStudent ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                <h3 className="text-gray-500 text-sm">Status</h3>
                <p className="text-lg font-medium">
                  {personal.currentStatus || "—"}
                </p>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                <h3 className="text-gray-500 text-sm">Campus</h3>
                <p className="text-lg font-medium">{academic.campus || "—"}</p>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                <h3 className="text-gray-500 text-sm">College</h3>
                <p className="text-lg font-medium">{academic.college || "—"}</p>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                <h3 className="text-gray-500 text-sm">Course</h3>
                <p className="text-lg font-medium">{academic.course || "—"}</p>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                <h3 className="text-gray-500 text-sm">Year Level</h3>
                <p className="text-lg font-medium">
                  {academic.year_level || "—"}
                </p>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                <h3 className="text-gray-500 text-sm">Student ID</h3>
                <p className="text-lg font-medium">
                  {academic.student_id || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                  <h3 className="text-gray-500 text-sm">Status</h3>
                  <p className="text-lg font-medium">
                    {personal.currentStatus || "—"}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                  <h3 className="text-gray-500 text-sm">Office</h3>
                  <p className="text-lg font-medium">
                    {employment.office || "—"}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                  <h3 className="text-gray-500 text-sm">Employment Status</h3>
                  <p className="text-lg font-medium">
                    {employment.employment_status || "—"}
                  </p>
                </div>
              </div>

              <div className="grid  grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                  <h3 className="text-gray-500 text-sm">Appointment Status</h3>
                  <p className="text-lg font-medium">
                    {employment.employment_appointment_status || "—"}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
                  <h3 className="text-gray-500 text-sm">Employee ID</h3>
                  <p className="text-lg font-medium">
                    {employment.employee_id || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-10">

        <div className="bg-white rounded-lg shadow p-4 lg:col-span-2 h-70">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-medium text-md">Discover Events</h1>
            <button
              className="text-blue-600 hover:underline text-sm font-medium w-20"
              onClick={() => router.push("/events/discover")}
            >
              View All
            </button>
          </div>

          {eventsLoading ? (
            <p className="text-gray-500">Loading events...</p>
          ) : (
            <EventList
              events={discoverEvents}
              showEmpty="No events to discover."
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-medium text-md">
              Previous Events You Registered/Participated
            </h1>
            <button
              className="text-blue-600 hover:underline text-sm font-medium w-20"
              onClick={() => router.push("/events")}
            >
              View All
            </button>
          </div>
          {eventsLoading ? (
            <p className="text-gray-500">Loading events...</p>
          ) : (
            <EventList
              events={previousEvents}
              showEmpty="No previous events."
            />
          )}
        </div>
                <div className="bg-white rounded-lg shadow p-4 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <ul className="space-y-3">
            {activities.map((a) => {
              const description =
                a.user_id === userId
                  ? a.description
                      .replace("User", "You")
                      .replace("their", "your")
                  : a.description;

              let Icon = null;
              switch (a.action) {
                case "LOGIN":
                  Icon = <FaSignInAlt />;
                  break;
                case "UPDATE_PROFILE":
                  Icon = <FaUserEdit />;
                  break;
                case "EVENT_REGISTER":
                  Icon = <FaCalendarCheck className="text-blue-500" />;
                  break;
                case "EVENT_CREATE":
                  Icon = <FaPlusCircle className="text-green-500" />;
                  break;
                case "EVENT_STATUS_UPDATE":
                  Icon = <FaTimesCircle className="text-red-500" />;
                  break;
                case "EVENT_UPDATE":
                  Icon = <FaEdit className="text-yellow-500" />;
                  break;
                case "CHANGE_PASSWORD":
                  Icon = <FaEdit className="text-orange-500" />;
                  break;
                default:
                  Icon = <FaSignInAlt />;
              }

              return (
                <li key={a._id} className="flex items-center gap-3">
                  <div className="mt-1">{Icon}</div>
                  <div>
                    <p className="text-xs font-medium">{description}</p>
                    <p className="text-xs text-gray-500">
                      {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EventList({ events, showEmpty }) {
  const router = useRouter();
  if (!events?.length)
    return <p className="text-gray-500">No previous events found.</p>;
  return (
    <ul className="space-y-2 mt-2">
      {events.map((event) => (
        <li
          key={event._id}
          className="border-b border-gray-200 pb-2 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => router.push(`/events/discover/${event._id}`)}
        >
          <div className="font-semibold text-sm">{event.title}</div>
          <div className="text-xs text-gray-500">
            {event.start_date
              ? new Date(event.start_date).toLocaleDateString()
              : "No date"}
          </div>
        </li>
      ))}
      {showEmpty && !events?.length && <li>{showEmpty}</li>}
    </ul>
  );
}
