"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaFileAlt,
  FaInfoCircle,
} from "react-icons/fa";
import {
  SAMPLE_QUICK_REPORTS,
  SAMPLE_REPORT_SCHOOL_YEARS,
  SAMPLE_REPORT_SEMESTERS,
  downloadSampleQuickReport,
  isSampleAllYearsReport,
  isSampleQuickReport,
} from "./sampleGenderProfiles";

const REPORT_TYPES = [
  {
    value: "gar",
    label: "GAD Accomplishment Report (GAR)",
    mode: "download",
  },
  {
    value: "students",
    label: "Gender Profile (Students) — Sample",
    mode: "download",
  },
  {
    value: "employees",
    label: "Gender Profile (Employees) — Sample",
    mode: "download",
  },
  {
    value: "employees-position-level",
    label: "Personnel by Position Level — Sample",
    mode: "download",
  },
  {
    value: "employees-gender-gap",
    label: "Gender Gap Analysis (Faculty & Personnel) — Sample",
    mode: "download",
  },
  {
    value: "students-enrollment",
    label: "Enrollment by Program — Sample",
    mode: "download",
  },
  {
    value: "students-gender-gap",
    label: "Gender Gap Analysis (Students) — Sample",
    mode: "download",
  },
  {
    value: "students-intersectional",
    label: "Intersectional Analysis — Sample",
    mode: "download",
  },
  {
    value: "students-multi-year",
    label: "Comparative Multi-Year Enrollment — Sample",
    mode: "download",
  },
  {
    value: "gpb-matrix",
    label: "GPB Plan and Budget Matrix",
    mode: "download",
  },
  {
    value: "milestones",
    label: "GAD Projects Milestone Progress",
    mode: "download",
  },
  {
    value: "projects-events",
    label: "Projects & Events Status (Quarterly)",
    mode: "download",
  },
];

/* Quarter filter for the milestone progress report. A milestone is grouped by
   its target date; the actual date is the fallback when no target is set. */
const QUARTERS = [
  { value: "", label: "All quarters (full year)" },
  { value: "breakdown", label: "Per-quarter breakdown (all quarters)" },
  { value: "1", label: "Q1 — January to March" },
  { value: "2", label: "Q2 — April to June" },
  { value: "3", label: "Q3 — July to September" },
  { value: "4", label: "Q4 — October to December" },
];

/* The per-quarter breakdown is a milestone-report variant only. */
const quarterOptionsFor = (reportType) =>
  reportType === "milestones"
    ? QUARTERS
    : QUARTERS.filter((option) => option.value !== "breakdown");

const QUARTER_REPORT_TYPES = ["milestones", "projects-events"];

/* Display labels for the sample term values (1st / 2nd / Summer). */
const SEMESTER_LABEL = {
  "1st": "1st Semester",
  "2nd": "2nd Semester",
  Summer: "Summer",
};

export default function ReportsContent() {
  const router = useRouter();

  const [years, setYears] = useState([]);
  const [year, setYear] = useState("");
  /* Academic year for the sample-based reports; "" keeps the whole five-year
     sample window, exactly like "All academic years" on Gender Statistics. */
  const [sampleYear, setSampleYear] = useState("");
  /* Semester for the student sample reports; "" keeps every term, matching the
     "All semesters" default. Employee reports have no semester history. */
  const [sampleSemester, setSampleSemester] = useState("");
  const [reportType, setReportType] = useState("gar");
  const [quarter, setQuarter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  /* Load available years from the GPB collection */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("/api/gpb");
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        const ys = [...new Set(list.map((g) => Number(g.year)).filter(Boolean))]
          .sort((a, b) => b - a);
        if (!mounted) return;
        setYears(ys);
        setYear((prev) => prev || String(ys[0] || ""));
      } catch {
        if (mounted) setYears([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);


  const loadReadiness = useCallback(async (y) => {
    if (!y) return;
    setReadinessLoading(true);
    try {
      const res = await axios.get(
        `/api/analytics/report-readiness?year=${encodeURIComponent(y)}`,
      );
      setReadiness(res.data || null);
    } catch {
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReadiness(year);
  }, [year, loadReadiness]);

  const downloadReport = async (type) => {
    setGenerating(true);
    setStatus("");
    setError("");
    try {

      if (isSampleQuickReport(type)) {
        /* The comparative multi-year report always spans the whole sample
           window, so a year left selected for another report type is ignored. */
        const reportAllYears = isSampleAllYearsReport(type);
        const reportSampleYear = reportAllYears ? "" : sampleYear;
        /* Only student reports carry a semester term history, and the
           comparative multi-year report keeps the whole window. */
        const reportSemester =
          reportAllYears || SAMPLE_QUICK_REPORTS[type].source !== "students"
            ? ""
            : sampleSemester;
        await downloadSampleQuickReport(type, {
          schoolYear: reportSampleYear,
          semester: reportSemester,
        });
        const scope = [
          reportSampleYear ? `AY ${reportSampleYear}` : "",
          reportSemester ? SEMESTER_LABEL[reportSemester] || reportSemester : "",
        ]
          .filter(Boolean)
          .join(", ");
        setStatus(
          `${SAMPLE_QUICK_REPORTS[type].label}${
            scope ? ` (${scope})` : " (all sample years)"
          } generated from sample data — download started.`,
        );
        return;
      }

      const params = new URLSearchParams();
      let endpoint;
      if (type === "gar") {
        endpoint = `/api/reports/gad-ar?year=${encodeURIComponent(year)}`;
      } else if (type === "milestones") {
        if (quarter === "breakdown") {
          params.set("mode", "breakdown");
        } else if (quarter) {
          params.set("mode", "quarter");
          params.set("quarter", quarter);
        } else {
          params.set("mode", "overall");
        }
        endpoint = `/api/reports/gpb-progress?year=${encodeURIComponent(year)}&${params.toString()}`;
      } else if (type === "gpb-matrix") {
        endpoint = `/api/reports/gpb-matrix?year=${encodeURIComponent(year)}`;
      } else if (type === "projects-events") {
        /* The API treats a missing quarter as the whole academic year. */
        const quarterParam =
          quarter && quarter !== "breakdown" ? `&quarter=${quarter}` : "";
        endpoint = `/api/reports/projects-events?year=${encodeURIComponent(year)}${quarterParam}`;
      }

      const res = await axios.get(endpoint, { responseType: "blob" });

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      const names = {
        gar: `gad-accomplishment-report-${year}.pdf`,
        "gpb-matrix": `gpb-matrix-${year}.pdf`,
        milestones: `gpb-progress-${year}${
          quarter === "breakdown"
            ? "-by-quarter"
            : quarter
              ? `-q${quarter}`
              : ""
        }.pdf`,
        "projects-events": `projects-events-status-${year}${
          quarter && quarter !== "breakdown" ? `-q${quarter}` : ""
        }.pdf`,
      };
      const filename =
        (res.headers?.["content-disposition"] || "").split("filename=")[1] ||
        names[type] ||
        "gad-report.pdf";
      link.href = url;
      link.download = filename.replace(/"/g, "");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Report generated — download started.");
    } catch (err) {
      setError("Could not generate the report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    const type = REPORT_TYPES.find((t) => t.value === reportType);
    if (!type) return;

    /* Sample-based gender profiles are generated in the browser and need no
       academic year; the database-backed reports do. */
    if (!isSampleQuickReport(type.value) && !year) {
      setError("Select an academic year first.");
      return;
    }

    downloadReport(type.value);
  };

  const readinessItems = useMemo(() => {
    if (!readiness) return [];
    const items = [];

    const { projects, events, gpbStatus } = readiness;

    if (projects?.total === 0) {
      items.push({
        level: "info",
        text: "No GAD projects are filed for this academic year yet.",
      });
    }

    if (projects?.missingAccomplishments?.length > 0) {
      items.push({
        level: "warning",
        text: `${projects.missingAccomplishments.length} project${projects.missingAccomplishments.length === 1 ? "" : "s"} still missing actual accomplishments.`,
        href: `/project-monitoring/gad-projects?focus=${projects.missingAccomplishments[0].id}`,
        linkLabel: "Encode in GAD Projects",
      });
    }
    if (projects?.missingEvidence?.length > 0) {
      items.push({
        level: "warning",
        text: `${projects.missingEvidence.length} project${projects.missingEvidence.length === 1 ? "" : "s"} with expenditures but no evidence attached (audit risk).`,
        href: `/project-monitoring/gad-projects?focus=${projects.missingEvidence[0].id}`,
        linkLabel: "Attach evidence",
      });
    }
    if (events?.missingReports?.length > 0) {
      items.push({
        level: "warning",
        text: `${events.missingReports.length} completed event${events.missingReports.length === 1 ? "" : "s"} without an accomplishment report (ACR).`,
        href: "/gad-ars",
        linkLabel: "View ACRs",
      });
    }
    if (
      projects?.total > 0 &&
      projects?.missingAccomplishments?.length === 0 &&
      projects?.missingEvidence?.length === 0 &&
      events?.missingReports?.length === 0
    ) {
      items.push({
        level: "ok",
        text: "All projects have accomplishments, evidence, and event reports. Ready to generate.",
      });
    }
    if (gpbStatus && gpbStatus !== "approved") {
      items.push({
        level: "info",
        text: `GPB ${readiness.year} is not yet approved (status: ${gpbStatus}).`,
      });
    }
    return items;
  }, [readiness]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <FaFileAlt size={18} />
          </span>
          Generate Report
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Reports Module — select a report and check data readiness before
          generating.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                /* Some quarters only exist for one report type. */
                setQuarter("");
                /* The semester filter only applies to the student sample
                   reports, so it resets whenever the type changes. */
                setSampleSemester("");
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Every report except the comparative multi-year one accepts an
              academic year: the database-backed reports use the GPB years, the
              sample-based reports the five-year sample window, where "All
              academic years" keeps the whole sample population exactly as
              before. */}
          {isSampleAllYearsReport(reportType) ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Academic Year
              </label>
              <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                All sample years (AY {SAMPLE_REPORT_SCHOOL_YEARS[0]} to{" "}
                {SAMPLE_REPORT_SCHOOL_YEARS[SAMPLE_REPORT_SCHOOL_YEARS.length - 1]})
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                A comparative multi-year report always covers every sample year,
                so it has no academic-year filter.
              </p>
            </div>
          ) : isSampleQuickReport(reportType) ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Academic Year
              </label>
              <select
                value={sampleYear}
                onChange={(e) => setSampleYear(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">All academic years</option>
                {[...SAMPLE_REPORT_SCHOOL_YEARS].reverse().map((y) => (
                  <option key={y} value={y}>
                    AY {y}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Sample window: AY {SAMPLE_REPORT_SCHOOL_YEARS[0]} to{" "}
                {SAMPLE_REPORT_SCHOOL_YEARS[SAMPLE_REPORT_SCHOOL_YEARS.length - 1]}{" "}
                — every sample year is a complete snapshot.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Academic Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                {years.length === 0 && <option value="">No years available</option>}
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    AY {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student sample reports can also pin a semester; the sample term
              history is the only dataset that carries one. */}
          {isSampleQuickReport(reportType) &&
            !isSampleAllYearsReport(reportType) &&
            SAMPLE_QUICK_REPORTS[reportType]?.source === "students" && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Semester
                </label>
                <select
                  value={sampleSemester}
                  onChange={(e) => setSampleSemester(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="">All semesters</option>
                  {SAMPLE_REPORT_SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {SEMESTER_LABEL[s] || s}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Narrows the sample term history; every sample student holds at
                  least one term in each enrolled year.
                </p>
              </div>
            )}

          {QUARTER_REPORT_TYPES.includes(reportType) && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Quarter
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                {quarterOptionsFor(reportType).map((q) => (
                  <option key={q.value || "all"} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                {reportType === "milestones"
                  ? "Calendar quarters (Q1 = Jan–Mar … Q4 = Oct–Dec) covering the whole academic year. Each milestone follows its target date (actual date when no target is set); undated ones are listed at the end of the report."
                  : "Calendar quarters (Q1 = Jan–Mar … Q4 = Oct–Dec) covering the whole academic year. Projects follow their start date, events their start date; undated ones are listed at the end of the report."}
              </p>
            </div>
          )}

          {isSampleQuickReport(reportType) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
              Built in your browser from the sample dataset (same source as
              Gender Statistics → Quick Reports), so every figure is complete.
              No database reads — the PDF is marked “Sample data”.{" "}
              {isSampleAllYearsReport(reportType)
                ? "This report always spans the whole five-year sample window; every sample year is a complete snapshot, so the figures stay comparable year to year."
                : "The Academic Year filter narrows the sample window and student reports also accept a Semester; every sample year is a complete snapshot, so the figures stay comparable year to year."}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || (!isSampleQuickReport(reportType) && !year)}
            className="w-full rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating && (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {generating ? "Generating…" : "Generate Report"}
          </button>

          {status && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5">
              <FaCheckCircle size={11} />
              {status}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <FaExclamationTriangle size={11} />
              {error}
            </p>
          )}
        </div>

        {/* The readiness check reads the live database for a specific academic
            year — it does not apply to the sample-based reports. */}
        {!isSampleQuickReport(reportType) && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Data Readiness
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            {year ? `AY ${year}` : "Select a year"} — what's still missing
            before this report is complete.
          </p>

          {readinessLoading ? (
            <p className="text-xs text-gray-400">Checking…</p>
          ) : !readiness ? (
            <p className="text-xs text-gray-400 italic">
              Select an academic year to check readiness.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {readinessItems.length === 0 && (
                <li className="text-xs text-gray-400 italic">
                  Nothing to check yet.
                </li>
              )}
              {readinessItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {item.level === "ok" && (
                    <FaCheckCircle
                      size={12}
                      className="mt-0.5 text-emerald-500 shrink-0"
                    />
                  )}
                  {item.level === "warning" && (
                    <FaExclamationTriangle
                      size={12}
                      className="mt-0.5 text-amber-500 shrink-0"
                    />
                  )}
                  {item.level === "info" && (
                    <FaInfoCircle
                      size={12}
                      className="mt-0.5 text-blue-400 shrink-0"
                    />
                  )}
                  <span
                    className={
                      item.level === "warning"
                        ? "text-amber-700"
                        : item.level === "ok"
                          ? "text-emerald-700"
                          : "text-gray-600"
                    }
                  >
                    {item.text}
                    {item.href && (
                      <Link
                        href={item.href}
                        className="ml-1.5 text-violet-600 font-medium hover:underline"
                      >
                        {item.linkLabel} →
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Available Reports
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            One-click downloads; the GAR opens the print preview workspace and
            the sample-based reports are built in the browser from the sample
            datasets.
          </p>
          <ul className="divide-y divide-gray-100">
            {REPORT_TYPES.map((t) => (
              <li
                key={t.value}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <span className="text-xs text-gray-700 flex items-center gap-2 min-w-0">
                  <FaFileAlt size={11} className="text-gray-400 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {t.value === "gar" && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/gad-ars${year ? `?year=${year}` : ""}`)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      <FaEye size={10} />
                      Preview
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadReport(t.value)}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors disabled:opacity-50"
                    title="Download report"
                  >
                    ⬇
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-gray-400 mt-3 flex items-start gap-1">
            <FaInfoCircle size={9} className="mt-0.5 shrink-0" />
            Actuals are encoded in Project Monitoring → GAD Projects; completed
            events auto-fill their accomplishment lines.
          </p>
        </div>
      </div>
    </div>
  );
}




