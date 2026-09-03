"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { COLLEGE_TO_PROGRAMS } from "@/lib/colleges";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  Male: "#3b82f6",
  Female: "#ec4899",
  Unspecified: "#9ca3af",
};

const PIE_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6", "#10b981", "#f59e0b"];

const semesterOrder = { "1st": 1, "2nd": 2, Summer: 3 };

function formatPercent(value, total) {
  if (!total || total === 0) return "0%";
  return Math.round((value / total) * 100) + "%";
}

function StatCard({ label, value, sub, textColor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span
        className={"text-2xl font-bold mt-1 " + (textColor || "text-gray-900")}
      >
        {value != null ? Number(value).toLocaleString() : "\u2014"}
      </span>
      {sub && <span className="text-xs text-gray-400 mt-0.5">{sub}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map(function (entry, idx) {
        return (
          <p key={idx} style={{ color: entry.color }} className="text-xs">
            {entry.name}:{" "}
            <span className="font-semibold">
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export default function SexDisaggregatedContent() {
  const userRole = useSelector((state) => state.auth.role);
  const userCollege = useSelector((state) => state.auth.college);

const [isGenerating, setIsGenerating] = useState(false);
const [status, setStatus] = useState("");
const [college, setCollege] = useState("");
const [course, setCourse] = useState("");

const isScoped = userRole === "gad coordinator";
const effectiveCollege = isScoped ? userCollege || "" : college || "";

  const [terms, setTerms] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const emptySummaryData = {
    employees: {
      appointmentStatus: [],
      totals: { Male: 0, Female: 0, Unspecified: 0 },
      officeSex: [],
    },
    students: {
      courseYear: [],
      totals: { Male: 0, Female: 0, Unspecified: 0 },
      collegeSex: [],
      yearLevelSex: [],
    },
  };

  const colleges = [
    "Laboratory School",
    "Graduate School",
    "College of Agriculture",
    "College of Allied Health Sciences",
    "College of Arts and Social Sciences",
    "College of Business and Accountancy",
    "College of Criminal Justice Education",
    "College of Education",
    "College of Engineering",
    "College of Environmental Studies",
    "College of Fisheries and Aquatic Sciences",
    "College of Governance",
    "College of Industrial Technology",
    "College of Information and Computing Sciences",
    "Offices under the Office of the University President",
    "Offices under the Office of the Vice President for Academic Affairs",
    "Offices under the Office of the Vice President for Administration and Finance",
    "Offices under the Office of the Vice President for Research and Extension",
    "Offices under the Office of the Vice President for Student Affairs and Services",
  ];

  const availableSemesters = useMemo(
    function () {
      if (!selectedSchoolYear) return [];
      return terms
        .filter(function (t) {
          return t.school_year === selectedSchoolYear;
        })
        .sort(function (a, b) {
          return (
            (semesterOrder[a.semester] || 0) - (semesterOrder[b.semester] || 0)
          );
        });
    },
    [terms, selectedSchoolYear],
  );

  const courseOptions = effectiveCollege
    ? COLLEGE_TO_PROGRAMS[effectiveCollege] || []
    : [];

  function buildQuery() {
    var params = new URLSearchParams();
    if (effectiveCollege) params.set("college", effectiveCollege);
    if (course) params.set("course", course);
    if (selectedSchoolYear) params.set("school_year", selectedSchoolYear);
    if (selectedSchoolYear && selectedSemester) {
      params.set("semester", selectedSemester);
    }
    var query = params.toString();
    return query ? "?" + query : "";
  }

  useEffect(function () {
    async function fetchTerms() {
      try {
        var res = await fetch("/api/analytics/terms");
        if (!res.ok) throw new Error("Failed to load terms");
        var data = await res.json();
        var termList = data.terms || [];
        var yearList = data.schoolYears || [];
        setTerms(termList);
        setSchoolYears(yearList);

        // Auto-select the latest school year and its first semester
        if (yearList.length > 0) {
          var latestYear = yearList[0];
          setSelectedSchoolYear(latestYear);

          var semestersForYear = termList
            .filter(function (t) {
              return t.school_year === latestYear;
            })
            .sort(function (a, b) {
              return (
                (semesterOrder[a.semester] || 0) -
                (semesterOrder[b.semester] || 0)
              );
            });
          if (semestersForYear.length > 0) {
            setSelectedSemester(semestersForYear[0].semester);
          }
        }
      } catch (err) {
        console.error(err);
        setTerms([]);
        setSchoolYears([]);
      }
    }
    fetchTerms();
  }, []);

  async function handleGenerate() {
    setStatus("");
    setIsGenerating(true);
    try {
      var query = buildQuery();
      var res = await fetch(
        "/api/analytics/sex-disaggregated-data/report" + query,
        { method: "GET" },
      );
      if (!res.ok) throw new Error("Failed to generate report");
      var blob = await res.blob();
      var url = window.URL.createObjectURL(blob);
      var link = document.createElement("a");
      var filename =
        (res.headers.get("content-disposition") || "").split("filename=")[1] ||
        "sex-disaggregated-report.pdf";
      link.href = url;
      link.download = filename.replace(/"/g, "");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Report ready \u2014 download started.");
    } catch (err) {
      console.error(err);
      setStatus("Could not generate the report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function fetchSummary() {
    setSummaryError("");
    setSummaryLoading(true);
    try {
      var query = buildQuery();
      var res = await fetch(
        "/api/analytics/sex-disaggregated-data/summary" + query,
      );
      if (res.status === 404) {
        setSummary(emptySummaryData);
        return;
      }
      if (!res.ok) throw new Error("Failed to load summary");
      var data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setSummaryError("Could not load summary data.");
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(
    function () {
      fetchSummary();
    },
    [effectiveCollege, course, selectedSchoolYear, selectedSemester],
  );

  var employeeTotal =
    summary && summary.employees && summary.employees.totals
      ? (summary.employees.totals.Male || 0) +
        (summary.employees.totals.Female || 0) +
        (summary.employees.totals.Unspecified || 0)
      : 0;

  var studentTotal =
    summary && summary.students && summary.students.totals
      ? (summary.students.totals.Male || 0) +
        (summary.students.totals.Female || 0) +
        (summary.students.totals.Unspecified || 0)
      : 0;

  var grandTotal = employeeTotal + studentTotal;

  var overallGenderData = useMemo(
    function () {
      if (!summary) return [];
      var emp = (summary.employees && summary.employees.totals) || {};
      var stu = (summary.students && summary.students.totals) || {};
      var male = (emp.Male || 0) + (stu.Male || 0);
      var female = (emp.Female || 0) + (stu.Female || 0);
      var result = [];
      if (male > 0) result.push({ name: "Male", value: male });
      if (female > 0) result.push({ name: "Female", value: female });
      return result;
    },
    [summary],
  );

  var employeeData = useMemo(
    function () {
      if (
        !summary ||
        !summary.employees ||
        !summary.employees.appointmentStatus
      )
        return [];
      return summary.employees.appointmentStatus.map(function (row) {
        return {
          status: row.status,
          Male: row.male || 0,
          Female: row.female || 0,
          Unspecified: row.unspecified || 0,
          total: row.total || 0,
        };
      });
    },
    [summary],
  );

  var studentCourseData = useMemo(
    function () {
      if (!summary || !summary.students || !summary.students.courseYear)
        return [];
      var byCourse = {};
      summary.students.courseYear.forEach(function (row) {
        var existing = byCourse[row.course] || {
          course: row.course,
          Male: 0,
          Female: 0,
          Unspecified: 0,
        };
        existing.Male += row.male || 0;
        existing.Female += row.female || 0;
        existing.Unspecified += row.unspecified || 0;
        byCourse[row.course] = existing;
      });
      return Object.values(byCourse).sort(function (a, b) {
        return b.Male + b.Female - (a.Male + a.Female);
      });
    },
    [summary],
  );

  var studentYearData = useMemo(
    function () {
      if (!summary || !summary.students || !summary.students.courseYear)
        return [];
      var yearMap = {};
      summary.students.courseYear.forEach(function (row) {
        if (!yearMap[row.yearLevel]) {
          yearMap[row.yearLevel] = {
            yearLevel: row.yearLevel,
            Male: 0,
            Female: 0,
            Unspecified: 0,
          };
        }
        yearMap[row.yearLevel].Male += row.male || 0;
        yearMap[row.yearLevel].Female += row.female || 0;
        yearMap[row.yearLevel].Unspecified += row.unspecified || 0;
      });
      var yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
      var sortedYears = yearLevels
        .filter(function (y) {
          return yearMap[y];
        })
        .concat(
          Object.keys(yearMap)
            .filter(function (y) {
              return yearLevels.indexOf(y) === -1;
            })
            .sort(),
        );
      return sortedYears.map(function (year) {
        return {
          yearLevel: year,
          Male: yearMap[year].Male || 0,
          Female: yearMap[year].Female || 0,
          total: (yearMap[year].Male || 0) + (yearMap[year].Female || 0),
        };
      });
    },
    [summary],
  );

  function renderStatus() {
    if (summaryError) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {summaryError}
        </div>
      );
    }
    if (summaryLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <svg
            className="animate-spin h-6 w-6 mr-2"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Loading data...
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Sex Disaggregated Data
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Breakdown of students and employees by sex for gender equity
            monitoring and GAD compliance reporting.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              College / Office
            </label>
            <select
              value={effectiveCollege}
              onChange={function (e) {
                setCollege(e.target.value);
                setCourse("");
              }}
              disabled={isScoped}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {isScoped ? (
                <option value={effectiveCollege}>
                  {effectiveCollege || "No college assigned"}
                </option>
              ) : (
                <>
                  <option value="">All colleges and offices</option>
                  {colleges.map(function (c) {
                    return (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Course
            </label>
            <select
              value={course}
              onChange={function (e) {
                setCourse(e.target.value);
              }}
              disabled={!effectiveCollege || courseOptions.length === 0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {courseOptions.length === 0
                  ? effectiveCollege
                    ? "No courses (office)"
                    : "Select a college first"
                  : "All courses"}
              </option>
              {courseOptions.map(function (c) {
                return (
                  <option key={c} value={c}>
                    {c}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              School Year
            </label>
            <select
              value={selectedSchoolYear}
              onChange={function (e) {
                setSelectedSchoolYear(e.target.value);
                setSelectedSemester("");
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All school years</option>
              {schoolYears.map(function (year) {
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={function (e) {
                setSelectedSemester(e.target.value);
              }}
              disabled={!selectedSchoolYear}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">All semesters</option>
              {availableSemesters.map(function (t) {
                return (
                  <option
                    key={t.school_year + "-" + t.semester}
                    value={t.semester}
                  >
                    {t.semester === "1st"
                      ? "1st Semester"
                      : t.semester === "2nd"
                        ? "2nd Semester"
                        : "Summer"}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <React.Fragment>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Generating...
              </React.Fragment>
            ) : (
              <React.Fragment>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generate Report
              </React.Fragment>
            )}
          </button>
        </div>

        {status && (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {status}
          </div>
        )}
      </div>

      {renderStatus()}

      {summary && !summaryLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Population"
            value={grandTotal}
            sub="Employees + Students"
            textColor="text-blue-600"
          />
          <StatCard
            label="Total Employees"
            value={employeeTotal}
            sub={
              summary && summary.employees && summary.employees.totals
                ? "\u2642 " +
                  (summary.employees.totals.Male || 0) +
                  " \u00B7 \u2640 " +
                  (summary.employees.totals.Female || 0)
                : ""
            }
            textColor="text-emerald-600"
          />
          <StatCard
            label="Total Students"
            value={studentTotal}
            sub={
              summary && summary.students && summary.students.totals
                ? "\u2642 " +
                  (summary.students.totals.Male || 0) +
                  " \u00B7 \u2640 " +
                  (summary.students.totals.Female || 0)
                : ""
            }
            textColor="text-violet-600"
          />
          <StatCard
            label="Sex Ratio"
            value={
              summary &&
              summary.employees &&
              summary.employees.totals &&
              summary.students &&
              summary.students.totals
                ? (function () {
                    var m =
                      (summary.employees.totals.Male || 0) +
                      (summary.students.totals.Male || 0);
                    var f =
                      (summary.employees.totals.Female || 0) +
                      (summary.students.totals.Female || 0);
                    return grandTotal > 0
                      ? Math.round((m / grandTotal) * 100) +
                          "% \u2642 / " +
                          Math.round((f / grandTotal) * 100) +
                          "% \u2640"
                      : "\u2014";
                  })()
                : "\u2014"
            }
            sub="Male vs Female split"
            textColor="text-amber-600"
          />
        </div>
      )}

      {summary && !summaryLoading && overallGenderData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-5 pt-5 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Overall Gender Distribution
            </p>
            <p className="text-sm text-gray-500">
              Combined sex at birth breakdown for employees and students.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 px-5 pb-5">
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={overallGenderData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={function (entry) {
                    return (
                      entry.name +
                      ": " +
                      entry.value +
                      " (" +
                      (entry.percent * 100).toFixed(1) +
                      "%)"
                    );
                  }}
                  isAnimationActive={false}
                >
                  {overallGenderData.map(function (entry, idx) {
                    return (
                      <Cell
                        key={"gender-cell-" + idx}
                        fill={COLORS[entry.name] || PIE_COLORS[idx]}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  content={
                    <CustomTooltip
                      formatter={function (v) {
                        return Number(v).toLocaleString();
                      }}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {summary && !summaryLoading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Employees Overview
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Male vs female counts by appointment status.
            </p>
          </div>
          <div className="p-5">
            {employeeData.length > 0 ? (
              <React.Fragment>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={employeeData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="status"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatter={function (v) {
                              return Number(v).toLocaleString();
                            }}
                          />
                        }
                      />
                      <Legend
                        iconType="circle"
                        formatter={function (value) {
                          return (
                            <span className="text-sm text-gray-600">
                              {value}
                            </span>
                          );
                        }}
                      />
                      <Bar
                        dataKey="Male"
                        fill={COLORS.Male}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={110}
                      />
                      <Bar
                        dataKey="Female"
                        fill={COLORS.Female}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={110}
                      />
                      <Bar
                        dataKey="Unspecified"
                        fill={COLORS.Unspecified}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={110}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs text-gray-600">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-right py-2 font-medium">Male</th>
                        <th className="text-right py-2 font-medium">Female</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeData.map(function (row) {
                        return (
                          <tr
                            key={row.status}
                            className="border-b border-gray-100"
                          >
                            <td className="py-1.5">{row.status}</td>
                            <td className="text-right py-1.5">{row.Male}</td>
                            <td className="text-right py-1.5">{row.Female}</td>
                            <td className="text-right py-1.5 font-medium">
                              {row.total}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </React.Fragment>
            ) : (
              <p className="text-sm text-gray-400 py-6 text-center">
                No employee data to display.
              </p>
            )}
          </div>
        </div>
      )}

      {summary && !summaryLoading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Students Overview
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Male vs female counts by course (summed across year levels).
            </p>
          </div>
          <div className="p-5">
            {studentCourseData.length > 0 ? (
              <React.Fragment>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={studentCourseData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                      stackOffset="expand"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="course"
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tickFormatter={function (v) {
                          return Math.round(v * 100) + "%";
                        }}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        domain={[0, 1]}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatter={function (value, entry) {
                              var total =
                                entry && entry.payload
                                  ? entry.payload.Male +
                                    entry.payload.Female +
                                    (entry.payload.Unspecified || 0)
                                  : 0;
                              return (
                                value + " (" + formatPercent(value, total) + ")"
                              );
                            }}
                          />
                        }
                      />
                      <Legend
                        iconType="circle"
                        formatter={function (value) {
                          return (
                            <span className="text-sm text-gray-600">
                              {value}
                            </span>
                          );
                        }}
                      />
                      <Bar
                        dataKey="Male"
                        stackId="a"
                        fill={COLORS.Male}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="Female"
                        stackId="a"
                        fill={COLORS.Female}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="Unspecified"
                        stackId="a"
                        fill={COLORS.Unspecified}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs text-gray-600">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium">Course</th>
                        <th className="text-right py-2 font-medium">Male</th>
                        <th className="text-right py-2 font-medium">Female</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentCourseData.map(function (row) {
                        return (
                          <tr
                            key={row.course}
                            className="border-b border-gray-100"
                          >
                            <td className="py-1.5">{row.course}</td>
                            <td className="text-right py-1.5">{row.Male}</td>
                            <td className="text-right py-1.5">{row.Female}</td>
                            <td className="text-right py-1.5 font-medium">
                              {row.Male + row.Female + (row.Unspecified || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </React.Fragment>
            ) : (
              <p className="text-sm text-gray-400 py-6 text-center">
                No student data to display.
              </p>
            )}
          </div>
        </div>
      )}

      {summary && !summaryLoading && studentYearData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Student Distribution by Year Level
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Male vs female grouped by year level.
            </p>
          </div>
          <div className="p-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={studentYearData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="yearLevel"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        formatter={function (v) {
                          return Number(v).toLocaleString();
                        }}
                      />
                    }
                  />
                  <Legend
                    iconType="circle"
                    formatter={function (value) {
                      return (
                        <span className="text-sm text-gray-600">{value}</span>
                      );
                    }}
                  />
                  <Bar
                    dataKey="Male"
                    fill={COLORS.Male}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={56}
                  />
                  <Bar
                    dataKey="Female"
                    fill={COLORS.Female}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={56}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium">Year Level</th>
                    <th className="text-right py-2 font-medium">Male</th>
                    <th className="text-right py-2 font-medium">Female</th>
                    <th className="text-right py-2 font-medium">Total</th>
                    <th className="text-right py-2 font-medium">% Female</th>
                  </tr>
                </thead>
                <tbody>
                  {studentYearData.map(function (row) {
                    return (
                      <tr
                        key={row.yearLevel}
                        className="border-b border-gray-100"
                      >
                        <td className="py-1.5">{row.yearLevel}</td>
                        <td className="text-right py-1.5">{row.Male}</td>
                        <td className="text-right py-1.5">{row.Female}</td>
                        <td className="text-right py-1.5 font-medium">
                          {row.total}
                        </td>
                        <td className="text-right py-1.5">
                          {formatPercent(row.Female, row.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {summary && !summaryLoading && studentYearData.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center text-sm text-gray-400">
          No student year level data to display.
        </div>
      )}

      {summary && !summaryLoading && (
        <div className="flex justify-end">
          <button
            onClick={fetchSummary}
            className="inline-flex items-center text-sm px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
          >
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Data
          </button>
        </div>
      )}
    </div>
  );
}