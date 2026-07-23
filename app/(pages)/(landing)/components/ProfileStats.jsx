"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";
import { FiDownload, FiUsers, FiPieChart } from "react-icons/fi";
import PrintSummaryButton from "./PrintSummaryButton";

const semesterOrder = { "1st": 1, "2nd": 2, Summer: 3 };

// ─────────────────────────────────────────────────────────────
// Reusable stat card
// ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, total, male, female, unspecified, accent }) {
  const malePct = total ? ((male / total) * 100).toFixed(1) : 0;
  const femalePct = total ? ((female / total) * 100).toFixed(1) : 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1">
      {/* accent bar */}
      <div
        className="absolute top-0 left-0 h-1 w-full"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: accent }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Gender bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
          <span className="text-gray-600">Male</span>
          <span className="ml-auto font-semibold text-gray-900">{male}</span>
          <span className="text-xs text-gray-400">({malePct}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${malePct}%`, background: "#6366f1" }}
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
          <span className="text-gray-600">Female</span>
          <span className="ml-auto font-semibold text-gray-900">{female}</span>
          <span className="text-xs text-gray-400">({femalePct}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${femalePct}%`, background: "#ec4899" }}
          />
        </div>

        {unspecified > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
            <span className="text-gray-600">Unspecified</span>
            <span className="ml-auto font-semibold text-gray-900">{unspecified}</span>
            <span className="text-xs text-gray-400">
              ({total ? ((unspecified / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Custom tooltip for bar charts
// ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Segmented toggle
// ─────────────────────────────────────────────────────────────
function SegmentedToggle({ active, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1">
      <button
        onClick={() => onChange("chart")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "chart"
            ? "bg-white text-violet-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <FiPieChart className="h-4 w-4" />
        Chart
      </button>
      <button
        onClick={() => onChange("table")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active === "table"
            ? "bg-white text-violet-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <FiUsers className="h-4 w-4" />
        Table
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <section className="my-8 px-4 animate-pulse">
      <div className="mb-8 text-center">
        <div className="mx-auto h-9 w-96 rounded-lg bg-gray-200" />
        <div className="mx-auto mt-4 h-5 w-64 rounded bg-gray-100" />
      </div>

      <div className="flex flex-wrap justify-center gap-6 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 w-64 rounded-2xl bg-gray-100" />
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-10">
        <div className="h-80 rounded-2xl bg-gray-100" />
        <div className="h-80 rounded-2xl bg-gray-100" />
        <div className="h-80 rounded-2xl bg-gray-100" />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function ProfileStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [terms, setTerms] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [viewMode, setViewMode] = useState({ office: "chart", college: "chart", year: "chart" });

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

  const availableSemesters = selectedSchoolYear
    ? terms
        .filter((t) => t.school_year === selectedSchoolYear)
        .sort(
          (a, b) =>
            (semesterOrder[a.semester] || 0) - (semesterOrder[b.semester] || 0),
        )
    : [];

  const handleSchoolYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedSchoolYear(newYear);
    setData(null);

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

  // ── loading ──
  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  // ── error ──
  if (error && !data) {
    return (
      <section className="my-20 px-4 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <FiDownload className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Unable to Load Statistics
          </h3>
          <p className="text-sm text-red-600">
            We couldn't retrieve the gender equality data. Please try
            selecting a different term or refresh the page.
          </p>
        </div>
      </section>
    );
  }

  // ── data extraction ──
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

  // Pie data for overall gender distribution
  const overallPieData = [
    { name: "Male", value: totalMale, color: "#6366f1" },
    { name: "Female", value: totalFemale, color: "#ec4899" },
  ];
  if (totalUnspecified > 0) {
    overallPieData.push({ name: "Unspecified", value: totalUnspecified, color: "#94a3b8" });
  }

  // Office data
  const officeData = (data?.employees?.officeSex || [])
    .filter((row) => row.office && row.office !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.office === row.office);
      if (!found) {
        found = { office: row.office, Male: 0, Female: 0 };
        acc.push(found);
      }
      if (row.sex === "Male") found.Male += row.total;
      if (row.sex === "Female") found.Female += row.total;
      return acc;
    }, []);

  // College data
  const collegeData = (data?.students?.collegeSex || [])
    .filter((row) => row.college && row.college !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.college === row.college);
      if (!found) {
        found = { college: row.college, Male: 0, Female: 0 };
        acc.push(found);
      }
      if (row.sex === "Male") found.Male += row.total;
      if (row.sex === "Female") found.Female += row.total;
      return acc;
    }, []);

  // Year level data
  const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearLineData = (data?.students?.yearLevelSex || [])
    .filter((row) => row.yearLevel && row.yearLevel !== "Unspecified")
    .reduce((acc, row) => {
      let found = acc.find((x) => x.year === row.yearLevel);
      if (!found) {
        found = { year: row.yearLevel, Male: 0, Female: 0 };
        acc.push(found);
      }
      if (row.sex === "Male") found.Male += row.total;
      if (row.sex === "Female") found.Female += row.total;
      return acc;
    }, [])
    .sort((a, b) => yearOrder.indexOf(a.year) - yearOrder.indexOf(b.year));

  const CHART_COLORS = { Male: "#6366f1", Female: "#ec4899" };

 
  return (
    <section className="my-8 px-4 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        
        <div className="relative mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 mb-4">
            <FiPieChart className="h-4 w-4" />
            Gender Equality Dashboard
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
            Campus Gender Equality Overview
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Real-time sex-disaggregated data across the university
          </p>

          
          <div className="flex justify-center gap-4 mt-6">
            <div>
              <label
                htmlFor="school-year-select"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
              >
                School Year
              </label>
              <select
                id="school-year-select"
                value={selectedSchoolYear}
                onChange={handleSchoolYearChange}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 hover:border-gray-300"
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
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
              >
                Semester
              </label>
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={handleSemesterChange}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 hover:border-gray-300"
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

          {selectedSchoolYear && selectedSemester && (
            <p className="text-sm text-gray-400 mt-3">
              Showing data for{" "}
              <span className="font-semibold text-gray-600">
                {selectedSchoolYear}
              </span>{" "}
              —{" "}
              <span className="font-semibold text-gray-600">
                {selectedSemester === "1st"
                  ? "1st Semester"
                  : selectedSemester === "2nd"
                    ? "2nd Semester"
                    : "Summer"}
              </span>
            </p>
          )}

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
        </div>

        {/* ──── OVERALL STAT CARDS ──── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard
            icon={HiOutlineUserGroup}
            label="Total Population"
            total={totalPopulation}
            male={totalMale}
            female={totalFemale}
            unspecified={totalUnspecified}
            accent="linear-gradient(135deg, #6366f1, #8b5cf6)"
          />
          <StatCard
            icon={HiOutlineBriefcase}
            label="Total Employees"
            total={totalEmployee}
            male={totalMaleEmployee}
            female={totalFemaleEmployee}
            unspecified={totalUnspecifiedEmployee}
            accent="linear-gradient(135deg, #06b6d4, #0ea5e9)"
          />
          <StatCard
            icon={HiOutlineAcademicCap}
            label="Total Students"
            total={totalStudent}
            male={totalMaleStudent}
            female={totalFemaleStudent}
            unspecified={totalUnspecifiedStudent}
            accent="linear-gradient(135deg, #f59e0b, #f97316)"
          />
        </div>

        <div className="mb-12 animate-slide-up">
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Overall Gender Distribution
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overallPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {overallPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const pct = totalPopulation
                          ? ((d.value / totalPopulation) * 100).toFixed(1)
                          : 0;
                        return (
                          <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                            <p className="text-sm font-semibold text-gray-700">
                              {d.name}
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                              {d.value}
                            </p>
                            <p className="text-xs text-gray-400">{pct}% of total</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {overallPieData.map((entry) => {
                  const pct = totalPopulation
                    ? ((entry.value / totalPopulation) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={entry.name} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: entry.color }}
                      />
                      <span className="text-sm text-gray-600 w-20">
                        {entry.name}
                      </span>
                      <div className="w-32 h-2 rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: entry.color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                        {entry.value}
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ──── EMPLOYEE: OFFICE / DEPARTMENT ──── */}
        <div className="mb-12 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineOfficeBuilding className="h-5 w-5 text-cyan-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Employees — Per Office / Department
              </h3>
            </div>
            <SegmentedToggle
              active={viewMode.office}
              onChange={(mode) =>
                setViewMode((prev) => ({ ...prev, office: mode }))
              }
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
            {viewMode.office === "table" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Office
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Male
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Female
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {officeData.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.office}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.Male}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.Female}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {row.Male + row.Female}
                        </td>
                      </tr>
                    ))}
                    {officeData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-gray-400"
                        >
                          No office data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={officeData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                >
                  <XAxis
                    dataKey="office"
                    angle={-20}
                    interval={0}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="Male"
                    fill={CHART_COLORS.Male}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="Female"
                    fill={CHART_COLORS.Female}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ──── STUDENT: PER COLLEGE ──── */}
        <div className="mb-12 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineAcademicCap className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Students — Per College
              </h3>
            </div>
            <SegmentedToggle
              active={viewMode.college}
              onChange={(mode) =>
                setViewMode((prev) => ({ ...prev, college: mode }))
              }
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
            {viewMode.college === "table" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        College
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Male
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Female
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {collegeData.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.college}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.Male}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.Female}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {row.Male + row.Female}
                        </td>
                      </tr>
                    ))}
                    {collegeData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-gray-400"
                        >
                          No college data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={collegeData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                >
                  <XAxis
                    dataKey="college"
                    angle={-20}
                    interval={0}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="Male"
                    fill={CHART_COLORS.Male}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="Female"
                    fill={CHART_COLORS.Female}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ──── STUDENT: BY YEAR LEVEL ──── */}
        <div className="mb-12 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineUserGroup className="h-5 w-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Students — By Year Level
              </h3>
            </div>
            <SegmentedToggle
              active={viewMode.year}
              onChange={(mode) =>
                setViewMode((prev) => ({ ...prev, year: mode }))
              }
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
            {viewMode.year === "table" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Year Level
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Male
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Female
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {yearLineData.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.year}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.Male}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {row.Female}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {row.Male + row.Female}
                        </td>
                      </tr>
                    ))}
                    {yearLineData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-gray-400"
                        >
                          No year level data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={yearLineData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="Male"
                    fill={CHART_COLORS.Male}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="Female"
                    fill={CHART_COLORS.Female}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}