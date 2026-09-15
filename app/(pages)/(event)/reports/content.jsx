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

const REPORT_TYPES = [
  {
    value: "gar",
    label: "GAD Accomplishment Report (GAR)",
    mode: "download",
  },
  {
    value: "students",
    label: "Gender Profile (Students)",
    mode: "download",
  },
  {
    value: "employees",
    label: "Gender Profile (Employees)",
    mode: "download",
  },
];

const COLLEGES = [
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
];

export default function ReportsContent() {
  const router = useRouter();

  const [years, setYears] = useState([]);
  const [year, setYear] = useState("");
  const [reportType, setReportType] = useState("gar");
  const [scope, setScope] = useState("");
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

  /* Readiness check whenever the year changes */
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
      const params = new URLSearchParams();
      let endpoint;
      if (type === "gar") {
        endpoint = `/api/reports/gad-ar?year=${encodeURIComponent(year)}`;
      } else {
        if (type === "students" || type === "employees")
          params.set("type", type);
        if (scope) params.set("college", scope);
        endpoint = `/api/analytics/sex-disaggregated-data/report?${params.toString()}`;
      }

      const res = await axios.get(endpoint, { responseType: "blob" });

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      const names = {
        gar: `gad-accomplishment-report-${year}.pdf`,
        students: "gender-profile-students.pdf",
        employees: "gender-profile-employees.pdf",
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

    if (type.value === "gar" && !year) {
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
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="">University-wide</option>
              {COLLEGES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !year}
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

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Available Reports
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            One-click downloads; the GAR opens the print preview workspace.
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




