"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useFileLifecycle } from "@/hooks/useFileLifecycle";
import {
  FaFileAlt,
  FaCalendarAlt,
  FaEdit,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFolderOpen,
  FaLock,
  FaPaperclip,
  FaTrash,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import PrintGADAR from "../components/Print/PrintGADAR";
import {
  generateAccomplishmentSummary,
  normalizeAccomplishmentLines,
  resolveAccomplishmentText,
  usesAccomplishmentOverride,
} from "@/lib/accomplishmentSummary";


const getFieldValue = (field) => {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

const getArrayValue = (field) => {
  const v = getFieldValue(field);
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v) return [v];
  return [];
};

const getProjectTypeLabel = (project) => {
  const rawType = project?.project_type;
  const value = rawType && typeof rawType === "object" ? rawType.value : rawType;
  if (value === "Client Focused") return "Client Focused";
  if (value === "Organization Focused") return "Organization Focused";
  if (value === "Attributed Program") return "Attributed Program";
  return "Uncategorized";
};

const ACCEPTED_EVIDENCE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; 

const getEvidenceFileType = (file) => {
  const name = `${file?.name || ""} ${file?.url || ""}`.toLowerCase();
  if (/\.(png|jpe?g)(\?|$)/.test(name)) return "image";
  if (name.includes(".pdf")) return "pdf";
  return "other";
};

const getEvidenceProxyUrl = (file) => {
  const key = file?.key || (file?.url ? file.url.split(".com/")[1] : null);
  if (!key) return null;
  return `/api/files/proxy?key=${encodeURIComponent(key)}`;
};

const getEvidenceDownloadUrl = (file) => {
  const key = file?.key || (file?.url ? file.url.split(".com/")[1] : null);
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
  const userId = useSelector((state) => state.auth.userId);
  const searchParams = useSearchParams();
  const fileLifecycle = useFileLifecycle();

  const [gpbList, setGpbList] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [projects, setProjects] = useState([]);
  const [gaaBudget, setGaaBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editProject, setEditProject] = useState(null);
  const [editActual, setEditActual] = useState("");
  const [editOverride, setEditOverride] = useState(false);
  const [editSuggestion, setEditSuggestion] = useState("");
  const [editExpenditures, setEditExpenditures] = useState("");
  const [saving, setSaving] = useState(false);
  const [editEvidence, setEditEvidence] = useState([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceViewer, setEvidenceViewer] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");

  const canEditActuals = (project) => {
    const creatorId = String(project.createdBy?._id || project.createdBy || "");
    return creatorId === String(userId);
  };

  const getCreatorName = (project) => {
    const creator = project.createdBy;
    if (!creator) return "the project creator";
    const profile = creator.personal_info_id;
    if (profile?.personal) {
      const name =
        `${profile.personal.first_name || ""} ${
          profile.personal.last_name || ""
        }`.trim();
      return name || creator.username || "the project creator";
    }
    return creator.username || "the project creator";
  };

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

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

  const fetchProjects = useCallback(async () => {
    if (!selectedYear) return;
    setLoadingProjects(true);
    try {
      const res = await fetch(`/api/gpb/${selectedYear}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setProjects(data.data.projects || []);
        setGaaBudget(data.data.gaaBudgetId || null);
      } else {
        setProjects([]);
        setGaaBudget(null);
      }
    } catch {
      setProjects([]);
      setGaaBudget(null);
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, selectedYear]);

  const openEdit = (project) => {
    const storedLines = normalizeAccomplishmentLines(
      project.actual_accomplishment,
    );
    const suggestion =
      generateAccomplishmentSummary(project) ||
      project.generated_accomplishment ||
      "";
    /* Legacy hand-written text on a project without linked events is treated as a
       manual override so saving never drops it. */
    const isOverride = shouldUseAccomplishmentOverride(project, suggestion);

    setEditOverride(isOverride);
    setEditSuggestion(suggestion);
    setEditProject(project);
    setEditActual(
      isOverride ? storedLines.join("\n") : suggestion || storedLines.join("\n"),
    );
    setEditExpenditures(project.actual_expenditures || "");
    const evidence = Array.isArray(project.expenditure_evidence)
      ? project.expenditure_evidence
      : [];
    setEditEvidence(evidence);
    fileLifecycle.startSession(evidence.map((f) => f?.key));
  };

  const handleEvidenceUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0) return;

    const invalid = fileList.filter(
      (f) =>
        !ACCEPTED_EVIDENCE_TYPES.includes(f.type) || f.size > MAX_EVIDENCE_SIZE,
    );
    if (invalid.length > 0) {
      setError("Evidence files must be PDF, JPG, or PNG and under 10MB each.");
      return;
    }

    setEvidenceUploading(true);
    try {
      const uploaded = [];
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "expenditure-evidence");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.message || "Upload failed");
        }
        uploaded.push({ url: data.url, key: data.key, name: file.name });
      }
      const next = [...editEvidence, ...uploaded];
      setEditEvidence(next);
      fileLifecycle.syncCurrent(next.map((f) => f?.key));
    } catch (err) {
      setError(err.message || "Failed to upload evidence files");
    } finally {
      setEvidenceUploading(false);
    }
  };

  const removeEvidenceFile = (file) => {
    if (!file?.key) {
      setEditEvidence((prev) => prev.filter((f) => f !== file));
      return;
    }
    const next = editEvidence.filter((f) => f.key !== file.key);
    setEditEvidence(next);
    fileLifecycle.syncCurrent(next.map((f) => f?.key));
    if (!fileLifecycle.hasOriginal(file.key)) {
      fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: file.key }),
      }).catch(() => {});
    }
  };

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

  const closeEdit = () => {
    fileLifecycle.rollback();
    fileLifecycle.resetSession();
    setEditProject(null);
    setEditActual("");
    setEditOverride(false);
    setEditSuggestion("");
    setEditExpenditures("");
    setEditEvidence([]);
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
      } else if (e.key === "Escape") {
        setEvidenceViewer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [evidenceViewer]);

  const saveActuals = async () => {
    if (!editProject) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/project/${editProject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          /* Custom text is stored only when the owner overrides the value derived
             from the project's linked events. */
          actual_accomplishment: editOverride
            ? editActual
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
            : [],
          actual_accomplishment_override: editOverride,
          actual_expenditures: Number(editExpenditures) || 0,
          expenditure_evidence: editEvidence,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save");
      }

      await fileLifecycle.commit();
      setSuccess("GAD AR actuals saved successfully!");
      closeEdit();
      fetchProjects();
    } catch (err) {
      setError(err.message || "Failed to save actuals");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) =>
    Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totalBudget = projects.reduce(
    (s, p) => s + (Number(getFieldValue(p.gad_budget)) || 0),
    0,
  );
  const totalExpenditures = projects.reduce(
    (s, p) => s + (Number(p.actual_expenditures) || 0),
    0,
  );

  const getActualForDisplay = (project) => resolveAccomplishmentText(project);

  const projectTypeOrder = {
    "Client Focused": 0,
    "Organization Focused": 1,
    "Attributed Program": 2,
    Uncategorized: 3,
  };

  const orderedProjects = [...projects]
    .map((project, originalIndex) => ({ project, originalIndex }))
    .sort((a, b) => {
      const aType = getProjectTypeLabel(a.project);
      const bType = getProjectTypeLabel(b.project);
      const byType = projectTypeOrder[aType] - projectTypeOrder[bType];
      if (byType !== 0) return byType;
      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.project);

  const viewerFiles = evidenceViewer?.files || [];
  const viewerIndex = evidenceViewer?.index ?? 0;
  const viewerFile = viewerFiles[viewerIndex] || null;
  const viewerFileType = viewerFile ? getEvidenceFileType(viewerFile) : "other";
  const viewerPreviewUrl = viewerFile ? getEvidenceProxyUrl(viewerFile) : null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
    
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            GAD Accomplishment Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Annual GAD Accomplishment Report
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
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


      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm animate-slide-up">
          <FaCheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-slide-up">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Projects
            </p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {projects.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total GAD Budget
            </p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              ₱ {fmt(totalBudget)}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Actual Expenditures
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              ₱ {fmt(totalExpenditures)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4 p-6 bg-white rounded-2xl border border-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      ) : !selectedYear ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
          <FaFolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            Select a year to view the GAD AR
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Choose a year from the dropdown above
          </p>
        </div>
      ) : loadingProjects ? (
        <div className="animate-pulse space-y-4 p-6 bg-white rounded-2xl border border-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
          <FaFileAlt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            No projects found for {selectedYear}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Create GPB projects first to generate the GAD AR
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
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
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                  const activities = getArrayValue(project.gad_activity);
                  const indicators = getArrayValue(
                    project.performance_indicator_target,
                  );
                  const actual = getActualForDisplay(project);
                  const actualEvents = Array.isArray(project.events)
                    ? project.events.filter((ev) => ev && ev.status !== "cancelled")
                    : [];

                  return (
                    <React.Fragment key={project._id}>
                      {shouldShowTypeHeader && (
                        <tr className="bg-orange-300 border-y border-black">
                          <td
                            colSpan={12}
                            className="py-2 px-4 text-sm font-semibold text-black"
                          >
                            {projectTypeLabel}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-50/80">
                        <td className="px-3 py-4 align-top text-center text-xs font-medium text-gray-800">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-gray-800">
                          {getFieldValue(project.gender_issue) || "—"}
                        </td>
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
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
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
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
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
                        {getFieldValue(project.relevant_agency) || "—"}
                      </td>
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
                        {activities.length > 0 ? (
                          <ol className="list-decimal list-inside space-y-0.5">
                            {activities.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ol>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
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
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
                        {actual ? (
                          actual
                        ) : (
                          <span className="text-gray-400 italic">
                            Encode actuals in Project Monitoring → GAD Projects
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top text-right text-xs font-semibold text-gray-900">
                        ₱ {fmt(getFieldValue(project.gad_budget))}
                      </td>
                      <td className="px-3 py-4 align-top text-right text-xs font-semibold text-emerald-600">
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
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition"
                              >
                                <FaPaperclip className="h-2.5 w-2.5" />
                                {project.expenditure_evidence.length}
                              </button>
                            )}
                        </div>
                        <span className="block mt-1 text-[10px] font-normal text-gray-400">
                          Variance: ₱{" "}
                          {fmt(
                            (Number(getFieldValue(project.gad_budget)) || 0) -
                              (Number(project.actual_expenditures) || 0),
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
                        {getArrayValue(project.responsible_office).join(", ") ||
                          "—"}
                      </td>
                      <td className="px-3 py-4 align-top text-center">
                        <span
                          title="Actuals are now encoded in Project Monitoring → GAD Projects"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed select-none"
                        >
                          <FaLock className="h-3 w-3" />
                          View only
                        </span>
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td
                    colSpan={8}
                    className="px-3 py-3 text-right text-xs font-bold text-gray-900 uppercase"
                  >
                    TOTALS
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-gray-900">
                    ₱ {fmt(totalBudget)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-emerald-600">
                    ₱ {fmt(totalExpenditures)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {evidenceViewer && viewerFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                  <FaPaperclip className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">
                    {viewerFile.name || "Evidence file"}
                  </h2>
                  <p className="text-xs text-gray-500 truncate">
                    Expenditure Evidence ·{" "}
                    {evidenceViewer.contextLabel || "Project"} · File{" "}
                    {viewerIndex + 1} of {viewerFiles.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadEvidenceFile(viewerFile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  <FaDownload className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setEvidenceViewer(null)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden"
              style={{ minHeight: "55vh" }}
            >
              {previewLoading && viewerFileType !== "other" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80">
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
                  <p className="text-sm text-gray-300">{previewError}</p>
                  <button
                    onClick={() => downloadEvidenceFile(viewerFile)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    <FaDownload className="h-3.5 w-3.5" />
                    Download instead
                  </button>
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
                  <FaFileAlt className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-300">
                    Preview not available for this file type.
                  </p>
                  <button
                    onClick={() => downloadEvidenceFile(viewerFile)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    <FaDownload className="h-3.5 w-3.5" />
                    Download to view
                  </button>
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition disabled:opacity-30 disabled:cursor-not-allowed"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            {viewerFiles.length > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2 overflow-x-auto shrink-0">
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
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
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
