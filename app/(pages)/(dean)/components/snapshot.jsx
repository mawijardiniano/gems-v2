"use client";

import {
  FaUsers,
  FaVenusMars,
  FaWheelchair,
  FaLeaf,
} from "react-icons/fa";

export default function Snapshot({ data, college }) {

  const students = data.filter((d) => {
    const acad = d?.personal_info_id?.affiliation?.academic_information;
    return acad?.college === college;
  });

  const employees = data.filter((d) => {
    const emp = d?.personal_info_id?.affiliation?.employment_information;
    return emp?.office === college;
  });

  const studentsByYear = students.reduce((acc, d) => {
    const year =
      d?.personal_info_id?.affiliation?.academic_information?.year_level ||
      "Unknown";

    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const studentTotal = students.length;

  const studentFemale = students.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Female"
  ).length;

  const studentMale = students.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Male"
  ).length;

  const studentPWD = students.filter(
    (d) => d.personal_info_id?.gadData?.isPWD === true
  ).length;

  const studentIP = students.filter(
    (d) => d.personal_info_id?.gadData?.isIndigenousPerson === true
  ).length;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-black">
          Executive Snapshot
        </h1>
        <p className="text-sm text-gray-500">
          Overview of Key Indicators and Gaps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

     <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaUsers className="text-blue-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">
              Total No. of Student in CICS
            </p>
            <p className="text-xl font-semibold text-black">
              {studentTotal}
            </p>
          </div>
        </div>

{Object.entries(studentsByYear)
  .sort(([a], [b]) => {
    const numA = parseInt(a);
    const numB = parseInt(b);

    if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);

    return numA - numB;
  })
  .map(([year, count]) => (
    <div
      key={year}
      className="border border-gray-200 p-4 rounded-md flex flex-col gap-2"
    >
      <FaUsers className="text-indigo-500 text-2xl" />
      <div>
        <p className="text-sm text-gray-500">
          Year Level: {year}
        </p>
        <p className="text-xl font-semibold text-black">
          {count}
        </p>
      </div>
    </div>
  ))}
        
        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaVenusMars className="text-purple-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">Gender</p>
            <p className="text-xl font-semibold text-black">
              Female: {studentFemale} · Male: {studentMale}
            </p>
          </div>
        </div>

   
        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaWheelchair className="text-green-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">PWD</p>
            <p className="text-xl font-semibold text-black">
              {studentPWD} {studentPWD === 0 ? "(No declaration)" : ""}
            </p>
          </div>
        </div>

 
        <div className="border border-gray-200 p-4 rounded-md flex flex-col gap-2">
          <FaLeaf className="text-teal-500 text-2xl" />
          <div>
            <p className="text-sm text-gray-500">
              Indigenous Peoples
            </p>
            <p className="text-xl font-semibold text-black">
              {studentIP} {studentIP === 0 ? "(No declaration)" : ""}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}