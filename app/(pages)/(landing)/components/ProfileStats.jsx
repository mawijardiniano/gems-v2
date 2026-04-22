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

  console.log("EMPLOYEE TOTAL", empTotals);
  console.log("STUDENT TOTAL", stuTotals);
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

  const handlePrintSummary = () => {
    const yearRows = yearLineData
      .map(
        (row) => `
        <tr>
          <td>${row.year}</td>
          <td>${row.male}</td>
          <td>${row.female}</td>
          <td>${row.male + row.female}</td>
        </tr>
      `,
      )
      .join("");

    const collegeData = (data.students?.collegeSex || [])
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
      }, []);

    const collegeRows = collegeData
      .map(
        (row) => `
        <tr>
          <td>${row.college}</td>
          <td>${row.male}</td>
          <td>${row.female}</td>
          <td>${row.male + row.female}</td>
        </tr>
      `,
      )
      .join("");

    const html = `
    <html>
      <head>
        <title>Campus Gender Summary</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h2, h3 {
            text-align: center;
            margin-top: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #333;
            padding: 8px;
            text-align: center;
          }
          th {
            background-color: #f3f4f6;
          }
        </style>
      </head>
      <body>

        <h2>Campus Gender Equality Summary</h2>

        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>Male</th>
              <th>Female</th>
              <th>Unspecified</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Overall Population</td>
              <td>${totalPopulation}</td>
              <td>${totalMale}</td>
              <td>${totalFemale}</td>
              <td>${totalUnspecified}</td>
            </tr>
            <tr>
              <td>Employees</td>
              <td>${totalEmployee}</td>
              <td>${totalMaleEmployee}</td>
              <td>${totalFemaleEmployee}</td>
              <td>${totalUnspecifiedEmployee}</td>
            </tr>
            <tr>
              <td>Students</td>
              <td>${totalStudent}</td>
              <td>${totalMaleStudent}</td>
              <td>${totalFemaleStudent}</td>
              <td>${totalUnspecifiedStudent}</td>
            </tr>
          </tbody>
        </table>

        <h3>Students by Year Level</h3>
        <table>
          <thead>
            <tr>
              <th>Year Level</th>
              <th>Male</th>
              <th>Female</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${yearRows}
          </tbody>
        </table>

        <h3>Students by College</h3>
        <table>
          <thead>
            <tr>
              <th>College</th>
              <th>Male</th>
              <th>Female</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${collegeRows}
          </tbody>
        </table>

      </body>
    </html>
  `;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  return (
    <section className="my-8">
      <div className="mb-8 text-center relative">
        <h2 className="text-3xl md:text-4xl font-extrabold text-violet-800 mb-2 drop-shadow-sm tracking-tight">
          Campus Gender Equality Overview
        </h2>

        <button
          onClick={handlePrintSummary}
          className="absolute right-10 top-0 bg-violet-800 text-white rounded-md border border-gray-200 px-6 py-1"
        >
          Print
        </button>

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
