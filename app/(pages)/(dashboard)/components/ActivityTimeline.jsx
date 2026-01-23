"use client";

import { useEffect, useState } from "react";
import {
  FaSignInAlt,
  FaUserEdit,
  FaPlusCircle,
  FaCalendarCheck,
  FaTimesCircle,
  FaEdit, // new icon for event updates
} from "react-icons/fa";

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

export default function ActivityTimeline({ userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/activity?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const latestActivities = (data.activities || []).slice(0, 4); // max 4
        setActivities(latestActivities);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p className="text-gray-500">Loading activity...</p>;
  if (activities.length === 0)
    return <p className="text-gray-500">No activity yet</p>;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <ul className="space-y-3">
        {activities.map((a) => {
          const description =
            a.user_id === userId
              ? a.description.replace("User", "You").replace("their", "your")
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
            default:
              Icon = <FaSignInAlt />;
          }

          return (
            <li key={a._id} className="flex items-center gap-3">
              <div className="mt-1">{Icon}</div>
              <div>
                <p className="text-sm font-medium">{description}</p>
                <p className="text-xs text-gray-500">{timeAgo(a.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
