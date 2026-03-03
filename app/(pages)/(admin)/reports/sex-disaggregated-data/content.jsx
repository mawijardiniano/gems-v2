"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function SexDisaggregatedContent() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [college, setCollege] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

  const colleges = [
    "Graduate School",
    "College of Agriculture",
    "College of Allied Health Sciences",
    "College of Arts & Social Sciences",
    "College of Business & Accountancy",
    "College of Criminal Justice Education",
    "College of Education",
    "College of Engineering",
    "College of Environmental Studies",
    "College of Fisheries & Aquatic Sciences",
    "College of Governance",
    "College of Industrial Technology",
    "College of Information & Computing Sciences",
    "Offices under the Office of the University President",
    "Offices under the Office of the Vice President for Academic Affairs",
    "Offices under the Office of the Vice President for Administration and Finance",
    "Offices under the Office of the Vice President for Research and Extension",
    "Offices under the Office of the Vice President for Student Affairs and Services",
  ];

  const handleGenerate = async () => {
    setStatus("");
    setIsGenerating(true);
    try {
      const query = college ? `?college=${encodeURIComponent(college)}` : "";

      const res = await fetch(
        `/api/analytics/sex-disaggregated-data/report${query}`,
        {
          method: "GET",
        },
      );

      if (!res.ok) throw new Error("Failed to generate report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        res.headers.get("content-disposition")?.split("filename=")?.[1] ||
        "sex-disaggregated-report.pdf";

      link.href = url;
      link.download = filename.replace(/"/g, "");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatus("Report ready — download started.");
    } catch (err) {
      console.error(err);
      setStatus("Could not generate the report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryError("");
    setSummaryLoading(true);
    try {
      const query = college ? `?college=${encodeURIComponent(college)}` : "";
      const res = await fetch(
        `/api/analytics/sex-disaggregated-data/summary${query}`,
      );
      if (!res.ok) throw new Error("Failed to load summary");
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setSummaryError("Could not load summary data.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [college]);

  const studentCourseData = useMemo(() => {
    if (!summary?.students?.courseYear) return [];
    const byCourse = {};
    summary.students.courseYear.forEach((row) => {
      const existing = byCourse[row.course] || {
        course: row.course,
        Male: 0,
        Female: 0,
      };
      existing.Male += row.male || 0;
      existing.Female += row.female || 0;
      byCourse[row.course] = existing;
    });
    return Object.values(byCourse);
  }, [summary]);

  const employeeData = useMemo(() => {
    if (!summary?.employees?.appointmentStatus) return [];
    return summary.employees.appointmentStatus.map((row) => ({
      status: row.status,
      Male: row.male || 0,
      Female: row.female || 0,
    }));
  }, [summary]);

  const studentYearData = useMemo(() => {
    if (!summary?.students?.courseYear) return [];
    const yearMap = {};
    summary.students.courseYear.forEach((row) => {
      if (!yearMap[row.yearLevel]) {
        yearMap[row.yearLevel] = {
          yearLevel: row.yearLevel,
          Male: 0,
          Female: 0,
        };
      }
      yearMap[row.yearLevel].Male += row.male || 0;
      yearMap[row.yearLevel].Female += row.female || 0;
    });
    const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const sortedYears = yearLevels
      .filter((y) => yearMap[y])
      .concat(Object.keys(yearMap).filter((y) => !yearLevels.includes(y)));
    return sortedYears.map((year) => {
      const data = [
        { name: "Male", value: yearMap[year].Male, fill: "#3b82f6" }, // blue
        { name: "Female", value: yearMap[year].Female, fill: "#ec4899" }, // pink
      ];
      return (
        <div key={year} className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {year}
          </p>
          <ResponsiveContainer width={220} height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
                isAnimationActive={false}
              >
                {data.map((entry, idx) => (
                  <cell key={`cell-${idx}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    });
  }, [summary]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Sex Disaggregated Data
          </h1>
        </div>
      </header>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              College / Office (optional)
            </label>
            <select
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All colleges and offices</option>
              {colleges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {status && <p className="text-sm text-gray-600">{status}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Employees Overview
            </p>
            <p className="text-sm text-gray-700">
              Male vs female counts stacked by appointment status.
            </p>
          </div>
          <button
            onClick={fetchSummary}
            disabled={summaryLoading}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-60"
          ></button>
        </div>

        {summaryError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {summaryError}
          </div>
        ) : summaryLoading ? (
          <div className="text-sm text-gray-500">Loading chart...</div>
        ) : employeeData.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={employeeData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                stackOffset="expand"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={formatPercent}
                  tick={{ fontSize: 12 }}
                  domain={[0, 1]}
                />
                <Tooltip formatter={(value) => formatPercent(value)} />
                <Legend />
                <Bar
                  dataKey="Male"
                  stackId="emp"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Female"
                  stackId="emp"
                  fill="#f472b6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No employee data to display.</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Students Overview
            </p>
            <p className="text-sm text-gray-700">
              Male vs female counts grouped by course (summed across year
              levels).
            </p>
          </div>
          <button
            onClick={fetchSummary}
            disabled={summaryLoading}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-60"
          ></button>
        </div>

        {summaryError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {summaryError}
          </div>
        ) : summaryLoading ? (
          <div className="text-sm text-gray-500">Loading chart...</div>
        ) : studentCourseData.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={studentCourseData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                stackOffset="expand"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="course"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={formatPercent}
                  tick={{ fontSize: 12 }}
                  domain={[0, 1]}
                />
                <Tooltip formatter={(value) => formatPercent(value)} />
                <Legend />
                <Bar
                  dataKey="Male"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Female"
                  stackId="a"
                  fill="#ec4899"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No student data to display.</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
          Student Distribution Per Year (Male & Female)
        </p>
        {summaryError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {summaryError}
          </div>
        ) : summaryLoading ? (
          <div className="text-sm text-gray-500">Loading chart...</div>
        ) : studentYearData.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {studentYearData}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No student data to display.</p>
        )}
      </div>
    </div>
  );
}
