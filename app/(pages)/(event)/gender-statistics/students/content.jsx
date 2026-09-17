"use client";

import { useEffect, useMemo, useState } from "react";
import { FaUserGraduate } from "react-icons/fa";
import { COLLEGES, COLLEGE_TO_PROGRAMS } from "@/lib/colleges";
import {
  useGenderStats,
  LoadingState,
  ErrorState,
  SummaryCards,
  SexDonut,
  StackedSexBar,
  StackedSexBarVertical,
  DemographicTable,
} from "../components/GenderStatsShared";
import {
  EMPTY_STUDENT_FILTERS,
  STUDENT_TYPE_ORDER,
  YEAR_LEVEL_ORDER,
  activeFilterCount,
  computeStudentStats,
  filterStudentRecords,
} from "../components/studentStats";
import {
  SAMPLE_STUDENT_COUNT,
  SAMPLE_STUDENT_RECORDS,
} from "../components/studentSampleRecords";
import {
  STUDENT_QUICK_REPORT_OPTIONS,
  downloadStudentQuickReport,
} from "../components/quickReportsStudents";

const CAMPUSES = ["Boac", "Gasan", "Sta. Cruz"];

const ALL_PROGRAMS = Object.values(COLLEGE_TO_PROGRAMS).flat();

const FILTER_LABELS = {
  campus: "Campus",
  college: "College",
  course: "Program",
  yearLevel: "Year Level",
  studentType: "Student Type",
  schoolYear: "Academic Year",
  semester: "Semester",
};

/** Human-readable one-liner of the active filters, printed on each PDF. */
function buildFilterSummary(filters) {
  return Object.entries(filters || {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${FILTER_LABELS[key] || key}: ${value}`)
    .join("; ");
}

function buildInsights(data) {
  const t = data?.totals;
  if (!t || !t.total) return [];
  const insights = [];

  insights.push(
    `Female students constitute ${t.pctFemale}% of the total student population (${t.Female.toLocaleString()} of ${t.total.toLocaleString()}).`,
  );
  insights.push(
    `Male students account for ${t.pctMale}% (${t.Male.toLocaleString()}) of enrolled students.`,
  );

  const colleges = (data.byCollege || []).filter((c) => c.total >= 5);
  if (colleges.length > 1) {
    const mostFemale = [...colleges].sort((a, b) => b.pctFemale - a.pctFemale)[0];
    const mostMale = [...colleges].sort((a, b) => a.pctFemale - b.pctFemale)[0];
    insights.push(
      `${mostFemale.college} has the highest share of female students (${mostFemale.pctFemale}%).`,
    );
    insights.push(
      `${mostMale.college} is the most male-dominated college (${100 - mostMale.pctFemale}% male).`,
    );
    insights.push(
      `${colleges[0].college} is the largest college by enrollment (${colleges[0].total.toLocaleString()} students).`,
    );
  }

  const programs = data.byProgram || [];
  if (programs.length > 0) {
    insights.push(
      `${programs[0].program} is the largest program by enrollment (${programs[0].total.toLocaleString()} students, ${programs[0].pctFemale}% female).`,
    );
  }

  if (t.Other > 0) {
    insights.push(
      `${t.Other.toLocaleString()} student${t.Other === 1 ? "" : "s"} (${t.pctOther}%) are recorded as non-binary / other gender identity.`,
    );
  }

  return insights;
}

export default function StudentGenderStatsContent() {
  const [campus, setCampus] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [semester, setSemester] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [studentType, setStudentType] = useState("");
  const [useSample, setUseSample] = useState(false);

  const params = useMemo(
    () => ({
      ...(campus ? { campus } : {}),
      ...(college ? { college } : {}),
      ...(course ? { course } : {}),
      ...(schoolYear ? { school_year: schoolYear } : {}),
      ...(semester ? { semester } : {}),
      ...(yearLevel ? { year_level: yearLevel } : {}),
      ...(studentType ? { student_type: studentType } : {}),
    }),
    [campus, college, course, schoolYear, semester, yearLevel, studentType],
  );

  const { data, loading, error, refetch } = useGenderStats("students", params);

  const filters = useMemo(
    () => ({
      campus,
      college,
      course,
      yearLevel,
      studentType,
      schoolYear,
      semester,
    }),
    [campus, college, course, yearLevel, studentType, schoolYear, semester],
  );

  /* Demo dataset: individual records (../components/studentSampleRecords), so
     every filter - including year level and student type - re-aggregates the
     same way the API would. The JSON snapshot in ../data/sample-students.json
     is only a fixture for tests/scripts; regenerate it with
     `node scripts/generate-sample-students.mjs`. */
  const filteredSampleRecords = useMemo(
    () => filterStudentRecords(SAMPLE_STUDENT_RECORDS, filters),
    [filters],
  );
  const sampleStats = useMemo(
    () => computeStudentStats(filteredSampleRecords, SAMPLE_STUDENT_RECORDS),
    [filteredSampleRecords],
  );

  const activeData = useSample ? sampleStats : data;

  const programOptions = useMemo(() => {
    if (college && COLLEGE_TO_PROGRAMS[college]) return COLLEGE_TO_PROGRAMS[college];
    return ALL_PROGRAMS;
  }, [college]);

  const yearLevelOptions = activeData?.yearLevels || YEAR_LEVEL_ORDER;

  const studentTypeOptions = activeData?.studentTypes || STUDENT_TYPE_ORDER;

  /* Academic-year and semester options follow the active dataset, so sample
     mode lists the sample terms instead of the live ones (the sample dataset
     covers 2021-2022 to 2024-2025, the live data starts 2025-2026). */
  const schoolYearOptions = activeData?.schoolYears || [];
  const semesterOptions = activeData?.semesters || [];

  const totals = activeData?.totals || { Female: 0, Male: 0, Other: 0, total: 0 };
  const insights = useMemo(() => buildInsights(activeData), [activeData]);
  const showContent = useSample || (!loading && !!data);
  const filterCount = activeFilterCount(filters);

  const deltas = useMemo(() => {
    const years = activeData?.byAcademicYear || [];
    if (!schoolYear || years.length < 2) return null;
    const idx = years.findIndex((y) => y.school_year === schoolYear);
    if (idx <= 0) return null;
    const cur = years[idx];
    const prev = years[idx - 1];
    const pct = (curr, prv) =>
      prv > 0 ? Math.round(((curr - prv) / prv) * 1000) / 10 : null;
    return {
      Female: pct(cur.Female, prev.Female),
      Male: pct(cur.Male, prev.Male),
      Other:
        cur.Other > 0 || prev.Other > 0 ? pct(cur.Other, prev.Other) : null,
    };
  }, [activeData, schoolYear]);

  /* Always pin to a specific AY: default to the latest year and drop a year the
     current dataset does not contain (the sample dataset starts 2021-2022). */
  useEffect(() => {
    const years = activeData?.schoolYears || [];
    if (!years.length) return;
    if (!schoolYear || !years.includes(schoolYear)) setSchoolYear(years[0]);
  }, [activeData, schoolYear]);

  /* Semester always resolves to the latest one available in the selected AY */
  useEffect(() => {
    const list = activeData?.semesters || [];
    if (schoolYear && list.length > 0 && !list.includes(semester)) {
      setSemester(list[list.length - 1]);
    }
  }, [activeData?.semesters, schoolYear, semester]);

  const clearFilters = () => {
    setCampus(EMPTY_STUDENT_FILTERS.campus);
    setCollege(EMPTY_STUDENT_FILTERS.college);
    setCourse(EMPTY_STUDENT_FILTERS.course);
    setYearLevel(EMPTY_STUDENT_FILTERS.yearLevel);
    setStudentType(EMPTY_STUDENT_FILTERS.studentType);
    setSchoolYear(EMPTY_STUDENT_FILTERS.schoolYear);
    setSemester(EMPTY_STUDENT_FILTERS.semester);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-200">
            <FaUserGraduate size={18} />
          </span>
          Student Gender Statistics
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Explore the distribution of female and male students by sex, academic
          level, program, and other demographic indicators.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Academic Year
          </label>
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {schoolYearOptions.length === 0 && (
              <option value="">No academic year data</option>
            )}
            {schoolYearOptions.map((y) => (
              <option key={y} value={y}>
                AY {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Semester
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {semesterOptions.length === 0 && (
              <option value="">No semester data</option>
            )}
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                {s === "1st"
                  ? "1st Semester"
                  : s === "2nd"
                    ? "2nd Semester"
                    : "Summer"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Campus
          </label>
          <select
            value={campus}
            onChange={(e) => {
              setCampus(e.target.value);
              setCourse("");
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Campuses</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            College
          </label>
          <select
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setCourse("");
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[16rem]"
          >
            <option value="">All Colleges</option>
            {COLLEGES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Program
          </label>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[16rem]"
          >
            <option value="">All Programs</option>
            {programOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Year Level
          </label>
          <select
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Year Levels</option>
            {yearLevelOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Student Type
          </label>
          <select
            value={studentType}
            onChange={(e) => setStudentType(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[16rem]"
          >
            <option value="">All Student Types</option>
            {studentTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Data source
          </label>
          <button
            type="button"
            onClick={() => setUseSample((prev) => !prev)}
            aria-pressed={useSample}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              useSample
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                useSample ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            {useSample ? "Sample data" : "Live data"}
          </button>
        </div>
        {filterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Clear filters ({filterCount})
          </button>
        )}
      </div>

      {useSample && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Showing synthetic <strong>sample data</strong> for{" "}
          {SAMPLE_STUDENT_COUNT.toLocaleString()} students, expanded into
          individual records from{" "}
          <code className="mx-1">data/sample-students.json</code> so every
          filter composes. Your database is not being read and nothing is
          saved - turn the toggle off to return to live data.
        </div>
      )}

      {!useSample && error && <ErrorState message={error} onRetry={refetch} />}

      <p className="text-xs text-gray-400 -mt-2">
        Students enrolled in both semesters of the same academic year are
        counted once per year.
      </p>

      {!useSample && loading && <LoadingState />}

      {useSample && filterCount > 0 && filteredSampleRecords.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          No sample students match the selected filters -{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="font-semibold underline underline-offset-2"
          >
            clear the filters
          </button>{" "}
          to see all {SAMPLE_STUDENT_COUNT.toLocaleString()} students.
        </div>
      )}

      {showContent && (
        <>
          <SummaryCards totals={totals} what="Students" deltas={deltas} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SexDonut totals={totals} />
            <StackedSexBarVertical
              title="Students by Academic Level and Sex"
              data={activeData.byLevel || []}
              nameKey="level"
            />
          </div>

          {Array.isArray(activeData.byStudentType) &&
            activeData.byStudentType.length > 0 && (
              <StackedSexBarVertical
                title="Students by Student Type and Sex"
                data={activeData.byStudentType}
                nameKey="type"
              />
            )}

          {Array.isArray(activeData.byYearLevel) &&
            activeData.byYearLevel.length > 0 && (
              <StackedSexBarVertical
                title="Students by Year Level and Sex"
                data={activeData.byYearLevel}
                nameKey="year_level"
              />
            )}

          <StackedSexBar
            title="Students by College / Unit and Sex"
            data={activeData.byCollege || []}
            nameKey="college"
          />

          <StackedSexBarVertical
            title="Enrollment by Academic Year and Sex"
            data={activeData.byAcademicYear || []}
            nameKey="school_year"
          />

          <TopProgramsTable rows={activeData.byProgram || []} />
          <DemographicTable
            rows={activeData.demographics || []}
            total={totals.total}
          />
          <KeyInsightsCard insights={insights} />
          <QuickReportsCard
            data={activeData}
            useSample={useSample}
            filters={filters}
          />
        </>
      )}
    </div>
  );
}

function TopProgramsTable({ rows }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Top 10 Programs by Gender Population
      </h3>
      {safeRows.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Program</th>
                <th className="py-2 pr-3 font-medium text-right">Female</th>
                <th className="py-2 pr-3 font-medium text-right">Male</th>
                <th className="py-2 pr-3 font-medium text-right">Other</th>
                <th className="py-2 pr-3 font-medium text-right">Total</th>
                <th className="py-2 font-medium text-right">% Female</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.map((r, i) => (
                <tr
                  key={r.program}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                >
                  <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-2.5 pr-3 font-medium text-gray-800">
                    {r.program}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-pink-600 font-medium">
                    {r.Female}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-blue-600 font-medium">
                    {r.Male}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-gray-500">
                    {r.Other}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">
                    {r.total}
                  </td>
                  <td className="py-2.5 text-right text-xs text-gray-500">
                    {r.pctFemale}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KeyInsightsCard({ insights }) {
  const list = Array.isArray(insights) ? insights : [];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        📌 Key Insights
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          No insights available for the current data.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pink-500 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuickReportsCard({ data, useSample = false, filters }) {
  const [busy, setBusy] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");

  const filterSummary = useMemo(() => buildFilterSummary(filters), [filters]);

  /* One button per report kind - each renders its own separate PDF from the
     breakdown currently on screen (works for live and sample data alike). */
  const downloadQuick = async (kind) => {
    setBusy(kind);
    setStatus("");
    try {
      await downloadStudentQuickReport(kind, data, {
        isSample: useSample,
        filterSummary,
      });
      setStatus("Report ready - download started.");
    } catch (err) {
      setStatus("Could not generate the report. Please try again.");
    } finally {
      setBusy("");
    }
  };

  /* The server-side report stitches every section together from live records
     only, so it is offered alongside - not instead of - the client reports. */
  const downloadStudentReport = async () => {
    setDownloading(true);
    setStatus("");
    try {
      const res = await fetch(
        "/api/analytics/sex-disaggregated-data/report?type=students",
        { method: "GET" },
      );
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        (res.headers.get("content-disposition") || "").split("filename=")[1] ||
        "student-gender-statistics-report.pdf";
      link.href = url;
      link.download = filename.replace(/"/g, "");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Report ready — download started.");
    } catch (err) {
      setStatus("Could not generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const buttonClass =
    "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        ⬇ Quick Reports
      </h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Each button generates its own separate PDF from the data currently
        shown{useSample ? " (sample dataset)" : ""}.
      </p>
      <div className="flex flex-wrap gap-3">
        {STUDENT_QUICK_REPORT_OPTIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            onClick={() => downloadQuick(option.kind)}
            disabled={Boolean(busy)}
            title={option.title}
            className={buttonClass}
          >
            {busy === option.kind ? "Generating…" : option.label}
          </button>
        ))}
      </div>

      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mt-5 mb-2">
        Other GAD report links
      </h4>
      <div className="flex flex-wrap gap-3">
        {!useSample && (
          <button
            type="button"
            onClick={downloadStudentReport}
            disabled={downloading}
            className={buttonClass}
          >
            {downloading ? "Generating…" : "Full Student Gender Report (PDF)"}
          </button>
        )}
        <a href="/gad-ars" className={buttonClass}>
          GAD Accomplishment Report
        </a>
        <a href="/project-monitoring/gad-projects" className={buttonClass}>
          GAD Projects Summary
        </a>
      </div>
      {status && <p className="text-xs text-gray-500 mt-2">{status}</p>}
    </div>
  );
}


