"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "#6366F1",
  "#EC4899",
  "#818CF8",
  "#F59E42",
  "#10B981",
  "#F43F5E",
];

export default function ProfileStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

//   if (loading) return <div className="py-8 text-center">Loading stats...</div>;
  if (error || !data)
    return (
      <div className="py-8 text-center text-red-600">
        {/* {error || "No data available"} */}
      </div>
    );

  const empTotals = data.employees?.totals || {};
  const stuTotals = data.students?.totals || {};
  const totalMale = (empTotals.Male || 0) + (stuTotals.Male || 0);
  const totalFemale = (empTotals.Female || 0) + (stuTotals.Female || 0);
  const totalPopulation = totalMale + totalFemale;

  const totalMaleEmployee = empTotals.Male || 0;
  const totalFemaleEmployee = empTotals.Female || 0;
  const totalEmployee = (empTotals.Male || 0) + (empTotals.Female || 0);

  const totalMaleStudent = stuTotals.Male || 0;
  const totalFemaleStudent = stuTotals.Female || 0;
  const totalStudent = (stuTotals.Male || 0) + (stuTotals.Female || 0);

//   const overallGenderPie = [
//     { name: "Male", value: totalMale },
//     { name: "Female", value: totalFemale },
//   ];

  const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearLineData = (data.students?.yearLevelSex || [])
    .filter((row) => row.yearLevel && row.yearLevel !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.year === row.yearLevel);
      if (!found) {
        found = { year: row.yearLevel, male: 0, female: 0 };
        acc.push(found);
      }
      if (row.sex === "Male") found.male += row.total;
      if (row.sex === "Female") found.female += row.total;
      return acc;
    }, [])
    .sort((a, b) => yearOrder.indexOf(a.year) - yearOrder.indexOf(b.year));

  return (
    <section className="my-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-violet-800 mb-2 drop-shadow-sm tracking-tight">
          Campus Gender Equality Overview
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          See a quick overview of our campus population and gender distribution
          among students and employees.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
        <div className="bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-violet-900">
            Total Population
          </h3>
          <div className="text-4xl font-extrabold text-violet-700">
            {totalPopulation}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">
            Total Male
          </h3>
          <div className="text-4xl font-extrabold text-blue-700">
            {totalMale}
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-pink-900">
            Total Female
          </h3>
          <div className="text-4xl font-extrabold text-pink-700">
            {totalFemale}
          </div>
        </div>
      </div>
      <div className="py-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-violet-700 mb-1 drop-shadow-sm tracking-tight">
          Employee Gender Breakdown
        </h2>
        <p className="text-base text-gray-500 max-w-xl mx-auto">
          See the gender distribution among all campus employees.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
        <div className="bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-violet-900">
            Total Employee
          </h3>
          <div className="text-4xl font-extrabold text-violet-700">
            {totalEmployee}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">
            Total Male
          </h3>
          <div className="text-4xl font-extrabold text-blue-700">
            {totalMaleEmployee}
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-pink-900">
            Total Female
          </h3>
          <div className="text-4xl font-extrabold text-pink-700">
            {totalFemaleEmployee}
          </div>
        </div>
      </div>

      <div className="px-70">
        <div className="bg-white rounded-lg p-6 my-8">
          <h3 className="text-lg font-semibold mb-2 text-center">
            Male and Female per Office/Department
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={(data.employees?.officeSex || [])
                .filter((row) => row.office && row.office !== "Unspecified")
                .reduce((acc, row) => {
                  let found = acc.find((x) => x.office === row.office);
                  if (!found) {
                    found = { office: row.office, male: 0, female: 0 };
                    acc.push(found);
                  }
                  if (row.sex === "Male") found.male += row.total;
                  if (row.sex === "Female") found.female += row.total;
                  return acc;
                }, [])}
            >
              <XAxis
                dataKey="office"
                fontSize={12}
                angle={-20}
                interval={0}
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="male"
                stroke="#3B82F6"
                name="Male"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="female"
                stroke="#EC4899"
                name="Female"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-violet-700 mb-1 drop-shadow-sm tracking-tight">
          Student Gender Breakdown
        </h2>
        <p className="text-base text-gray-500 max-w-xl mx-auto">
          See the gender distribution among all campus students.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
        <div className="bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-violet-900">
            Total Student
          </h3>
          <div className="text-4xl font-extrabold text-violet-700">
            {totalStudent}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">
            Total Male
          </h3>
          <div className="text-4xl font-extrabold text-blue-700">
            {totalMaleStudent}
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-6 w-60 flex flex-col items-center shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-pink-900">
            Total Female
          </h3>
          <div className="text-4xl font-extrabold text-pink-700">
            {totalFemaleStudent}
          </div>
        </div>
      </div>

      <div className="px-70">
        <div className="bg-white rounded-lg p-6 my-8">
          <h3 className="text-lg font-semibold mb-2 text-center">
            Male and Female per College
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={(data.students?.collegeSex || [])
                .filter((row) => row.college && row.college !== "Unspecified")
                .reduce((acc, row) => {
                  let found = acc.find((x) => x.college === row.college);
                  if (!found) {
                    found = { college: row.college, male: 0, female: 0 };
                    acc.push(found);
                  }
                  if (row.sex === "Male") found.male += row.total;
                  if (row.sex === "Female") found.female += row.total;
                  return acc;
                }, [])}
            >
              <XAxis
                dataKey="college"
                fontSize={12}
                angle={-20}
                interval={0}
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="male"
                stroke="#3B82F6"
                name="Male"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="female"
                stroke="#EC4899"
                name="Female"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">By Year Level</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={yearLineData}>
              <XAxis
                dataKey="year"
                fontSize={12}
                angle={-20}
                interval={0}
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="male"
                stroke="#3B82F6"
                name="Male"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="female"
                stroke="#EC4899"
                name="Female"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
