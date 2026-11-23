"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { CHART, SERIES } from "@/data/lib/chartColors";
import {
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";
import { FiDownload, FiUsers, FiPieChart } from "react-icons/fi";
import PrintSummaryButton from "./PrintSummaryButton";
import {
  SAMPLE_EMPLOYEE_PROFILE_RECORDS,
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_PROFILE_RECORDS,
} from "../../(event)/gender-statistics/components/sampleProfileRecords";
import {
  computeStudentStats,
  filterStudentRecords,
} from "../../(event)/gender-statistics/components/studentStats";
import {
  computeEmployeeStats,
  filterEmployeeRecords,
} from "../../(event)/gender-statistics/components/employeeStats";

const semesterOrder = { "1st": 1, "2nd": 2, Summer: 3 };

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
          <p className="text-sm font-medium text-fg-muted">{label}</p>
          <p className="text-3xl font-bold text-fg mt-1">{total}</p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: accent }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-series-male" />
          <span className="text-fg-4">Male</span>
          <span className="ml-auto font-semibold text-fg">{male}</span>
          <span className="text-xs text-fg-muted">({malePct}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${malePct}%`, background: SERIES.male }}
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-series-female" />
          <span className="text-fg-4">Female</span>
          <span className="ml-auto font-semibold text-fg">{female}</span>
          <span className="text-xs text-fg-muted">({femalePct}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${femalePct}%`, background: SERIES.female }}
          />
        </div>

        {unspecified > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-series-slate" />
            <span className="text-fg-4">Unspecified</span>
            <span className="ml-auto font-semibold text-fg">{unspecified}</span>
            <span className="text-xs text-fg-muted">
              ({total ? ((unspecified / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line-subtle bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-semibold text-fg-3 mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-fg-4">{entry.name}:</span>
          <span className="font-semibold text-fg">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

function SegmentedToggle({ active, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-muted p-1">
      <button
        onClick={() => onChange("chart")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
          active === "chart"
            ? "bg-white text-secondary-700 shadow-sm"
            : "text-fg-muted hover:text-fg-3"
        }`}
      >
        <FiPieChart className="h-4 w-4" />
        Chart
      </button>
      <button
        onClick={() => onChange("table")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
          active === "table"
            ? "bg-white text-secondary-700 shadow-sm"
            : "text-fg-muted hover:text-fg-3"
        }`}
      >
        <FiUsers className="h-4 w-4" />
        Table
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <section className="my-8 px-4 animate-pulse">
      <div className="mb-8 text-center">
        <div className="mx-auto h-9 w-96 rounded-lg bg-emphasis" />
        <div className="mx-auto mt-4 h-5 w-64 rounded bg-muted" />
      </div>

      <div className="flex flex-wrap justify-center gap-6 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 w-64 rounded-2xl bg-muted" />
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-10">
        <div className="h-80 rounded-2xl bg-muted" />
        <div className="h-80 rounded-2xl bg-muted" />
        <div className="h-80 rounded-2xl bg-muted" />
      </div>
    </section>
  );
}

/* Long office/college names collide on a rotated axis. Cap them; the full
   name stays in the tooltip and the Table view. */
const truncateAxisLabel = (value) => {
  const text = String(value ?? "");
  return text.length > 24 ? `${text.slice(0, 23)}…` : text;
};

export default function ProfileStats() {
  const [useSample, setUseSample] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [terms, setTerms] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [viewMode, setViewMode] = useState({ office: "chart", college: "chart", year: "chart" });

  /* Sample term options: newest school year first, like the live filters API.
     Employees only carry a 1st-semester term per year, so every sample year
     still offers 1st/2nd/Summer for students. */
  const sampleSchoolYears = useMemo(
    () => [...SAMPLE_SCHOOL_YEARS].reverse(),
    []
  );
  const sampleTerms = useMemo(
    () =>
      sampleSchoolYears.flatMap((school_year) =>
        ["1st", "2nd", "Summer"].map((semester) => ({
          school_year,
          semester,
        }))
      ),
    [sampleSchoolYears]
  );

  const activeTerms = useSample ? sampleTerms : terms;
  const activeSchoolYears = useSample ? sampleSchoolYears : schoolYears;

  useEffect(() => {
    if (useSample) {
      /* Sample mode never reads the database: default to the active
         2026-2027 1st-semester term the sample profiles are built around. */
      const firstYear = sampleSchoolYears[0];
      setSelectedSchoolYear(firstYear);
      const semestersForYear = sampleTerms
        .filter((t) => t.school_year === firstYear)
        .sort(
          (a, b) =>
            (semesterOrder[a.semester] || 0) -
            (semesterOrder[b.semester] || 0),
        );
      if (semestersForYear.length > 0) {
        setSelectedSemester(semestersForYear[0].semester);
      }
      setLoading(false);
      return;
    }
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
  }, [useSample, sampleSchoolYears, sampleTerms]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (selectedSchoolYear) params.set("school_year", selectedSchoolYear);
    if (selectedSemester) params.set("semester", selectedSemester);

    fetch(`/api/analytics/sex-disaggregated-data/summary?${params.toString()}`)
      .then((res) => {
        if (res.status === 404) {
          
          return {};
        }
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
    if (useSample) return;
    if (selectedSchoolYear && selectedSemester) {
      fetchData();
    }
  }, [selectedSchoolYear, selectedSemester, fetchData, useSample]);

  /* Sample profiles aggregated into the same shape as
     /api/analytics/sex-disaggregated-data/summary so every card, chart,
     table and the print summary render unchanged. Students narrow by term
     (a student enrolled in both semesters counts once per selected term
     filter); employees narrow by school year only since their history is
     one 1st-semester term per year. */
  const sampleData = useMemo(() => {
    if (!selectedSchoolYear || !selectedSemester) return null;
    const students = filterStudentRecords(SAMPLE_STUDENT_PROFILE_RECORDS, {
      schoolYear: selectedSchoolYear,
      semester: selectedSemester,
    });
    const employees = filterEmployeeRecords(
      SAMPLE_EMPLOYEE_PROFILE_RECORDS,
      { schoolYear: selectedSchoolYear }
    );
    const studentStats = computeStudentStats(
      students,
      SAMPLE_STUDENT_PROFILE_RECORDS
    );
    const employeeStats = computeEmployeeStats(
      employees,
      SAMPLE_EMPLOYEE_PROFILE_RECORDS
    );
    const toSexRows = (rows, key) =>
      rows.flatMap((row) =>
        ["Male", "Female"]
          .filter((sex) => (row[sex] || 0) > 0)
          .map((sex) => ({ [key]: row[key], sex, total: row[sex] }))
      );
    return {
      employees: {
        totals: {
          Male: employeeStats.totals.Male,
          Female: employeeStats.totals.Female,
          Unspecified: 0,
        },
        officeSex: toSexRows(employeeStats.byOffice, "office"),
      },
      students: {
        totals: {
          Male: studentStats.totals.Male,
          Female: studentStats.totals.Female,
          Unspecified: 0,
        },
        collegeSex: toSexRows(studentStats.byCollege, "college"),
        yearLevelSex: toSexRows(studentStats.byYearLevel, "year_level").map(
          (row) => ({ yearLevel: row.year_level, sex: row.sex, total: row.total })
        ),
      },
    };
  }, [selectedSchoolYear, selectedSemester]);

  const activeData = useSample ? sampleData : data;

  const availableSemesters = selectedSchoolYear
    ? activeTerms
        .filter((t) => t.school_year === selectedSchoolYear)
        .sort(
          (a, b) =>
            (semesterOrder[a.semester] || 0) - (semesterOrder[b.semester] || 0),
        )
    : [];

  const handleSchoolYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedSchoolYear(newYear);
    if (!useSample) setData(null);

    const semestersForYear = activeTerms
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
    if (!useSample) setData(null);
  };

  const handleSourceToggle = () => {
    setUseSample((prev) => {
      const next = !prev;
      if (next) {
        /* Entering sample mode: park live state and pin the active sample
           term so charts never render a stale live year. */
        setData(null);
        setError("");
        const firstYear = sampleSchoolYears[0];
        setSelectedSchoolYear(firstYear);
        const semestersForYear = sampleTerms
          .filter((t) => t.school_year === firstYear)
          .sort(
            (a, b) =>
              (semesterOrder[a.semester] || 0) -
              (semesterOrder[b.semester] || 0),
          );
        setSelectedSemester(
          semestersForYear.length > 0 ? semestersForYear[0].semester : ""
        );
        setLoading(false);
      } else {
        /* Entering live mode: clear any sample selection so the live term
           fetch picks the authoritative first year/semester. */
        setData(null);
        setSelectedSchoolYear("");
        setSelectedSemester("");
      }
      return next;
    });
  };

  if (loading && !activeData) {
    return <LoadingSkeleton />;
  }

  if (error && !activeData) {
    return (
      <section className="my-20 px-4 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-danger-subtle p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <FiDownload className="h-8 w-8 text-danger" />
          </div>
          <h3 className="text-lg font-semibold text-danger mb-2">
            Unable to Load Statistics
          </h3>
          <p className="text-sm text-danger">
            We couldn't retrieve the gender equality data. Please try
            selecting a different term or refresh the page.
          </p>
        </div>
      </section>
    );
  }

  const empTotals = activeData?.employees?.totals || {};
  const stuTotals = activeData?.students?.totals || {};

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

  const overallPieData = [
    { name: "Male", value: totalMale, color: SERIES.male },
    { name: "Female", value: totalFemale, color: SERIES.female },
  ];
  if (totalUnspecified > 0) {
    overallPieData.push({ name: "Unspecified", value: totalUnspecified, color: SERIES.slate });
  }

  const officeData = (activeData?.employees?.officeSex || [])
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

  const collegeData = (activeData?.students?.collegeSex || [])
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

  const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearLineData = (activeData?.students?.yearLevelSex || [])
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

  const CHART_COLORS = { Male: SERIES.male, Female: SERIES.female };

 
  return (
    <section className="my-8 px-4 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        
        <div className="relative mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary-50 px-4 py-1.5 text-sm font-medium text-secondary-700 mb-4">
            <FiPieChart className="h-4 w-4" />
            Gender Equality Dashboard
          </div>
          <h2 className="text-4xl font-extrabold text-fg mb-2 tracking-tight">
            Campus Gender Equality Overview
          </h2>
          <p className="text-fg-muted max-w-xl mx-auto">
            {useSample
              ? "Sample sex-disaggregated data across the university"
              : "Real-time sex-disaggregated data across the university"}
          </p>

          
          <div className="flex flex-wrap justify-center items-end gap-4 mt-6">
            <div>
              <label
                htmlFor="school-year-select"
                className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5"
              >
                School Year
              </label>
              <select
                id="school-year-select"
                value={selectedSchoolYear}
                onChange={handleSchoolYearChange}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-fg-3 shadow-sm transition duration-200 focus:border-secondary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 hover:border-line-strong"
              >
                {activeSchoolYears.length === 0 && (
                  <option value="">No terms available</option>
                )}
                {activeSchoolYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="semester-select"
                className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5"
              >
                Semester
              </label>
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={handleSemesterChange}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-fg-3 shadow-sm transition duration-200 focus:border-secondary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 hover:border-line-strong"
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

            <div>
              <span className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">
                Data source
              </span>
              <button
                type="button"
                onClick={handleSourceToggle}
                aria-pressed={useSample}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                  useSample
                    ? "border-secondary-300 bg-secondary-50 text-secondary-700"
                    : "border-line bg-white text-fg-3 hover:bg-subtle"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    useSample ? "bg-secondary-500" : "bg-emerald-500"
                  }`}
                />
                {useSample ? "Sample data" : "Live data"}
              </button>
            </div>
          </div>

          {selectedSchoolYear && selectedSemester && (
            <p className="text-sm text-fg-muted mt-3">
              Showing {useSample ? "sample data" : "data"} for{" "}
              <span className="font-semibold text-fg-4">
                {selectedSchoolYear}
              </span>{" "}
              —{" "}
              <span className="font-semibold text-fg-4">
                {selectedSemester === "1st"
                  ? "1st Semester"
                  : selectedSemester === "2nd"
                    ? "2nd Semester"
                    : "Summer"}
              </span>
            </p>
          )}

          {useSample && (
            <div className="mx-auto mt-3 max-w-2xl rounded-xl border border-secondary-200 bg-secondary-50 px-4 py-3 text-xs text-secondary-800">
              Showing synthetic <strong>sample data</strong> from the
              sample-profile dataset (2022-2023 to 2026-2027). Your database
              is not being read and nothing is saved — turn the toggle off to
              return to live data.
            </div>
          )}

          {/* The Print button positions itself absolutely. Below sm this
              wrapper is its positioning box, so it gets its own row under the
              heading block; from sm up the wrapper is static and the button
              pins to the header's top-right corner as before. */}
          <div className="relative mt-4 h-10 sm:static sm:mt-0 sm:h-0">
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
              isSample={useSample}
              schoolYear={selectedSchoolYear}
              semester={selectedSemester}
            />
          </div>
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
            accent="linear-gradient(135deg, var(--color-secondary-600), var(--color-secondary-400))"
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
            <h3 className="text-lg font-semibold text-fg mb-6">
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
                          <div className="rounded-xl border border-line-subtle bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
                            <p className="text-sm font-semibold text-fg-3">
                              {d.name}
                            </p>
                            <p className="text-lg font-bold text-fg">
                              {d.value}
                            </p>
                            <p className="text-xs text-fg-muted">{pct}% of total</p>
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
                      <span className="text-sm text-fg-4 w-20">
                        {entry.name}
                      </span>
                      <div className="w-32 h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: entry.color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-fg w-12 text-right">
                        {entry.value}
                      </span>
                      <span className="text-xs text-fg-muted w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineOfficeBuilding className="h-5 w-5 text-cyan-600" />
              <h3 className="text-lg font-semibold text-fg">
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
                    <tr className="border-b border-line-subtle">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Office
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Male
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Female
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-faint">
                    {officeData.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-subtle"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-fg">
                          {row.office}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-fg-3">
                          {row.Male}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-fg-3">
                          {row.Female}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-fg">
                          {row.Male + row.Female}
                        </td>
                      </tr>
                    ))}
                    {officeData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-fg-muted"
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
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <XAxis
                    dataKey="office"
                    angle={-60}
                    interval={0}
                    textAnchor="end"
                    height={150}
                    tickFormatter={truncateAxisLabel}
                    tick={{ fontSize: 11, fill: CHART.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: CHART.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-fg-4">{value}</span>
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

        <div className="mb-12 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineAcademicCap className="h-5 w-5 text-secondary-600" />
              <h3 className="text-lg font-semibold text-fg">
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
                    <tr className="border-b border-line-subtle">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        College
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Male
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Female
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-faint">
                    {collegeData.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-subtle"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-fg">
                          {row.college}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-fg-3">
                          {row.Male}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-fg-3">
                          {row.Female}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-fg">
                          {row.Male + row.Female}
                        </td>
                      </tr>
                    ))}
                    {collegeData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-fg-muted"
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
                  margin={{ top: 10, right: 10, left: 60, bottom: 10 }}
                >
                  <XAxis
                    dataKey="college"
                    angle={-45}
                    interval={0}
                    textAnchor="end"
                    height={130}
                    tickFormatter={truncateAxisLabel}
                    tick={{ fontSize: 11, fill: CHART.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: CHART.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-fg-4">{value}</span>
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

        <div className="mb-12 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineUserGroup className="h-5 w-5 text-secondary-600" />
              <h3 className="text-lg font-semibold text-fg">
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
                    <tr className="border-b border-line-subtle">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Year Level
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Male
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Female
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-faint">
                    {yearLineData.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-subtle"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-fg">
                          {row.year}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-fg-3">
                          {row.Male}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-fg-3">
                          {row.Female}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-fg">
                          {row.Male + row.Female}
                        </td>
                      </tr>
                    ))}
                    {yearLineData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-fg-muted"
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
                    tick={{ fontSize: 12, fill: CHART.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: CHART.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-fg-4">{value}</span>
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