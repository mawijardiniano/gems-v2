"use client";

import {
  FaUsers,
  FaVenusMars,
  FaWheelchair,
  FaLeaf,
  FaChild,
  FaHospital,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function Snapshot({ data }) {
  const totalRespondents = data.length;

  const femaleCount = data.filter(
    (d) => d.personal_info_id.gadData.sexAtBirth === "Female",
  ).length;
  const maleCount = data.filter(
    (d) => d.personal_info_id.gadData.sexAtBirth === "Male",
  ).length;

  const pwdCount =
    data.filter((d) => d.personal_info_id.gadData.isPWD === true).length || 0;
  const ipCount =
    data.filter((d) => d.personal_info_id.gadData.isIndigenousPerson === true)
      .length || 0;

  const soloParents = data.filter(
    (d) => d.personal_information.solo_parent,
  ).length;

  const healthConditions = data.filter(
    (d) =>
      d.health_information?.health_problems?.length > 0 &&
      d.health_information.health_problems[0] !== "None" &&
      d.health_information.health_problems[0] !== "",
  ).length;

  const highRisk = data.filter(
    (d) =>
      d.personal_information.solo_parent &&
      d.health_information?.health_problems?.length > 0 &&
      d.health_information.health_problems[0] !== "None",
  ).length;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-black">Executive Snapshot</h1>
        <p className="text-sm text-gray-500">
          Overview of Key Indicators and Gaps
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaUsers className="text-blue-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">Total Respondents</p>
            <p className="text-xl font-semibold text-black">
              {totalRespondents}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaVenusMars className="text-purple-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">Gender</p>
            <p className="text-xl font-semibold text-black">
              Female: {femaleCount} · Male: {maleCount}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaWheelchair className="text-green-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">PWD</p>
            <p className="text-xl font-semibold text-black">
              {pwdCount} {pwdCount === 0 ? "(No declaration)" : ""}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaLeaf className="text-teal-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">Indigenous Peoples</p>
            <p className="text-xl font-semibold text-black">
              {ipCount} {ipCount === 0 ? "(No declaration)" : ""}
            </p>
          </div>
        </div>

        {/* <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaChild className="text-yellow-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">Solo Parents</p>
            <p className="text-xl font-semibold text-black">{soloParents}</p>
          </div>
        </div> */}

        {/* <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaHospital className="text-red-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">With Health Conditions</p>
            <p className="text-xl font-semibold text-black">
              {healthConditions}
            </p>
          </div>
        </div> */}

        {/* <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaExclamationTriangle className="text-orange-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">High-Risk Individuals</p>
            <p className="text-xl font-semibold text-red-600">{highRisk}</p>
          </div>
        </div> */}
      </div>
    </div>
  );
}
