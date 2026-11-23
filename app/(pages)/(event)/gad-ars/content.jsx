"use client";

import React, { useEffect, useState, useCallback, useId } from "react";
import { useSearchParams } from "next/navigation";
import { useDialog } from "@/hooks/useDialog";
import { formatAmount } from "@/data/lib/money";
import {
  FaFileAlt,
  FaTimes,
  FaExclamationTriangle,
  FaFolderOpen,
  FaPaperclip,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import PrintGADAR from "../components/Print/PrintGADAR";
import { resolveAccomplishmentText } from "@/data/lib/accomplishmentSummary";
import { fileKeyOf } from "@/data/lib/eventFileKeys";
/* Shared with the print and the server PDF, so all three group, label and
   fill rows the same way. */
import {
  activityPairs,
  fieldList as getArrayValue,
  fieldValue as getFieldValue,
  isActualResultReported,
  orderProjectsByType,
  projectTypeLabel as getProjectTypeLabel,
} from "@/data/lib/reportFields";
import Button from "@/components/ui/Button";

const getEvidenceFileType = (file) => {
  const name = `${file?.name || ""} ${file?.url || ""}`.toLowerCase();
  if (/\.(png|jpe?g)(\?|$)/.test(name)) return "image";
  if (name.includes(".pdf")) return "pdf";
  return "other";
};

const getEvidenceProxyUrl = (file) => {
  const key = fileKeyOf(file);
  if (!key) return null;
  return `/api/files/proxy?key=${encodeURIComponent(key)}`;
};

const getEvidenceDownloadUrl = (file) => {
  const key = fileKeyOf(file);
  if (!key) return null;
  const nameParam = file?.name ? `&name=${encodeURIComponent(file.name)}` : "";
  return `/api/download?key=${encodeURIComponent(key)}${nameParam}`;
};

const getProjectContextLabel = (project) => {
  const label = getFieldValue(project?.gender_issue) || "";
  if (!label) return "Project";
  return label.length > 60 ? `${label.slice(0, 60)}...` : label;
};

export default function GADARContent() {
  const searchParams = useSearchParams();

  const [gpbList, setGpbList] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [projects, setProjects] = useState([]);
  const [gaaBudget, setGaaBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState("");
  /* Set when the year's projects could not be loaded, so a failure does not
     read as "No projects found". */
  const [projectsError, setProjectsError] = useState("");

  /* The page had a whole actuals editor here (state, upload, save) that
     nothing opened, and that called an undefined function. Actuals are
     encoded from the GAD projects page (ActualsEncoderModal). */
  const [evidenceViewer, setEvidenceViewer] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const fetchGPBList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gpb");
      const data = await res.json();
      if (res.ok && data.success) {
        setGpbList(data.data || []);
        if (data.data?.length > 0) {
          const sorted = [...data.data].sort((a, b) => b.year - a.year);
          const requested = searchParams?.get("year");
          const match = requested
            ? sorted.find((g) => String(g.year) === requested)
            : null;
          setSelectedYear(String((match || sorted[0]).year));
        }
      } else {
        setError(data.message || "Failed to load GPB records");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchGPBList();
  }, [fetchGPBList]);

  /* `cancelled` drops a response for a year no longer selected: switching
     years quickly let the older, slower response overwrite the newer one. */
  useEffect(() => {
    if (!selectedYear) return;
    let cancelled = false;

    (async () => {
      setLoadingProjects(true);
      setProjectsError("");
      let nextProjects = [];
      let nextBudget = null;
      let nextError = "";
      try {
        const res = await fetch(`/api/gpb/${selectedYear}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.data) {
          nextProjects = data.data.projects || [];
          nextBudget = data.data.gaaBudgetId || null;
        } else if (res.status !== 404) {
          nextError =
            data.message || data.error || "Failed to load the GAD projects.";
        }
      } catch {
        nextError = "Network error. Please try again.";
      }
      if (cancelled) return;
      setProjects(nextProjects);
      setGaaBudget(nextBudget);
      setProjectsError(nextError);
      setLoadingProjects(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const resetPreviewState = () => {
    setPreviewLoading(true);
    setPreviewError("");
  };

  const openEvidenceViewer = (files, index = 0, contextLabel = "") => {
    const list = Array.isArray(files) ? files : [];
    if (list.length === 0) return;
    setEvidenceViewer({
      files: list,
      index: Math.min(Math.max(Number(index) || 0, 0), list.length - 1),
      contextLabel,
    });
    resetPreviewState();
  };

  const downloadEvidenceFile = (file) => {
    const url = getEvidenceDownloadUrl(file);
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    if (!evidenceViewer) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        setEvidenceViewer((v) =>
          v ? { ...v, index: Math.max(0, v.index - 1) } : v,
        );
        resetPreviewState();
      } else if (e.key === "ArrowRight") {
        setEvidenceViewer((v) =>
          v ? { ...v, index: Math.min(v.files.length - 1, v.index + 1) } : v,
        );
        resetPreviewState();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [evidenceViewer]);
  const viewerTitleId = useId();
  const viewerDialogRef = useDialog(() => setEvidenceViewer(null));

  /* en-PH, two decimals, like every other screen; it followed the
     browser's locale and printed "NaN" for a blank amount. */
  const fmt = (n) => formatAmount(Number(n) || 0);

  const totalBudget = projects.reduce(
    (s, p) => s + (Number(getFieldValue(p.gad_budget)) || 0),
    0,
  );
  const totalExpenditures = projects.reduce(
    (s, p) => s + (Number(p.actual_expenditures) || 0),
    0,
  );

  const orderedProjects = orderProjectsByType(projects);

  const viewerFiles = evidenceViewer?.files || [];
  const viewerIndex = evidenceViewer?.index ?? 0;
  const viewerFile = viewerFiles[viewerIndex] || null;
  const viewerFileType = viewerFile ? getEvidenceFileType(viewerFile) : "other";
  const viewerPreviewUrl = viewerFile ? getEvidenceProxyUrl(viewerFile) : null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">
            GAD Accomplishment Report
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Annual GAD Accomplishment Report
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 text-sm border border-line rounded-xl bg-white focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none"
          >
            <option value="">Select Year</option>
            {gpbList.map((g) => (
              <option key={g._id} value={g.year}>
                {g.year}
              </option>
            ))}
          </select>
          <PrintGADAR
            year={selectedYear}
            projects={projects}
            gaaBudget={gaaBudget}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger-border bg-danger-subtle text-danger text-sm animate-slide-up">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-5">
            <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Total Projects
            </p>
            <p className="text-xl font-bold text-fg mt-0.5">
              {projects.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-5">
            <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Total GAD Budget
            </p>
            <p className="text-xl font-bold text-fg mt-0.5">
              ₱ {fmt(totalBudget)}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-5">
            <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Total Actual Expenditures
            </p>
            <p className="text-xl font-bold text-success mt-0.5">
              ₱ {fmt(totalExpenditures)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4 p-6 bg-white rounded-2xl border border-line-subtle">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-emphasis rounded" />
          ))}
        </div>
      ) : !selectedYear ? (
        <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-12 text-center">
          <FaFolderOpen className="h-10 w-10 text-fg-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-fg">
            Select a year to view the GAD AR
          </p>
          <p className="text-xs text-fg-muted mt-1">
            Choose a year from the dropdown above
          </p>
        </div>
      ) : loadingProjects ? (
        <div className="animate-pulse space-y-4 p-6 bg-white rounded-2xl border border-line-subtle">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-emphasis rounded" />
          ))}
        </div>
      ) : projectsError ? (
        <div className="rounded-2xl bg-white border border-red-100 shadow-sm p-12 text-center">
          <FaExclamationTriangle className="h-10 w-10 text-red-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-fg">
            Could not load the GAD projects for {selectedYear}
          </p>
          <p className="text-xs text-fg-muted mt-1">{projectsError}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-12 text-center">
          <FaFileAlt className="h-10 w-10 text-fg-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-fg">
            No projects found for {selectedYear}
          </p>
          <p className="text-xs text-fg-muted mt-1">
            Create GPB projects first to generate the GAD AR
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-line-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-inverse text-white">
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    No.
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Gender Issue / GAD Mandate
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Cause of Gender Issue
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    GAD Result Statement / GAD Objective
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Relevant Organization MFO/PAP or PPA
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    GAD Activity
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Performance Indicator / Target
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Actual Result (Outputs/Outcomes)
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Total Agency Approved Budget
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Actual Cost Expenditure
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Responsible Unit/Office
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {orderedProjects.map((project, idx) => {
                  const projectTypeLabel = getProjectTypeLabel(project);
                  const prevProject = orderedProjects[idx - 1];
                  const prevTypeLabel = prevProject
                    ? getProjectTypeLabel(prevProject)
                    : null;
                  const shouldShowTypeHeader =
                    idx === 0 || prevTypeLabel !== projectTypeLabel;

                  const causes = getArrayValue(project.cause_gender_issue);
                  const objectives = getArrayValue(project.gad_objective);
                  const activities = activityPairs(project);
                  const indicators = getArrayValue(
                    project.performance_indicator_target,
                  );
                  /* Derived from linked events unless the owner saved a
                     manual override. Left blank for an Attributed Program,
                     as on the print and the PDF. */
                  const actualReported = isActualResultReported(project);
                  const actual = actualReported
                    ? resolveAccomplishmentText(project)
                    : "";
                  /* Variance only once actuals are encoded: before that it
                     showed the whole budget as variance. */
                  const hasActuals = Boolean(project.actual_expenditures);

                  return (
                    <React.Fragment key={project._id}>
                      {shouldShowTypeHeader && (
                        <tr className="bg-orange-300 border-y border-black">
                          <td
                            colSpan={11}
                            className="py-2 px-4 text-sm font-semibold text-black"
                          >
                            {projectTypeLabel}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-subtle/80">
                        <td className="px-3 py-4 align-top text-center text-xs font-medium text-fg-2">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {getFieldValue(project.gender_issue) || "—"}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {causes.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-0.5">
                              {causes.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ol>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {objectives.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-0.5">
                              {objectives.map((o, i) => (
                                <li key={i}>{o}</li>
                              ))}
                            </ol>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {getFieldValue(project.relevant_agency) || "—"}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {activities.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-0.5">
                              {activities.map(({ title, description }, i) => (
                                <li key={i}>
                                  {title}
                                  {description && (
                                    <span className="block pl-4 text-fg-muted">
                                      {description}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {indicators.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-0.5">
                              {indicators.map((ind, i) => (
                                <li key={i}>{ind}</li>
                              ))}
                            </ol>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {actual ? (
                            actual
                          ) : !actualReported ? (
                            <span className="text-fg-muted italic">
                              Not reported for Attributed Programs
                            </span>
                          ) : (
                            <span className="text-fg-muted italic">
                              Encode actuals in Project Monitoring → GAD
                              Projects
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-right text-xs font-semibold text-fg">
                          ₱ {fmt(getFieldValue(project.gad_budget))}
                        </td>
                        <td className="px-3 py-4 align-top text-right text-xs font-semibold text-success">
                          <div className="flex items-center justify-end gap-1.5">
                            {project.actual_expenditures
                              ? `₱ ${fmt(project.actual_expenditures)}`
                              : "—"}
                            {Array.isArray(project.expenditure_evidence) &&
                              project.expenditure_evidence.length > 0 && (
                                <button
                                  onClick={() =>
                                    openEvidenceViewer(
                                      project.expenditure_evidence,
                                      0,
                                      getProjectContextLabel(project),
                                    )
                                  }
                                  title={`${project.expenditure_evidence.length} evidence file(s) attached`}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-fg-muted bg-muted border border-line rounded-md hover:bg-emphasis transition"
                                >
                                  <FaPaperclip className="h-2.5 w-2.5" />
                                  {project.expenditure_evidence.length}
                                </button>
                              )}
                          </div>
                          {hasActuals && (
                            <span className="block mt-1 text-xs font-normal text-fg-muted">
                              Variance: ₱{" "}
                              {fmt(
                                (Number(getFieldValue(project.gad_budget)) ||
                                  0) -
                                  (Number(project.actual_expenditures) || 0),
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-fg-2">
                          {getArrayValue(project.responsible_office).join(
                            ", ",
                          ) || "—"}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-subtle border-t-2 border-line">
                  <td
                    colSpan={8}
                    className="px-3 py-3 text-right text-xs font-bold text-fg uppercase"
                  >
                    TOTALS
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-fg">
                    ₱ {fmt(totalBudget)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-success">
                    ₱ {fmt(totalExpenditures)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {evidenceViewer && viewerFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            ref={viewerDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={viewerTitleId}
            className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="px-6 py-4 border-b border-line-subtle flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                  <FaPaperclip className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 id={viewerTitleId} className="text-sm font-semibold text-fg truncate">
                    {viewerFile.name || "Evidence file"}
                  </h2>
                  <p className="text-xs text-fg-muted truncate">
                    Expenditure Evidence ·{" "}
                    {evidenceViewer.contextLabel || "Project"} · File{" "}
                    {viewerIndex + 1} of {viewerFiles.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  onClick={() => downloadEvidenceFile(viewerFile)}
                >
                  <FaDownload className="h-3.5 w-3.5" />
                  Download
                </Button>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setEvidenceViewer(null)}
                  className="touch-target h-8 w-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg-4 hover:bg-muted transition"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className="relative flex-1 bg-inverse flex items-center justify-center overflow-hidden"
              style={{ minHeight: "55vh" }}
            >
              {previewLoading && viewerFileType !== "other" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-inverse/80">
                  <svg
                    className="animate-spin h-8 w-8 text-white"
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
                </div>
              )}
              {previewError ? (
                <div className="text-center p-8">
                  <FaFileAlt className="h-10 w-10 text-red-400 mx-auto mb-3" />
                  <p className="text-sm text-fg-faint">{previewError}</p>
                  <Button
                    variant="primary"
                    className="mt-3"
                    onClick={() => downloadEvidenceFile(viewerFile)}
                  >
                    <FaDownload className="h-3.5 w-3.5" />
                    Download instead
                  </Button>
                </div>
              ) : viewerFileType === "image" ? (
                <img
                  key={viewerPreviewUrl || viewerIndex}
                  src={viewerPreviewUrl}
                  alt={viewerFile.name || "Evidence"}
                  className="max-w-full max-h-[70vh] object-contain"
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(
                      "Failed to load preview. Try downloading the file instead.",
                    );
                  }}
                />
              ) : viewerFileType === "pdf" ? (
                <iframe
                  key={viewerPreviewUrl || viewerIndex}
                  src={viewerPreviewUrl}
                  title={viewerFile.name || "Evidence preview"}
                  className="w-full"
                  style={{ height: "70vh", border: "none" }}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(
                      "Failed to load preview. Try downloading the file instead.",
                    );
                  }}
                />
              ) : (
                <div className="text-center p-8">
                  <FaFileAlt className="h-10 w-10 text-fg-muted mx-auto mb-3" />
                  <p className="text-sm text-fg-faint">
                    Preview not available for this file type.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-3"
                    onClick={() => downloadEvidenceFile(viewerFile)}
                  >
                    <FaDownload className="h-3.5 w-3.5" />
                    Download to view
                  </Button>
                </div>
              )}

              {viewerFiles.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      setEvidenceViewer((v) => ({
                        ...v,
                        index: Math.max(0, v.index - 1),
                      }));
                      setPreviewLoading(true);
                      setPreviewError("");
                    }}
                    disabled={viewerIndex === 0}
                    aria-label="Previous file"
                    className="touch-target absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-fg-3 hover:bg-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEvidenceViewer((v) => ({
                        ...v,
                        index: Math.min(v.files.length - 1, v.index + 1),
                      }));
                      setPreviewLoading(true);
                      setPreviewError("");
                    }}
                    disabled={viewerIndex === viewerFiles.length - 1}
                    aria-label="Next file"
                    className="touch-target absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-fg-3 hover:bg-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            {viewerFiles.length > 1 && (
              <div className="px-4 py-3 border-t border-line-subtle bg-subtle flex gap-2 overflow-x-auto shrink-0">
                {viewerFiles.map((file, i) => (
                  <button
                    key={file.key || i}
                    onClick={() => {
                      setEvidenceViewer((v) => ({ ...v, index: i }));
                      setPreviewLoading(true);
                      setPreviewError("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition ${
                      i === viewerIndex
                        ? "bg-success-subtle border-emerald-300 text-success font-medium"
                        : "bg-white border-line text-fg-4 hover:bg-muted"
                    }`}
                  >
                    <FaFileAlt className="h-3 w-3 shrink-0" />
                    <span className="max-w-[160px] truncate">
                      {file.name || `File ${i + 1}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
