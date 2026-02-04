"use client";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaSignInAlt,
  FaUserEdit,
  FaPlusCircle,
  FaCalendarCheck,
  FaEdit,
} from "react-icons/fa";
import { useEffect, useState } from "react";

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
  const profileCompletion = 82;
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

  if (loading) return <p className="text-gray-500">Loading activity...</p>;
  if (activities.length === 0)
    return <p className="text-gray-500">No activity yet</p>;

  const booleanIcon = (value) =>
    value ? (
      <span className="text-green-500 flex items-center gap-1">
        <FaCheckCircle /> Yes
      </span>
    ) : (
      <span className="text-red-500 flex items-center gap-1">
        <FaTimesCircle /> No
      </span>
    );

  return (
    <div className="mt-20 px-4 md:px-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard Overview</h1>

      <h2 className="text-3xl font-medium mb-8">
        Welcome {profile.personal_information.first_name}{" "}
        {profile.personal_information.middle_name}{" "}
        {profile.personal_information.last_name}
      </h2>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-lg font-semibold mb-2">Profile Completion</h3>
          <div className="w-full bg-gray-200 h-4 rounded mb-2">
            <div
              className="bg-blue-500 h-4 rounded"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {profileCompletion}% completed
          </p>
        </div>

        {profile.personal_information.person_type === "Student" ? (
          <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
            <h3 className="text-gray-500 text-sm">College</h3>
            <p className="text-lg font-medium">
              {profile.personal_information.academic_information.college}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
            <h3 className="text-gray-500 text-sm">College/Office</h3>
            <p className="text-lg font-medium">
              {profile.personal_information.employment_information.office}
            </p>
          </div>
        )}

        {profile.personal_information.person_type === "Student" ? (
<div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">Year Level</h3>
          <p className="text-lg font-medium">
            {profile.personal_information.academic_information.year_level}
          </p>
        </div>
        ) : (
<div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">Employment Status</h3>
          <p className="text-lg font-medium">
            {profile.personal_information.employment_information.employment_status}
          </p>
        </div>
        )}


        {profile.personal_information.person_type === "Student" ? (
        <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">Student ID</h3>
          <p className="text-lg font-medium">
            {profile.personal_information.academic_information.student_id}
          </p>
        </div>
        ) : (
        <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">Employee Appointment Status</h3>
          <p className="text-lg font-medium">
            {profile.personal_information.employment_information.employment_appointment_status}
          </p>
        </div>
        )}
        


      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Family Role Summary</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span>Breadwinner:</span>
              {booleanIcon(profile.economic_financial_role.breadwinner)}
            </div>
            <div className="flex justify-between">
              <span>Family Planning:</span>
              {profile.reproductive_family_role.family_planning === "N/A" ? (
                <span className="text-gray-500">N/A</span>
              ) : (
                booleanIcon(
                  profile.reproductive_family_role.family_planning === "Yes",
                )
              )}
            </div>
            <div className="flex justify-between">
              <span>House Property Owned:</span>
              {booleanIcon(
                profile.social_development.housing_work_life_balance
                  .house_property_owned,
              )}
            </div>
            <div className="flex justify-between">
              <span>Community Involved:</span>
              {booleanIcon(profile.community_involvement.community_involvement)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
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
                    <p className="text-sm font-medium">{description}</p>
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
