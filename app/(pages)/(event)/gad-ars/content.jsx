"use client";

import React, { useEffect, useState, useCallback } from "react";
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
          setSelectedYear(String(sorted[0].year));
        }
      } else {
        setError(data.message || "Failed to load GPB records");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const generateSuggestedActual = (project) => {
    const events = Array.isArray(project.events) ? project.events : [];
    const linkedEvents = events.filter(
      (ev) => ev && ev.status !== "cancelled",
    );
    if (linkedEvents.length === 0) return "";

    let totalAttended = 0;
    let femaleCount = 0;
    let maleCount = 0;

    linkedEvents.forEach((ev) => {
      const attended = Array.isArray(ev.attended_users) ? ev.attended_users : [];
      totalAttended += attended.length;
      attended.forEach((att) => {

        const userObj = att?.user_id || att;
        if (!userObj || typeof userObj !== "object") return;

        const profile = userObj?.personal_info_id;
        const sex = profile?.gadData?.sexAtBirth;

        if (typeof sex === "string") {
          const normalized = sex.toLowerCase();
          if (normalized === "female") femaleCount++;
          else if (normalized === "male") maleCount++;
        }
      });
    });

    if (totalAttended === 0) return "";

    const eventTitles = linkedEvents
      .map((ev) => ev?.title)
      .filter((t) => t && String(t).trim() !== "");

    const eventCount = linkedEvents.length;
    const titlePart =
      eventTitles.length > 0
        ? ` — '${eventTitles.join("', '")}'`
        : "";

    return `${eventCount} event${eventCount !== 1 ? "s" : ""} conducted${titlePart} with ${totalAttended} participant${totalAttended !== 1 ? "s" : ""} (${femaleCount} Female, ${maleCount} Male)`;
  };

  const openEdit = (project) => {
    const existingActual = Array.isArray(project.actual_accomplishment)
      ? project.actual_accomplishment[0] || ""
      : typeof project.actual_accomplishment === "string"
        ? project.actual_accomplishment
        : "";

    const suggested = existingActual || generateSuggestedActual(project);

    setEditProject(project);
    setEditActual(suggested);
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
          actual_accomplishment: editActual.trim() ? [editActual.trim()] : [],
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

  const getActualForDisplay = (project) => {
    if (Array.isArray(project.actual_accomplishment)) {
      return project.actual_accomplishment[0] || "";
    }
    if (typeof project.actual_accomplishment === "string") {
      return project.actual_accomplishment;
    }
    return "";
  };

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
                        ) : actualEvents.length > 0 && canEditActuals(project) ? (
                          <button
                            onClick={() => openEdit(project)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Auto-fill from {actualEvents.length} event{actualEvents.length !== 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">
                            
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
                      </td>
                      <td className="px-3 py-4 align-top text-xs text-gray-800">
                        {getFieldValue(project.responsible_office) || "—"}
                      </td>
                      <td className="px-3 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditActuals(project) ? (
                            <button
                              onClick={() => openEdit(project)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                            >
                              <FaEdit className="h-3 w-3" />
                              Edit Actuals
                            </button>
                          ) : (
                            <span
                              title={`Only ${getCreatorName(project)} can edit actuals`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed select-none"
                            >
                              <FaLock className="h-3 w-3" />
                              Creator only
                            </span>
                          )}

                        </div>
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

      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in">
 
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <FaFileAlt className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Edit GAD AR Actuals
                    </h2>
                    <p className="text-xs text-gray-500">
                      {getFieldValue(editProject.gender_issue)?.slice(0, 60) ||
                        "Project"}{" "}
                      {getFieldValue(editProject.gender_issue)?.length > 60
                        ? "..."
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeEdit}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

    
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
  
              {getProjectTypeLabel(editProject) !== "Attributed Program" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                    G. Actual Accomplishment
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    What was actually accomplished for this project. Auto-suggested
                    from event attendance if available — you can edit this text.
                  </p>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Enter the actual accomplishment for this project..."
                    value={editActual}
                    onChange={(e) => setEditActual(e.target.value)}
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = generateSuggestedActual(editProject);
                        if (suggested) setEditActual(suggested);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      ↻ Re-generate from event data
                    </button>
                  </div>
                </div>
              )}

   
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                  I. Actual Expenditures (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="0.00"
                    value={editExpenditures}
                    onChange={(e) => setEditExpenditures(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Total actual money spent on this project
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                  Evidence of Actual Expenditures
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Attach supporting documents (receipts, official receipts,
                  liquidation reports, invoices). PDF, JPG, or PNG — max 10MB
                  each.
                </p>

                <div className="flex items-center gap-3">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition cursor-pointer ${
                      evidenceUploading
                        ? "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
                        : "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {evidenceUploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FaPaperclip className="h-3.5 w-3.5" />
                        Add Files
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleEvidenceUpload}
                      disabled={evidenceUploading}
                    />
                  </label>
                  {editEvidence.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {editEvidence.length} file
                      {editEvidence.length !== 1 ? "s" : ""} attached
                    </span>
                  )}
                </div>

                {editEvidence.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {editEvidence.map((file, i) => (
                      <li
                        key={file.key || i}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FaFileAlt className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-700 truncate">
                            {file.name || "Evidence file"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              openEvidenceViewer(
                                editEvidence,
                                i,
                                getProjectContextLabel(editProject),
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition"
                          >
                            <FaDownload className="h-3 w-3" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEvidenceFile(file)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaTrash className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>


            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={closeEdit}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveActuals}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Actuals"
                )}
              </button>
            </div>
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