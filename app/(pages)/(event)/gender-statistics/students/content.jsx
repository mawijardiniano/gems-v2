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

const CAMPUSES = ["Boac", "Gasan", "Sta. Cruz"];

const ALL_PROGRAMS = Object.values(COLLEGE_TO_PROGRAMS).flat();

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

  const params = useMemo(
    () => ({
      ...(campus ? { campus } : {}),
      ...(college ? { college } : {}),
      ...(course ? { course } : {}),
      ...(schoolYear ? { school_year: schoolYear } : {}),
      ...(semester ? { semester } : {}),
    }),
    [campus, college, course, schoolYear, semester],
  );

  const { data, loading, error, refetch } = useGenderStats("students", params);

  const programOptions = useMemo(() => {
    if (college && COLLEGE_TO_PROGRAMS[college]) return COLLEGE_TO_PROGRAMS[college];
    return ALL_PROGRAMS;
  }, [college]);

  const totals = data?.totals || { Female: 0, Male: 0, Other: 0, total: 0 };
  const insights = useMemo(() => buildInsights(data), [data]);

  const deltas = useMemo(() => {
    const years = data?.byAcademicYear || [];
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
  }, [data, schoolYear]);

  /* Always pin to a specific AY: default to the latest year */
  useEffect(() => {
    if (!loading && data?.schoolYears?.length && !schoolYear) {
      setSchoolYear(data.schoolYears[0]);
    }
  }, [data, loading, schoolYear]);

  /* Semester always resolves to the latest one available in the selected AY */
  useEffect(() => {
    const list = data?.semesters || [];
    if (schoolYear && list.length > 0 && !list.includes(semester)) {
      setSemester(list[list.length - 1]);
    }
  }, [data?.semesters, schoolYear, semester]);

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
            {(data?.schoolYears || []).length === 0 && (
              <option value="">No academic year data</option>
            )}
            {(data?.schoolYears || []).map((y) => (
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
            {(data?.semesters || []).length === 0 && (
              <option value="">No semester data</option>
            )}
            {(data?.semesters || []).map((s) => (
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
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      <p className="text-xs text-gray-400 -mt-2">
        Students enrolled in both semesters of the same academic year are
        counted once per year.
      </p>

      {loading && <LoadingState />}

      {!loading && data && (
        <>
          <SummaryCards totals={totals} what="Students" deltas={deltas} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SexDonut totals={totals} />
            <StackedSexBarVertical
              title="Students by Academic Level and Sex"
              data={data.byLevel || []}
              nameKey="level"
            />
          </div>

          <StackedSexBar
            title="Students by College / Unit and Sex"
            data={data.byCollege || []}
            nameKey="college"
          />

          <StackedSexBarVertical
            title="Enrollment by Academic Year and Sex"
            data={data.byAcademicYear || []}
            nameKey="school_year"
          />

          <TopProgramsTable rows={data.byProgram || []} />
          <DemographicTable rows={data.demographics || []} total={totals.total} />
          <KeyInsightsCard insights={insights} />
          <QuickReportsCard />
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

function QuickReportsCard() {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");

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

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        ⬇ Quick Reports
      </h3>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={downloadStudentReport}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? "Generating…" : "Student Gender Report (PDF)"}
        </button>
        <a
          href="/gad-ars"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
        >
          GAD Accomplishment Report
        </a>
        <a
          href="/project-monitoring/gad-projects"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
        >
          GAD Projects Summary
        </a>
      </div>
      {status && <p className="text-xs text-gray-500 mt-2">{status}</p>}
    </div>
  );
}


