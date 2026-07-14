"use client";

import React, { useEffect, useState, useCallback } from "react";
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

const semesterOrder = { "1st": 1, "2nd": 2, Summer: 3 };

export default function ProfileStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [terms, setTerms] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [showOfficeTable, setShowOfficeTable] = useState(false);
  const [showCollegeTable, setShowCollegeTable] = useState(false);
  const [showYearTable, setShowYearTable] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/terms")
      .then((res) => res.json())
      .then((json) => {
        const termList = json.terms || [];
        const yearList = json.schoolYears || [];
        setTerms(termList);
        setSchoolYears(yearList);

        if (yearList.length > 0) {
          const firstYear = yearList[0];
          setSelectedSchoolYear(firstYear);

          const semestersForYear = termList
            .filter((t) => t.school_year === firstYear)
            .sort(
              (a, b) =>
                (semesterOrder[a.semester] || 0) -
                (semesterOrder[b.semester] || 0),
            );
          if (semestersForYear.length > 0) {
            setSelectedSemester(semestersForYear[0].semester);
          }
        }
      })
      .catch(() => {
        setTerms([]);
        setSchoolYears([]);
      });
  }, []);

  // Fetch summary data with the selected term filters
  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (selectedSchoolYear) params.set("school_year", selectedSchoolYear);
    if (selectedSemester) params.set("semester", selectedSemester);

    fetch(`/api/analytics/sex-disaggregated-data/summary?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats");
        setLoading(false);
      });
  }, [selectedSchoolYear, selectedSemester]);

  useEffect(() => {
    if (selectedSchoolYear && selectedSemester) {
      fetchData();
    }
  }, [selectedSchoolYear, selectedSemester, fetchData]);

  // Get available semesters for the selected school year
  const availableSemesters = selectedSchoolYear
    ? terms
        .filter((t) => t.school_year === selectedSchoolYear)
        .sort(
          (a, b) =>
            (semesterOrder[a.semester] || 0) -
            (semesterOrder[b.semester] || 0),
        )
    : [];

  const handleSchoolYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedSchoolYear(newYear);
    setData(null);

    // Reset semester to first available for this year
    const semestersForYear = terms
      .filter((t) => t.school_year === newYear)
      .sort(
        (a, b) =>
          (semesterOrder[a.semester] || 0) - (semesterOrder[b.semester] || 0),
      );
    if (semestersForYear.length > 0) {
      setSelectedSemester(semestersForYear[0].semester);
    } else {
      setSelectedSemester("");
    }
  };

  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value);
    setData(null);
  };

  if (loading && !data) {
    return (
      <div className="py-10 text-center text-gray-500">
        Loading statistics...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-10 text-center text-red-600">
        Failed to load statistics.
      </div>
    );
  }

  const empTotals = data?.employees?.totals || {};
  const stuTotals = data?.students?.totals || {};

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

  const officeData = (data?.employees?.officeSex || [])
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

  const collegeData = (data?.students?.collegeSex || [])
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

  const yearLineData = (data?.students?.yearLevelSex || [])
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

        {/* TERM SELECTORS */}
        <div className="flex justify-center gap-4 mb-4">
          <div>
            <label
              htmlFor="school-year-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              School Year
            </label>
            <select
              id="school-year-select"
              value={selectedSchoolYear}
              onChange={handleSchoolYearChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {schoolYears.length === 0 && (
                <option value="">No terms available</option>
              )}
              {schoolYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="semester-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Semester
            </label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={handleSemesterChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {availableSemesters.length === 0 && (
                <option value="">No semesters available</option>
              )}
              {availableSemesters.map((t) => (
                <option key={t.semester} value={t.semester}>
                  {t.semester === "1st"
                    ? "1st Semester"
                    : t.semester === "2nd"
                      ? "2nd Semester"
                      : "Summer"}
                </option>
              ))}
            </select>
          </div>
        </div>

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

        {selectedSchoolYear && selectedSemester && (
          <p className="text-sm text-gray-500 mt-1">
            Showing data for {selectedSchoolYear} —{" "}
            {selectedSemester === "1st"
              ? "1st Semester"
              : selectedSemester === "2nd"
                ? "2nd Semester"
                : "Summer"}
          </p>
        )}
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