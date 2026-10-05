"use client";

import axios from "axios";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FaSearch,
  FaTimes,
  FaEye,
  FaFolderOpen,
  FaExclamationTriangle,
  FaPaperclip,
  FaCheckCircle,
  FaClock,
  FaWallet,
  FaChartLine,
  FaClipboardList,
  FaFileAlt,
  FaRegCalendarAlt,
  FaUsers,
  FaPen,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
} from "react-icons/fa";
import ActualsEncoderModal from "../components/ActualsEncoderModal";
import DetailTabs from "../components/DetailTabs";
import MilestonesModal from "../components/MilestonesModal";
import ParticipantBreakdown from "../components/ParticipantBreakdown";
import ParticipantTargetProgress from "../components/ParticipantTargetProgress";
import {
  generateAccomplishmentSummary,
  resolveAccomplishmentLines,
  usesAccomplishmentOverride,
} from "@/lib/accomplishmentSummary";
import { OFFICE_OPTIONS, normalizeOffice } from "@/lib/colleges";
import {
  BUDGET_VIEW,
  budgetProjectsFor,
  budgetViewFor,
  canViewProjectBudget,
  summarizeBudget,
} from "@/lib/budgetVisibility";
import { aggregateIndicatorProgress } from "@/lib/performanceTracking";
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

const fmtPeso = (n) => `₱ ${Number(n || 0).toLocaleString()}`;

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const ayLabel = (year) => `AY ${year}-${Number(year) + 1}`;

const getEvidenceProxyUrl = (file) => {
  const key = file?.key || (file?.url ? file.url.split(".com/")[1] : null);
  if (!key) return null;
  return `/api/files/proxy?key=${encodeURIComponent(key)}`;
};

const getEventStart = (ev) => {
  const d =
    ev?.start_date ||
    (Array.isArray(ev?.start_dates) ? ev.start_dates[0] : null);
  if (!d) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getProjectEvents = (project) =>
  (Array.isArray(project?.events) ? project.events : []).filter(Boolean);

const getActiveEvents = (project) =>
  getProjectEvents(project).filter((ev) => ev?.status !== "cancelled");

const getSortedEvents = (project) =>
  [...getActiveEvents(project)].sort(
    (a, b) => (getEventStart(a)?.getTime() || 0) - (getEventStart(b)?.getTime() || 0),
  );

const PROJECT_STATUSES = ["for-review", "ongoing", "completed"];

/* Number of projects listed per page for the selected academic year */
const PROJECTS_PER_PAGE = 5;

const getProjectStatus = (project) =>
  PROJECT_STATUSES.includes(project?.project_status)
    ? project.project_status
    : "for-review";

const PROJECT_STATUS_META = {
  "for-review": {
    label: "For Review",
    classes: "bg-gray-50 text-gray-700 border-gray-200",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

/* Roles (besides the creator) allowed to manage schedule, status + milestones */
const PROJECT_EDITOR_ROLES = ["gad focal person", "admin"];

const canManageProject = (project, userId, userRole) => {
  if (!userId) return false;
  const creatorId = String(project?.createdBy?._id || project?.createdBy || "");
  if (creatorId && creatorId === String(userId)) return true;
  return PROJECT_EDITOR_ROLES.includes(
    String(userRole || "").trim().toLowerCase(),
  );
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const MILESTONE_STATUS_META = {
  pending: {
    label: "Pending",
    classes: "bg-gray-50 text-gray-700 border-gray-200",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const getMilestones = (project) =>
  (Array.isArray(project?.milestones) ? project.milestones : []).filter(
    (m) => m && String(m.title || "").trim(),
  );

const getMilestoneProgress = (project) => {
  const list = getMilestones(project);
  const total = list.length;
  const done = list.filter((m) => m.status === "completed").length;
  return {
    total,
    done,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
};

const EVENT_STATUS_META = {
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  active: {
    label: "Ongoing",
    dot: "bg-blue-500",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-400",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
};

function StatCard({ icon: Icon, iconClass, label, value, sub, children }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="text-sm text-gray-800 break-words">{value || "—"}</p>
    </div>
  );
}

function DetailList({ label, items, descriptions }) {
  const list = (items || []).filter(Boolean);
  /* Optional, index-paired notes shown under each item (GAD activity
     descriptions). Missing entries simply render nothing. */
  const notes = Array.isArray(descriptions) ? descriptions : [];
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {list.length > 0 ? (
        <ol className="list-decimal list-inside space-y-0.5 text-sm text-gray-800">
          {list.map((it, i) => (
            <li key={i}>
              {it}
              {notes[i] ? (
                <span className="mt-0.5 block">
                  {notes[i]}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-gray-800">—</p>
      )}
    </div>
  );
}

export default function GADProjectsMonitoringContent() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [generatingReport, setGeneratingReport] = useState(null);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  /* Which tab of an expanded row is open — always reset when a project opens. */
  const [detailTab, setDetailTab] = useState("details");
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState("");
  /* College a GAD coordinator is assigned to — the only budget they may see. */
  const [assignedCollege, setAssignedCollege] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [scheduleEditingId, setScheduleEditingId] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState({
    start_date: "",
    end_date: "",
    project_status: "for-review",
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  /* Approval details (approved resolution # + other details) have their own
     draft — they are saved separately from the schedule and status */
  const [approvalEditingId, setApprovalEditingId] = useState(null);
  const [approvalDraft, setApprovalDraft] = useState({
    approved_resolution_no: "",
    other_details: "",
  });
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [milestoneModalProject, setMilestoneModalProject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/project", { withCredentials: true });
      setProjects(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load GAD projects:", err);
      setError("Failed to load GAD projects. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("/api/profile/my-profile", {
          withCredentials: true,
        });
        if (!mounted) return;
        setUserId(res.data?.user?._id || null);
        setUserRole(res.data?.user?.role || "");
        setAssignedCollege(res.data?.user?.assignedCollege || "");
      } catch {
        if (mounted) {
          setUserId(null);
          setUserRole("");
          setAssignedCollege("");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const years = useMemo(
    () =>
      [...new Set(projects.map((p) => p.year).filter(Boolean))].sort(
        (a, b) => b - a,
      ),
    [projects],
  );

  useEffect(() => {
    if (!loading && years.length > 0 && !yearFilter) {
      setYearFilter(String(years[0]));
    }
  }, [loading, years, yearFilter]);

  /* Deep-link from Reports readiness: auto-expand + scroll to ?focus= project */
  const searchParams = useSearchParams();
  const focusParam = searchParams?.get("focus");

  useEffect(() => {
    if (loading || !focusParam) return;
    const focusProject = projects.find(
      (p) => String(p._id) === String(focusParam),
    );
    if (!focusProject) return;
    if (focusProject.year) setYearFilter(String(focusProject.year));
    setDetailTab("details");
    setExpandedId(focusProject._id);
    const timer = setTimeout(() => {
      document
        .getElementById(`gad-project-${focusProject._id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(timer);
  }, [loading, projects, focusParam, currentPage]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => Number(p.year) === Number(yearFilter))
      .filter(
        (p) =>
          officeFilter === "all" ||
          getArrayValue(p.responsible_office).some(
            (office) =>
              normalizeOffice(office) === normalizeOffice(officeFilter),
          ),
      )
      .filter(
        (p) => statusFilter === "all" || getProjectStatus(p) === statusFilter,
      )
      .filter((p) => {
        if (!q) return true;
        const haystack = [
          ...getArrayValue(p.gad_activity),
          ...getArrayValue(p.gad_activity_description),
          ...getArrayValue(p.responsible_office),
          getFieldValue(p.gender_issue),
          getFieldValue(p.project_type),
          String(p.year || ""),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [projects, search, yearFilter, officeFilter, statusFilter]);

  /* Canonical colleges/offices plus any custom office actually saved on a
     record, so custom-typed entries stay filterable from this one dropdown */
  const officeOptions = useMemo(() => {
    const seen = new Map();
    OFFICE_OPTIONS.forEach((o) => seen.set(normalizeOffice(o), o));
    projects.forEach((p) =>
      getArrayValue(p.responsible_office).forEach((o) => {
        const key = normalizeOffice(o);
        if (!seen.has(key)) seen.set(key, o);
      }),
    );
    return [...seen.values()];
  }, [projects]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE),
  );

  const paginatedProjects = useMemo(
    () =>
      filteredProjects.slice(
        (currentPage - 1) * PROJECTS_PER_PAGE,
        currentPage * PROJECTS_PER_PAGE,
      ),
    [filteredProjects, currentPage],
  );

  /* While a project is open, the other projects are hidden — the opened one
     shows on its own, and closing it (expandedId = null) brings the list back */
  const visibleProjects = useMemo(() => {
    if (!expandedId) return paginatedProjects;
    const focused = filteredProjects.find(
      (p) => String(p._id) === String(expandedId),
    );
    return focused ? [focused] : paginatedProjects;
  }, [filteredProjects, paginatedProjects, expandedId]);

  const pageStart =
    filteredProjects.length === 0
      ? 0
      : (currentPage - 1) * PROJECTS_PER_PAGE + 1;
  const pageEnd = Math.min(
    currentPage * PROJECTS_PER_PAGE,
    filteredProjects.length,
  );

  /* Filters narrow the list — always fall back to the first page */
  useEffect(() => {
    setCurrentPage(1);
  }, [yearFilter, officeFilter, statusFilter, search]);

  /* Never leave the view on a page that no longer exists */
  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  /* Keep the deep-linked (?focus=) project on the page that shows it */
  const focusPageRef = useRef(null);
  useEffect(() => {
    if (!focusParam || filteredProjects.length === 0) return;
    if (focusPageRef.current === focusParam) return;
    const idx = filteredProjects.findIndex(
      (p) => String(p._id) === String(focusParam),
    );
    if (idx < 0) return;
    focusPageRef.current = focusParam;
    setCurrentPage(Math.floor(idx / PROJECTS_PER_PAGE) + 1);
  }, [focusParam, filteredProjects]);

  const totals = useMemo(() => {
    const completed = filteredProjects.filter(
      (p) => getProjectStatus(p) === "completed",
    ).length;
    const ongoing = filteredProjects.filter(
      (p) => getProjectStatus(p) === "ongoing",
    ).length;
    const forReview = filteredProjects.filter(
      (p) => getProjectStatus(p) === "for-review",
    ).length;
    const listed = filteredProjects.length;
    return {
      completed,
      ongoing,
      forReview,
      listed,
    };
  }, [filteredProjects]);

  /* Budget figures are scoped by role: the focal person sees every office, a
     coordinator only the college they are assigned to, everyone else none. */
  const budgetView = useMemo(() => budgetViewFor(userRole), [userRole]);

  const budgetSummary = useMemo(
    () =>
      summarizeBudget(
        budgetProjectsFor(budgetView, filteredProjects, assignedCollege),
      ),
    [budgetView, filteredProjects, assignedCollege],
  );

  const handleReset = () => {
    setSearch("");
    setYearFilter(years.length > 0 ? String(years[0]) : "");
    setOfficeFilter("all");
    setStatusFilter("all");
    setExpandedId(null);
  };

  const handleMilestonesSaved = (projectId, savedMilestones) => {
    setProjects((prev) =>
      prev.map((p) =>
        String(p._id) === String(projectId)
          ? { ...p, milestones: savedMilestones }
          : p,
      ),
    );
  };

  /* Opening a row starts on the first tab, so the details always read the same. */
  const toggleExpand = (id) => {
    setDetailTab("details");
    setExpandedId((prev) => (prev === id ? null : id));
  };

  /* Jump to a pagination page (clamped) and bring the list back into view */
  const goToPage = (next) => {
    const target = Math.min(Math.max(next, 1), totalPages);
    setCurrentPage(target);
    document
      .getElementById("gad-projects-table")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startScheduleEdit = (project) => {
    setScheduleError("");
    setScheduleDraft({
      start_date: toDateInputValue(project?.start_date),
      end_date: toDateInputValue(project?.end_date),
      project_status: getProjectStatus(project),
    });
    setScheduleEditingId(project?._id || null);
  };

  const cancelScheduleEdit = () => {
    setScheduleEditingId(null);
    setScheduleError("");
  };

  const saveSchedule = async (project) => {
    if (!project) return;
    const { start_date, end_date, project_status } = scheduleDraft;

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      setScheduleError("End date must be on or after the start date.");
      return;
    }

    setScheduleSaving(true);
    setScheduleError("");
    try {
      await axios.put(
        `/api/project/${project._id}`,
        {
          userId,
          start_date: start_date || null,
          end_date: end_date || null,
          project_status,
        },
        { withCredentials: true },
      );
      setProjects((prev) =>
        prev.map((p) =>
          String(p._id) === String(project._id)
            ? {
                ...p,
                start_date: start_date || null,
                end_date: end_date || null,
                project_status,
              }
            : p,
        ),
      );
      setScheduleEditingId(null);
    } catch (err) {
      setScheduleError(
        err?.response?.data?.error ||
          "Failed to save schedule and status. Please try again.",
      );
    } finally {
      setScheduleSaving(false);
    }
  };

  const startApprovalEdit = (project) => {
    setApprovalError("");
    setApprovalDraft({
      approved_resolution_no: String(
        getFieldValue(project?.approved_resolution_no) || "",
      ),
      other_details: String(getFieldValue(project?.other_details) || ""),
    });
    setApprovalEditingId(project?._id || null);
  };

  const cancelApprovalEdit = () => {
    setApprovalEditingId(null);
    setApprovalError("");
  };

  /* Optional fields — both may be left blank, so only the length is enforced */
  const saveApproval = async (project) => {
    if (!project) return;

    const approvedResolution = approvalDraft.approved_resolution_no.trim();
    const otherDetails = approvalDraft.other_details.trim();

    if (approvedResolution.length > 500 || otherDetails.length > 500) {
      setApprovalError("Approval details are too long (max 500 characters).");
      return;
    }

    setApprovalSaving(true);
    setApprovalError("");
    try {
      await axios.put(
        `/api/project/${project._id}`,
        {
          userId,
          approved_resolution_no: approvedResolution,
          other_details: otherDetails,
        },
        { withCredentials: true },
      );
      setProjects((prev) =>
        prev.map((p) =>
          String(p._id) === String(project._id)
            ? {
                ...p,
                approved_resolution_no: { value: approvedResolution },
                other_details: { value: otherDetails },
              }
            : p,
        ),
      );
      setApprovalEditingId(null);
    } catch (err) {
      setApprovalError(
        err?.response?.data?.error ||
          "Failed to save approval details. Please try again.",
      );
    } finally {
      setApprovalSaving(false);
    }
  };

  useEffect(() => {
    if (reportError) {
      const timer = setTimeout(() => setReportError(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [reportError]);

  /* Milestone progress PDFs are year-wide — the office/status/search filters
     on this page narrow the on-screen list only. */
  const downloadProgressReport = async (mode) => {
    if (!yearFilter) return;
    setReportError("");
    setGeneratingReport(mode);
    try {
      const res = await axios.get(
        `/api/reports/gpb-progress?year=${encodeURIComponent(yearFilter)}&mode=${mode}`,
        { responseType: "blob" },
      );

      const dispositionFilename =
        (res.headers?.["content-disposition"] || "").split("filename=")[1] ||
        "";
      const fallback =
        mode === "project"
          ? `gpb-progress-${yearFilter}-per-project.pdf`
          : `gpb-progress-${yearFilter}.pdf`;

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = dispositionFilename.replace(/"/g, "") || fallback;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = "Could not generate the milestone progress report.";
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          message = parsed.message || parsed.error || message;
        } catch {
          /* keep the default message when the body is not JSON */
        }
      } else if (data?.message) {
        message = data.message;
      }
      setReportError(message);
    } finally {
      setGeneratingReport(null);
    }
  };

  const overBudget = budgetSummary.utilization > 100;

  return (
    <div className="space-y-5 mx-auto py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaChartLine className="text-rose-600" />
            GAD Projects/Activities Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor GAD projects and activities across academic years —
            update actuals as activities are conducted
          </p>
        </div>
        <p className="text-xs text-gray-400">
          {totals.listed} project{totals.listed !== 1 ? "s" : ""} listed
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-slide-up">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reportError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-slide-up">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{reportError}</span>
        </div>
      )}

      {editingProject && (
        <ActualsEncoderModal
          project={editingProject}
          userId={userId}
          onClose={() => setEditingProject(null)}
          onSaved={() => loadProjects()}
        />
      )}

      {milestoneModalProject && (
        <MilestonesModal
          project={milestoneModalProject}
          userId={userId}
          onClose={() => setMilestoneModalProject(null)}
          onSaved={(savedMilestones) =>
            handleMilestonesSaved(milestoneModalProject._id, savedMilestones)
          }
        />
      )}

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
          budgetView === BUDGET_VIEW.NONE ? "xl:grid-cols-3" : "xl:grid-cols-4"
        }`}
      >
        <StatCard
          icon={FaClipboardList}
          iconClass="bg-purple-50 text-purple-600"
          label="Total GAD Projects/Activities"
          value={filteredProjects.length}
          sub={yearFilter ? ayLabel(yearFilter) : "—"}
        />
        <StatCard
          icon={FaCheckCircle}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Completed"
          value={totals.completed}
          sub={`${
            totals.listed
              ? Math.round((totals.completed / totals.listed) * 100)
              : 0
          }% of listed projects`}
        />
        <StatCard
          icon={FaClock}
          iconClass="bg-amber-50 text-amber-600"
          label="Ongoing"
          value={totals.ongoing}
          sub={`${
            totals.listed
              ? Math.round((totals.ongoing / totals.listed) * 100)
              : 0
          }% of listed projects · ${totals.forReview} for review`}
        />
        {budgetView !== BUDGET_VIEW.NONE && (
          <StatCard
            icon={FaWallet}
            iconClass="bg-rose-50 text-rose-600"
            label="Budget Utilization"
            value={`${Math.round(budgetSummary.utilization)}%`}
            sub={`${fmtPeso(budgetSummary.totalExpenditures)} of ${fmtPeso(
              budgetSummary.totalBudget,
            )}`}
          >
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overBudget ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(
                    Math.max(budgetSummary.utilization, 0),
                    100,
                  )}%`,
                }}
              />
            </div>
          </StatCard>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 lg:w-44">
          <FaRegCalendarAlt className="text-gray-400 shrink-0" />
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setExpandedId(null);
            }}
            className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          >
            <option value="">Loading...</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {ayLabel(y)}
              </option>
            ))}
          </select>
        </div>

        <select
          value={officeFilter}
          onChange={(e) => {
            setOfficeFilter(e.target.value);
            setExpandedId(null);
          }}
          className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 lg:w-72"
        >
          <option value="all">All Colleges/Offices</option>
          {officeOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setExpandedId(null);
          }}
          className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 lg:w-44"
        >
          <option value="all">All Statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_META[s]?.label || s}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setExpandedId(null);
            }}
            placeholder="Search GAD activity, mandate, office..."
            className="w-full text-sm rounded-lg border border-gray-200 bg-white pl-9 pr-8 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={handleReset}
          className="self-start lg:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          Reset
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FaFileAlt className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Quick Reports</p>
            <p className="text-xs text-gray-500 truncate">
              {yearFilter
                ? `Milestone progress for ${ayLabel(Number(yearFilter))}`
                : "Select an academic year first"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => downloadProgressReport("overall")}
            disabled={!yearFilter || generatingReport !== null}
            title="Download the per-year milestone progress summary (PDF)"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingReport === "overall" ? (
              <FaSpinner className="animate-spin h-3.5 w-3.5" />
            ) : (
              <FaChartLine className="h-3.5 w-3.5" />
            )}
            Progress (Year)
          </button>
          <button
            type="button"
            onClick={() => downloadProgressReport("project")}
            disabled={!yearFilter || generatingReport !== null}
            title="Download the per-project milestone progress report (PDF)"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingReport === "project" ? (
              <FaSpinner className="animate-spin h-3.5 w-3.5" />
            ) : (
              <FaClipboardList className="h-3.5 w-3.5" />
            )}
            Progress (Per Project)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4 p-6 bg-white rounded-2xl border border-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
          <FaFolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            No GAD projects/activities found
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {projects.length === 0
              ? "Create GPB projects first — they will appear here for monitoring."
              : "Try adjusting the academic year, college/office, status, or search filters."}
          </p>
        </div>
      ) : (
        <div
          id="gad-projects-table"
          className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-14">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    GAD Activity
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    College/Office
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    GAD Mandate
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Start
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    End
                  </th>
                  {budgetView !== BUDGET_VIEW.NONE && (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      Budget
                    </th>
                  )}
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Progress
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleProjects.map((project, idx) => {
                  const activities = getArrayValue(project.gad_activity);
                  /* Index-paired with the titles; shorter on legacy projects. */
                  const activityDescriptions = getArrayValue(
                    project.gad_activity_description,
                  );
                  const office = getArrayValue(
                    project.responsible_office,
                  ).join(", ");
                  const mandate = getFieldValue(project.gender_issue);
                  const projectStatus = getProjectStatus(project);
                  const statusMeta = PROJECT_STATUS_META[projectStatus];
                  const gpbBudget = Number(
                    getFieldValue(project.gad_budget) || 0,
                  );
                  const canManage = canManageProject(project, userId, userRole);
                  /* The creator keeps sight of his own project's budget — and
                     with it the update shortcut — even when the project falls
                     outside his budget scope (e.g. his own office list names
                     another college). */
                  const isOwnProject =
                    String(project.createdBy?._id || project.createdBy || "") ===
                    String(userId);
                  const canSeeThisBudget =
                    canViewProjectBudget(budgetView, project, assignedCollege) ||
                    isOwnProject;
                  const progress = getMilestoneProgress(project);
                  const milestones = getMilestones(project);
                  const isScheduleEditing =
                    String(scheduleEditingId || "") === String(project._id);
                  const isApprovalEditing =
                    String(approvalEditingId || "") === String(project._id);
                  const isExpanded = expandedId === project._id;
                  /* Tabs for this expanded row; the counts come from its records. */
                  const detailTabs = [
                    { key: "details", label: "Project Details" },
                    { key: "approval", label: "Approval" },
                    {
                      key: "milestones",
                      label: "Milestones & Accomplishments",
                      count: milestones.length,
                    },
                    {
                      key: "events",
                      label: "Events / Actuals",
                      count: getActiveEvents(project).length,
                    },
                  ];
                  const displayIndex =
                    filteredProjects.findIndex(
                      (p) => String(p._id) === String(project._id),
                    ) + 1;
                  return (
                    <React.Fragment key={project._id || idx}>
                      <tr
                        id={`gad-project-${project._id}`}
                        onClick={() => toggleExpand(project._id)}
                        className={`transition-colors ${
                          isExpanded
                            ? "bg-rose-50/40"
                            : "hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <td className="px-3 py-4 text-center text-xs font-medium text-gray-800 align-top">
                          <div>
                            {displayIndex > 0 ? displayIndex : idx + 1}
                          </div>
                          {project.reference_number && (
                            <div
                              className="mt-1 font-mono text-[10px] font-normal text-gray-500 whitespace-nowrap"
                              title="Project reference number"
                            >
                              {project.reference_number}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-gray-800">
                          {activities.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-0.5">
                              {activities.map((a, i) => (
                                <li key={i}>
                                  {a}
                                  {activityDescriptions[i] ? (
                                    <span className="mt-0.5 block">
                                      {activityDescriptions[i]}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-gray-800">
                          {office || "—"}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-gray-800">
                          {mandate || "—"}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-gray-800 whitespace-nowrap">
                          {formatDate(project.start_date) || "—"}
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-gray-800 whitespace-nowrap">
                          {formatDate(project.end_date) || "—"}
                        </td>
                        {budgetView !== BUDGET_VIEW.NONE && (
                          <td className="px-3 py-4 align-top text-xs font-medium text-gray-800 whitespace-nowrap">
                            {/* A coordinator only reads his own college's budget. */}
                            {canSeeThisBudget && gpbBudget > 0
                              ? fmtPeso(gpbBudget)
                              : "—"}
                          </td>
                        )}
                        <td className="px-3 py-4 align-top text-xs">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${statusMeta.classes}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-top text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 shrink-0 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-rose-500 transition-all duration-300"
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                            <span
                              className="text-[10px] font-medium text-gray-600 whitespace-nowrap"
                              title={
                                progress.total > 0
                                  ? `${progress.done} of ${progress.total} milestones completed`
                                  : "No milestones recorded yet"
                              }
                            >
                              {progress.total > 0
                                ? `${progress.done}/${progress.total} · ${progress.percent}%`
                                : "0%"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center align-top">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(project._id);
                            }}
                            title={
                              isExpanded ? "Hide details" : "View details"
                            }
                            className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border transition ${
                              isExpanded
                                ? "bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                                : "bg-white border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                            }`}
                          >
                            <FaEye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={budgetView === BUDGET_VIEW.NONE ? 9 : 10} className="p-0 bg-gray-50/60">
                            <div className="p-4 sm:p-5 animate-fade-in space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                  <FaFileAlt className="text-rose-500" />
                                  Project Details
                                  <span
                                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusMeta.classes}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(null)}
                                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
                                >
                                  <FaTimes className="h-3 w-3" />
                                  Close
                                </button>
                              </div>

                              <DetailTabs
                                tabs={detailTabs}
                                active={detailTab}
                                onChange={setDetailTab}
                              />

                              {detailTab === "details" && (
                                <div
                                  className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in"
                                  role="tabpanel"
                                >
                                  <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                      Project Information
                                    </p>
                                  <DetailRow
                                    label="Academic Year"
                                    value={
                                      project.year ? ayLabel(project.year) : "—"
                                    }
                                  />
                                  <DetailRow
                                    label="Project Type"
                                    value={getFieldValue(project.project_type)}
                                  />
                                  <DetailRow
                                    label="GAD Mandate (Gender Issue)"
                                    value={mandate}
                                  />
                                  <DetailList
                                    label="GAD Objective"
                                    items={getArrayValue(project.gad_objective)}
                                  />
                                  <DetailList
                                    label="GAD Activity"
                                    items={activities}
                                    descriptions={activityDescriptions}
                                  />
                                  <DetailRow
                                    label="Responsible Office/Unit"
                                    value={office}
                                  />
                                  <DetailList
                                    label="Performance Indicator / Target"
                                    items={getArrayValue(
                                      project.performance_indicator_target,
                                    )}
                                  />

                                  </section>

                                  <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        Schedule &amp; Status
                                      </p>
                                      {canManage && !isScheduleEditing && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startScheduleEdit(project);
                                          }}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 shrink-0"
                                        >
                                          <FaPen size={10} />
                                          {project.start_date || project.end_date
                                            ? "Update"
                                            : "Set Schedule"}
                                        </button>
                                      )}
                                    </div>
                                    {isScheduleEditing ? (
                                      <div className="space-y-3">
                                        {scheduleError && (
                                          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                                            <FaExclamationTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                            <span>{scheduleError}</span>
                                          </div>
                                        )}

                                        <div>
                                          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                                            Start Date
                                          </label>
                                          <input
                                            type="date"
                                            value={scheduleDraft.start_date}
                                            onChange={(e) =>
                                              setScheduleDraft((d) => ({
                                                ...d,
                                                start_date: e.target.value,
                                              }))
                                            }
                                            className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                                          />
                                        </div>

                                        <div>
                                          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                                            End Date
                                          </label>
                                          <input
                                            type="date"
                                            value={scheduleDraft.end_date}
                                            onChange={(e) =>
                                              setScheduleDraft((d) => ({
                                                ...d,
                                                end_date: e.target.value,
                                              }))
                                            }
                                            className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                                            Status
                                          </label>
                                          <select
                                            value={scheduleDraft.project_status}
                                            onChange={(e) =>
                                              setScheduleDraft((d) => ({
                                                ...d,
                                                project_status: e.target.value,
                                              }))
                                            }
                                            className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                                          >
                                            {PROJECT_STATUSES.map((s) => (
                                              <option key={s} value={s}>
                                                {PROJECT_STATUS_META[s].label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={cancelScheduleEdit}
                                            disabled={scheduleSaving}
                                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => saveSchedule(project)}
                                            disabled={scheduleSaving}
                                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {scheduleSaving ? "Saving…" : "Save"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <DetailRow
                                          label="Start Date"
                                          value={formatDate(project.start_date)}
                                        />
                                        <DetailRow
                                          label="End Date"
                                          value={formatDate(project.end_date)}
                                        />
                                        <div>
                                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                            Status
                                          </p>
                                          <span
                                            className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusMeta.classes}`}
                                          >
                                            {statusMeta.label}
                                          </span>
                                        </div>
                                        {!canManage && (
                                          <p className="text-[11px] text-gray-400 italic">
                                            Only the project creator or a GAD
                                            Focal Person can set the schedule and
                                            status.
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </section>
                                </div>
                              )}

                              {detailTab === "approval" && (
                                <div
                                  className="max-w-3xl animate-fade-in"
                                  role="tabpanel"
                                >
                                  <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        Approval Details
                                      </p>
                                      {canManage && !isApprovalEditing && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startApprovalEdit(project);
                                          }}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 shrink-0"
                                        >
                                          <FaPen size={10} />
                                          {getFieldValue(
                                            project.approved_resolution_no,
                                          ) ||
                                          getFieldValue(project.other_details)
                                            ? "Update"
                                            : "Add Details"}
                                        </button>
                                      )}
                                    </div>
                                    {isApprovalEditing ? (
                                      <div className="space-y-3">
                                        {approvalError && (
                                          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                                            <FaExclamationTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                            <span>{approvalError}</span>
                                          </div>
                                        )}

                                        <div>
                                          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                                            Approved Resolution #
                                          </label>
                                          <input
                                            type="text"
                                            value={
                                              approvalDraft.approved_resolution_no
                                            }
                                            onChange={(e) =>
                                              setApprovalDraft((d) => ({
                                                ...d,
                                                approved_resolution_no:
                                                  e.target.value,
                                              }))
                                            }
                                            placeholder="e.g. SP Res. No. 2026-045"
                                            maxLength={500}
                                            className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                                          />
                                        </div>

                                        <div>
                                          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                                            Others (Other Details /
                                            Information)
                                          </label>
                                          <textarea
                                            value={approvalDraft.other_details}
                                            onChange={(e) =>
                                              setApprovalDraft((d) => ({
                                                ...d,
                                                other_details: e.target.value,
                                              }))
                                            }
                                            rows={3}
                                            placeholder="Optional — any other approval details or information"
                                            maxLength={500}
                                            className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 resize-none"
                                          />
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={cancelApprovalEdit}
                                            disabled={approvalSaving}
                                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              saveApproval(project)
                                            }
                                            disabled={approvalSaving}
                                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {approvalSaving ? "Saving…" : "Save"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <DetailRow
                                          label="Approved Resolution #"
                                          value={getFieldValue(
                                            project.approved_resolution_no,
                                          )}
                                        />
                                        <DetailRow
                                          label="Others (Other Details / Information)"
                                          value={getFieldValue(
                                            project.other_details,
                                          )}
                                        />
                                        {!canManage && (
                                          <p className="text-[11px] text-gray-400 italic">
                                            Only the project creator or a GAD
                                            Focal Person can update the approval
                                            details.
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </section>
                                </div>
                              )}

                              {detailTab === "milestones" && (
                                <section
                                  className="rounded-xl bg-white border border-gray-100 p-4 animate-fade-in"
                                  role="tabpanel"
                                >
                                  <div className="mb-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                      Milestones &amp; Accomplishments
                                    </p>
                                  </div>
                                  {/* Milestones */}
                                  <div className="mb-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        Milestones
                                      </p>
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMilestoneModalProject(project);
                                          }}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 shrink-0"
                                        >
                                          <FaPen size={10} />
                                          {milestones.length > 0
                                            ? "Update Milestones"
                                            : "Add Milestones"}
                                        </button>
                                      )}
                                    </div>

                                    





                                        
                                      <div className="space-y-2">
                                        {milestones.length > 0 ? (
                                          <>
                                            <div className="overflow-x-auto rounded-lg border border-gray-100">
                                              <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                                                  <tr>
                                                    <th className="px-2 py-1.5 font-semibold">
                                                      Milestone / Activity
                                                    </th>
                                                    <th className="px-2 py-1.5 font-semibold whitespace-nowrap">
                                                      Target Date
                                                    </th>
                                                    <th className="px-2 py-1.5 font-semibold whitespace-nowrap">
                                                      Actual Date
                                                    </th>
                                                    <th className="px-2 py-1.5 font-semibold">
                                                      Status
                                                    </th>
                                                    <th className="px-2 py-1.5 font-semibold">
                                                      Proof
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {milestones.map((m, i) => {
                                                    const meta =
                                                      MILESTONE_STATUS_META[
                                                        m.status
                                                      ] ||
                                                      MILESTONE_STATUS_META.pending;
                                                    const proofs = (
                                                      Array.isArray(m.proofs)
                                                        ? m.proofs
                                                        : []
                                                    ).filter(
                                                      (file) =>
                                                        file &&
                                                        (file.url || file.key),
                                                    );
                                                    return (
                                                      <tr
                                                        key={m._id || i}
                                                        className="border-t border-gray-100"
                                                      >
                                                        <td className="px-2 py-2 text-xs text-gray-700">
                                                          {m.title}
                                                        </td>
                                                        <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                                                          {formatDate(
                                                            m.target_date,
                                                          ) || "—"}
                                                        </td>
                                                        <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                                                          {formatDate(
                                                            m.actual_date,
                                                          ) || "—"}
                                                        </td>
                                                        <td className="px-2 py-2">
                                                          <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${meta.classes}`}
                                                          >
                                                            {meta.label}
                                                          </span>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                          {proofs.length > 0 ? (
                                                            <ul className="flex flex-wrap gap-1">
                                                              {proofs.map(
                                                                (file, fi) => {
                                                                  const url =
                                                                    getEvidenceProxyUrl(
                                                                      file,
                                                                    );
                                                                  return (
                                                                    <li
                                                                      key={
                                                                        file.key ||
                                                                        file.url ||
                                                                        fi
                                                                      }
                                                                    >
                                                                      {url ? (
                                                                        <a
                                                                          href={url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          title={
                                                                            file.name ||
                                                                            "View proof"
                                                                          }
                                                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                                                                        >
                                                                          <FaPaperclip className="h-2.5 w-2.5" />
                                                                          <span className="max-w-[120px] truncate">
                                                                            {file.name ||
                                                                              "Proof file"}
                                                                          </span>
                                                                        </a>
                                                                      ) : (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md">
                                                                          <FaPaperclip className="h-2.5 w-2.5" />
                                                                          {file.name ||
                                                                            "Proof file"}
                                                                        </span>
                                                                      )}
                                                                    </li>
                                                                  );
                                                                },
                                                              )}
                                                            </ul>
                                                          ) : m.status ===
                                                            "completed" ? (
                                                            <span className="text-[10px] font-medium text-amber-600">
                                                              Missing proof
                                                            </span>
                                                          ) : (
                                                            <span className="text-[10px] text-gray-400">
                                                              —
                                                            </span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                            <p className="text-[11px] text-gray-500">
                                              Progress:{" "}
                                              <span className="font-medium text-gray-700">
                                                {progress.done}/{progress.total} (
                                                {progress.percent}%)
                                              </span>
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-xs text-gray-400 italic">
                                            No milestones recorded yet.
                                            {!canManage &&
                                              " Only the project creator or a GAD Focal Person can add milestones."}
                                          </p>
                                        )}
                                      </div>
                                  </div>

                                  {/* Actual Accomplishments sub-section */}
                                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      Actual Accomplishments
                                    </p>
                                    {String(
                                      project.createdBy?._id ||
                                        project.createdBy ||
                                        "",
                                    ) === String(userId) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingProject(project);
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 shrink-0"
                                      >
                                        <FaPen size={10} />
                                        Update Actuals
                                      </button>
                                    )}
                                  </div>

                                  {(() => {
                                    const events = getSortedEvents(project);
                                    /* Saved custom text wins; otherwise the accomplishment is
                                       derived live from the linked events so it never goes stale. */
                                    const isOverride =
                                      usesAccomplishmentOverride(project);
                                    const generated =
                                      project.generated_accomplishment ||
                                      generateAccomplishmentSummary(project);
                                    const accomplishments = isOverride
                                      ? resolveAccomplishmentLines(project)
                                      : [generated].filter(Boolean);
                                    if (
                                      events.length === 0 &&
                                      accomplishments.length === 0
                                    ) {
                                      return (
                                        <p className="text-xs text-gray-400 italic">
                                          No linked events or accomplishment
                                          entries yet.
                                        </p>
                                      );
                                    }
                                    return (
                                      <div className="space-y-4">
                                        {events.length > 0 && (
                                          <ol>
                                            {events.map((ev, i) => {
                                              const meta =
                                                EVENT_STATUS_META[ev?.status] ||
                                                EVENT_STATUS_META.active;
                                              const start = getEventStart(ev);
                                              return (
                                                <li
                                                  key={ev?._id || i}
                                                  className="relative flex gap-3 pb-4 last:pb-0"
                                                >
                                                  {i < events.length - 1 && (
                                                    <span className="absolute left-[7px] top-4 h-full w-px bg-gray-200" />
                                                  )}
                                                  <span
                                                    className={`h-4 w-4 rounded-full mt-0.5 shrink-0 ring-4 ring-white ${meta.dot}`}
                                                  />
                                                  <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 break-words">
                                                      {ev?.title ||
                                                        "Untitled event"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                      {start
                                                        ? formatDate(start)
                                                        : "No date set"}
                                                      {ev?.venue
                                                        ? ` • ${ev.venue}`
                                                        : ""}
                                                    </p>
                                                    <span
                                                      className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.classes}`}
                                                    >
                                                      {meta.label}
                                                    </span>
                                                  </div>
                                                </li>
                                              );
                                            })}
                                          </ol>
                                        )}
                                        {accomplishments.length > 0 && (
                                          <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex flex-wrap items-center gap-2">
                                              Actual Accomplishment
                                              <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal ${
                                                  isOverride
                                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                }`}
                                              >
                                                {isOverride
                                                  ? "Custom (manual)"
                                                  : "Auto from linked events"}
                                              </span>
                                            </p>
                                            <ul className="space-y-1">
                                              {accomplishments.map((a, i) => (
                                                <li
                                                  key={i}
                                                  className="text-xs text-gray-700 flex gap-2"
                                                >
                                                  <FaCheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                                  <span>{a}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </section>
                              )}

                              {detailTab === "events" && (
                                <div
                                  className="space-y-4 animate-fade-in"
                                  role="tabpanel"
                                >
                                  {/* The utilization figures and their expenditure
                                      evidence follow the viewer's budget scope: a
                                      coordinator sees them only on his own
                                      college's projects, other roles not at all. */}
                                  {canSeeThisBudget && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Budget Utilization
                                      </p>
                                      {String(
                                        project.createdBy?._id ||
                                          project.createdBy ||
                                          "",
                                      ) === String(userId) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingProject(project);
                                          }}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 shrink-0"
                                        >
                                          <FaPen size={10} />
                                          Update
                                        </button>
                                      )}
                                    </div>
                                    {(() => {
                                      const budget = Number(
                                        getFieldValue(project.gad_budget) || 0,
                                      );
                                      const spent = Number(
                                        project.actual_expenditures || 0,
                                      );
                                      const pct =
                                        budget > 0 ? (spent / budget) * 100 : 0;
                                      const isOver = pct > 100;
                                      return (
                                        <>
                                          <div className="flex items-center justify-between text-sm">
                                            <span className="font-semibold text-gray-900">
                                              {fmtPeso(spent)}
                                            </span>
                                            <span className="text-gray-500">
                                              of {fmtPeso(budget)}
                                            </span>
                                            <span
                                              className={`font-bold ${
                                                isOver
                                                  ? "text-red-600"
                                                  : "text-emerald-600"
                                              }`}
                                            >
                                              {Math.round(pct)}%
                                            </span>
                                          </div>
                                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                isOver
                                                  ? "bg-red-500"
                                                  : "bg-emerald-500"
                                              }`}
                                              style={{
                                                width: `${Math.min(
                                                  Math.max(pct, 0),
                                                  100,
                                                )}%`,
                                              }}
                                            />
                                          </div>
                                          {budget === 0 && (
                                            <p className="text-xs text-gray-400 italic">
                                              No GAD budget set for this
                                              project.
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </section>

                                  <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                      <FaPaperclip className="h-3 w-3" />
                                      Expenditure Evidence
                                    </p>
                                    {Array.isArray(
                                      project.expenditure_evidence,
                                    ) &&
                                    project.expenditure_evidence.length >
                                      0 ? (
                                      <ul className="flex flex-wrap gap-2">
                                        {project.expenditure_evidence.map(
                                          (file, i) => {
                                            const url =
                                              getEvidenceProxyUrl(file);
                                            return (
                                              <li key={i}>
                                                {url ? (
                                                  <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                                                  >
                                                    <FaPaperclip className="h-3 w-3" />
                                                    <span className="max-w-[160px] truncate">
                                                      {file?.name ||
                                                        "Evidence file"}
                                                    </span>
                                                  </a>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md">
                                                    <FaPaperclip className="h-3 w-3" />
                                                    <span className="max-w-[160px] truncate">
                                                      {file?.name ||
                                                        "Evidence file"}
                                                    </span>
                                                  </span>
                                                )}
                                              </li>
                                            );
                                          },
                                        )}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-gray-400 italic">
                                        No expenditure evidence uploaded.
                                      </p>
                                    )}
                                      </section>
                                    </div>
                                  )}

                                  {/* Aggregated participation across every linked event */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <ParticipantBreakdown project={project} />

                                  <section className="rounded-xl bg-white border border-gray-100 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                      <FaUsers className="h-3 w-3" />
                                      Participants per Event
                                    </p>
                                    {(() => {
                                      const events = getSortedEvents(project);
                                      if (events.length === 0) {
                                        return (
                                          <p className="text-xs text-gray-400 italic">
                                            No linked events yet.
                                          </p>
                                        );
                                      }
                                      /* Target vs Actual is based on the project's Performance Indicator / Target. */
                                      const indicatorProgress =
                                        aggregateIndicatorProgress(project);
                                      return (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                                                <th className="text-left py-1.5 font-semibold">
                                                  Event
                                                </th>
                                                <th className="text-center py-1.5 font-semibold w-16">
                                                  Target
                                                </th>
                                                <th className="text-center py-1.5 font-semibold w-16">
                                                  Attended
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                              {events.map((ev, i) => (
                                                <tr key={ev?._id || i}>
                                                  <td className="py-2 pr-2 text-gray-800">
                                                    <span className="line-clamp-2">
                                                      {ev?.title ||
                                                        "Untitled event"}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 text-center text-gray-800">
                                                    {ev?.target_number_of_participants ??
                                                      "—"}
                                                  </td>
                                                  <td className="py-2 text-center text-gray-800">
                                                    {Array.isArray(
                                                      ev?.attended_users,
                                                    )
                                                      ? ev.attended_users.length
                                                      : "—"}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>

                                          {/* Overall target indicator — actual attendance vs the Performance Indicator target */}
                                          <ParticipantTargetProgress
                                            className="mt-4 border-t border-gray-100 pt-3"
                                            actual={indicatorProgress.actualTotal}
                                            target={indicatorProgress.targetTotal}
                                            emptyMessage="No participant target found in the Performance Indicator / Target."
                                          />
                                        </div>
                                      );
                                    })()}
                                  </section>
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-500">
              {expandedId ? (
                <>
                  Viewing{" "}
                  <span className="font-medium text-gray-700">1</span> of{" "}
                  {filteredProjects.length} project
                  {filteredProjects.length !== 1 ? "s" : ""}
                  {yearFilter ? ` for ${ayLabel(yearFilter)}` : ""} — close the
                  details to show the rest
                </>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {pageStart}–{pageEnd}
                  </span>{" "}
                  of {filteredProjects.length} project
                  {filteredProjects.length !== 1 ? "s" : ""}
                  {yearFilter ? ` for ${ayLabel(yearFilter)}` : ""} — click a row
                  to view its details
                </>
              )}
            </p>

            {!expandedId && totalPages > 1 && (
              <div className="flex items-center gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="text-[10px]" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-1 text-xs text-gray-400">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => goToPage(p)}
                        aria-current={p === currentPage ? "page" : undefined}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          p === currentPage
                            ? "bg-rose-600 text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}








