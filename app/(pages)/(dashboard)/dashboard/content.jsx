import React from "react";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import ActivityTimeline from "../components/ActivityTimeline";

export default function DashboardContent({ profile, userId }) {
  const profileCompletion = 82;

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
          <p className="text-sm text-gray-600">{profileCompletion}% completed</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">College/Office</h3>
          <p className="text-lg font-medium">{profile.personal_information.college_office}</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">Employment Status</h3>
          <p className="text-lg font-medium">{profile.personal_information.employment_status}</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded shadow flex-1 min-w-[220px]">
          <h3 className="text-gray-500 text-sm">Employee Appointment Status</h3>
          <p className="text-lg font-medium">{profile.personal_information.employment_appointment_status}</p>
        </div>
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
                booleanIcon(profile.reproductive_family_role.family_planning === "Yes")
              )}
            </div>
            <div className="flex justify-between">
              <span>House Property Owned:</span>
              {booleanIcon(profile.social_development.housing_work_life_balance.house_property_owned)}
            </div>
            <div className="flex justify-between">
              <span>Community Involved:</span>
              {booleanIcon(profile.community_involvement.community_involvement)}
            </div>
          </div>
        </div>

        <ActivityTimeline userId={userId} />
      </div>
    </div>
  );
}
