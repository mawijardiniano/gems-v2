"use client";

import React, { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import PrintSummaryButton from "./PrintSummaryButton";

export default function ProfileStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showOfficeTable, setShowOfficeTable] = useState(false);
  const [showCollegeTable, setShowCollegeTable] = useState(false);
  const [showYearTable, setShowYearTable] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/sex-disaggregated-data/summary")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-500">
        Loading statistics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center text-red-600">
        Failed to load statistics.
      </div>
    );
  }

  const empTotals = data.employees?.totals || {};
  const stuTotals = data.students?.totals || {};

  const totalMale = (empTotals.Male || 0) + (stuTotals.Male || 0);
  const totalFemale = (empTotals.Female || 0) + (stuTotals.Female || 0);
  const totalUnspecified =
    (empTotals.Unspecified || 0) + (stuTotals.Unspecified || 0);

  const totalPopulation = totalMale + totalFemale + totalUnspecified;

  const totalMaleEmployee = empTotals.Male || 0;
  const totalFemaleEmployee = empTotals.Female || 0;
  const totalUnspecifiedEmployee = empTotals.Unspecified || 0;

  const totalEmployee =
    totalMaleEmployee + totalFemaleEmployee + totalUnspecifiedEmployee;

  const totalMaleStudent = stuTotals.Male || 0;
  const totalFemaleStudent = stuTotals.Female || 0;
  const totalUnspecifiedStudent = stuTotals.Unspecified || 0;

  const totalStudent =
    totalMaleStudent + totalFemaleStudent + totalUnspecifiedStudent;

  const officeData = (data.employees?.officeSex || [])
    .filter((row) => row.office && row.office !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.office === row.office);

      if (!found) {
        found = {
          office: row.office,
          male: 0,
          female: 0,
        };

        acc.push(found);
      }

      if (row.sex === "Male") found.male += row.total;
      if (row.sex === "Female") found.female += row.total;

      return acc;
    }, []);

  const collegeData = (data.students?.collegeSex || [])
    .filter((row) => row.college && row.college !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.college === row.college);

      if (!found) {
        found = {
          college: row.college,
          male: 0,
          female: 0,
        };

        acc.push(found);
      }

      if (row.sex === "Male") found.male += row.total;
      if (row.sex === "Female") found.female += row.total;

      return acc;
    }, []);

  const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  const yearLineData = (data.students?.yearLevelSex || [])
    .filter((row) => row.yearLevel && row.yearLevel !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.year === row.yearLevel);

      if (!found) {
        found = {
          year: row.yearLevel,
          male: 0,
          female: 0,
        };

        acc.push(found);
      }

      if (row.sex === "Male") found.male += row.total;
      if (row.sex === "Female") found.female += row.total;

      return acc;
    }, [])
    .sort((a, b) => yearOrder.indexOf(a.year) - yearOrder.indexOf(b.year));

  return (
    <section className="my-8 px-4">
      <div className="mb-8 text-center relative">
        <h2 className="text-4xl font-extrabold text-violet-800 mb-2">
          Campus Gender Equality Overview
        </h2>

        <PrintSummaryButton
          totalPopulation={totalPopulation}
          totalMale={totalMale}
          totalFemale={totalFemale}
          totalUnspecified={totalUnspecified}
          totalEmployee={totalEmployee}
          totalMaleEmployee={totalMaleEmployee}
          totalFemaleEmployee={totalFemaleEmployee}
          totalUnspecifiedEmployee={totalUnspecifiedEmployee}
          totalStudent={totalStudent}
          totalMaleStudent={totalMaleStudent}
          totalFemaleStudent={totalFemaleStudent}
          totalUnspecifiedStudent={totalUnspecifiedStudent}
          yearLineData={yearLineData}
          collegeData={collegeData}
          officeData={officeData}
        />

        <p className="text-gray-600">
          See a quick overview of gender distribution among students and
          employees.
        </p>
      </div>

      {/* OVERALL */}
      <div className="flex flex-wrap justify-center gap-6 mb-10">
        <div className="bg-violet-100 rounded-xl p-6 w-64 shadow-md text-center">
          <h3 className="text-lg font-semibold">Total Population</h3>

          <div className="text-4xl font-bold text-violet-700 mt-2">
            {totalPopulation}
          </div>
        </div>

        <div className="bg-blue-100 rounded-xl p-6 w-64 shadow-md text-center">
          <h3 className="text-lg font-semibold">Total Male</h3>

          <div className="text-4xl font-bold text-blue-700 mt-2">
            {totalMale}
          </div>
        </div>

        <div className="bg-pink-100 rounded-xl p-6 w-64 shadow-md text-center">
          <h3 className="text-lg font-semibold">Total Female</h3>

          <div className="text-4xl font-bold text-pink-700 mt-2">
            {totalFemale}
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-violet-700">
          Employee Gender Breakdown
        </h2>
      </div>

      <div className="flex flex-wrap justify-center gap-6 mb-10">
        <div className="bg-violet-100 rounded-xl p-6 w-64 shadow-md text-center">
          <h3 className="text-lg font-semibold">Total Employee</h3>

          <div className="text-4xl font-bold text-violet-700 mt-2">
            {totalEmployee}
          </div>
        </div>

        <div className="bg-blue-100 rounded-xl p-6 w-64 shadow-md text-center">
          <h3 className="text-lg font-semibold">Total Male</h3>

          <div className="text-4xl font-bold text-blue-700 mt-2">
            {totalMaleEmployee}
          </div>
        </div>

        <div className="bg-pink-100 rounded-xl p-6 w-64 shadow-md text-center">
          <h3 className="text-lg font-semibold">Total Female</h3>

          <div className="text-4xl font-bold text-pink-700 mt-2">
            {totalFemaleEmployee}
          </div>
        </div>
      </div>

      {/* OFFICE */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-md mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              Male and Female per Office/Department
            </h3>

            <button
              onClick={() => setShowOfficeTable(!showOfficeTable)}
              className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              {showOfficeTable ? "Show Chart" : "Show Table"}
            </button>
          </div>

          {showOfficeTable ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2">Office</th>

                    <th className="border px-4 py-2">Male</th>

                    <th className="border px-4 py-2">Female</th>

                    <th className="border px-4 py-2">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {officeData.map((row, index) => (
                    <tr key={index}>
                      <td className="border px-4 py-2">{row.office}</td>

                      <td className="border px-4 py-2 text-center">
                        {row.male}
                      </td>

                      <td className="border px-4 py-2 text-center">
                        {row.female}
                      </td>

                      <td className="border px-4 py-2 text-center">
                        {row.male + row.female}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={officeData}>
                <XAxis
                  dataKey="office"
                  angle={-20}
                  interval={0}
                  height={70}
                  fontSize={12}
                />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="Male"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />

                <Line
                  type="monotone"
                  dataKey="Female"
                  stroke="#EC4899"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-violet-700">
            Student Gender Breakdown
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <div className="bg-violet-100 rounded-xl p-6 w-64 shadow-md text-center">
            <h3 className="text-lg font-semibold">Total Student</h3>

            <div className="text-4xl font-bold text-violet-700 mt-2">
              {totalStudent}
            </div>
          </div>

          <div className="bg-blue-100 rounded-xl p-6 w-64 shadow-md text-center">
            <h3 className="text-lg font-semibold">Total Male</h3>

            <div className="text-4xl font-bold text-blue-700 mt-2">
              {totalMaleStudent}
            </div>
          </div>

          <div className="bg-pink-100 rounded-xl p-6 w-64 shadow-md text-center">
            <h3 className="text-lg font-semibold">Total Female</h3>

            <div className="text-4xl font-bold text-pink-700 mt-2">
              {totalFemaleStudent}
            </div>
          </div>
        </div>

        {/* COLLEGE */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              Male and Female per College
            </h3>

            <button
              onClick={() => setShowCollegeTable(!showCollegeTable)}
              className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              {showCollegeTable ? "Show Chart" : "Show Table"}
            </button>
          </div>

          {showCollegeTable ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2">College</th>

                    <th className="border px-4 py-2">Male</th>

                    <th className="border px-4 py-2">Female</th>

                    <th className="border px-4 py-2">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {collegeData.map((row, index) => (
                    <tr key={index}>
                      <td className="border px-4 py-2">{row.college}</td>

                      <td className="border px-4 py-2 text-center">
                        {row.male}
                      </td>

                      <td className="border px-4 py-2 text-center">
                        {row.female}
                      </td>

                      <td className="border px-4 py-2 text-center">
                        {row.male + row.female}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={collegeData}>
                <XAxis
                  dataKey="college"
                  angle={-20}
                  interval={0}
                  height={70}
                  fontSize={12}
                />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="Male"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />

                <Line
                  type="monotone"
                  dataKey="Female"
                  stroke="#EC4899"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* YEAR LEVEL */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">By Year Level</h3>

            <button
              onClick={() => setShowYearTable(!showYearTable)}
              className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              {showYearTable ? "Show Chart" : "Show Table"}
            </button>
          </div>

          {showYearTable ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2">Year Level</th>

                    <th className="border px-4 py-2">Male</th>

                    <th className="border px-4 py-2">Female</th>

                    <th className="border px-4 py-2">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {yearLineData.map((row, index) => (
                    <tr key={index}>
                      <td className="border px-4 py-2">{row.year}</td>

                      <td className="border px-4 py-2 text-center">
                        {row.male}
                      </td>

                      <td className="border px-4 py-2 text-center">
                        {row.female}
                      </td>

                      <td className="border px-4 py-2 text-center">
                        {row.male + row.female}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearLineData}>
                <XAxis
                  dataKey="year"
                  angle={-20}
                  interval={0}
                  height={70}
                  fontSize={12}
                />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="Male"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />

                <Line
                  type="monotone"
                  dataKey="Female"
                  stroke="#EC4899"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
