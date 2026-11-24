"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPeso } from "@/data/lib/money";
import { participantCount } from "@/data/lib/eventParticipants";
import { MODULE_EDITOR_ROLES } from "@/data/lib/projectAccess";
import {
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaFolderOpen,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaWallet,
  FaCheckCircle,
  FaClock,
  FaPaperclip,
  FaPen,
  FaTrash,
} from "react-icons/fa";
import ProjectCreateModal from "./ProjectCreateModal";
import Button from "@/components/ui/Button";
import {
  ayLabel,
  formatDate,
  getActiveEvents,
  getArrayValue,
  getEventStart,
  getFieldValue,
} from "../lib/projectView";
import DetailTabs from "./DetailTabs";
import ActualsEncoderModal from "./ActualsEncoderModal";
import {
  BUDGET_VIEW,
  budgetProjectsFor,
  budgetViewFor,
  canViewProjectBudget,
  summarizeBudget,
} from "@/data/lib/budgetVisibility";
import MilestonesModal from "./MilestonesModal";
import GanttReadOnly from "./GanttReadOnly";

import EditProjectModal from "./EditProjectModal";
import ProjectDeleteModal from "./ProjectDeleteModal";
import { getProjectModuleStatusMeta } from "@/data/lib/projectModules";
import { resolveAccomplishmentText } from "@/data/lib/accomplishmentSummary";

/*
 * Shared monitoring workspace for the office-managed project modules.
 * The Research & Extension and Academic pages pass their own config (api base,
 * badge field/colors, filter + detail + create field lists) and share this UI.
 */

/* Roles (besides the creator) allowed to manage schedule, status + milestones */
/* Shared with the module API and the upload route (data/lib/projectAccess.js). */
const PROJECT_EDITOR_ROLES = MODULE_EDITOR_ROLES;

/* Detail fields that hold budget amounts — hidden with the rest of the budget
   figures when the project falls outside the viewer's budget scope. */
const BUDGET_DETAIL_KEYS = ["source_budget", "gad_budget"];

const fmtPeso = (n) => formatPeso(n);

const getProjectStatus = (project, statuses) =>
  statuses.includes(project?.project_status)
    ? project.project_status
    : statuses[0];

const isProjectCreator = (project, userId) => {
  if (!userId) return false;
  const creatorId = String(project?.createdBy?._id || project?.createdBy || "");
  return !!creatorId && creatorId === String(userId);
};

const canManageProject = (project, userId, role) => {
  if (isProjectCreator(project, userId)) return true;
  return PROJECT_EDITOR_ROLES.includes(
    String(role || "")
      .trim()
      .toLowerCase(),
  );
};

const StatCard = ({ icon, iconClass, label, value, sub }) => (
  <div className="rounded-xl bg-white border border-line-subtle shadow-sm p-3.5 flex items-start gap-3">
    <span
      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
    >
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className="text-lg font-bold text-fg leading-tight truncate">
        {value}
      </p>
      {sub && <p className="text-xs text-fg-muted truncate">{sub}</p>}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const meta = getProjectModuleStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.classes}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
};

/* Key/value row — label left, value right, separated by hairline dividers.
   Rendered inside a <dl> so a section reads like a clean spec sheet. */
const DetailRow = ({ label, value }) => {
  const muted = !value || value === "—";

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2 border-b border-line-faint">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd
        className={`text-sm font-medium text-right break-words min-w-0 ${
          muted ? "text-fg-muted" : "text-fg"
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
};

/* One titled block of detail rows; rows flow into two columns on wide screens. */
const DetailSection = ({ title, children }) => (
  <div>
    <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted pb-1.5 border-b border-line-subtle">
      {title}
    </p>
    <dl className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">{children}</dl>
  </div>
);

/* Budget utilization row — percentage on the right, progress bar underneath. */
const DetailBarRow = ({ label, percent, over, caption }) => {
  const capped = Math.min(Math.max(percent, 0), 100);

  return (
    <div className="py-2 border-b border-line-faint">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5">
        <dt className="text-xs text-fg-muted">{label}</dt>
        <dd
          className={`text-sm font-medium text-right ${
            over ? "text-danger" : "text-fg"
          }`}
        >
          {percent}%
        </dd>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            over ? "bg-red-500" : "bg-emerald-500"
          }`}
          style={{ width: `${capped}%` }}
        />
      </div>
      {caption && <p className="text-xs text-fg-muted mt-1">{caption}</p>}
    </div>
  );
};

const toolbarSelect =
  "appearance-none bg-white border border-line rounded-lg px-3 py-2 pr-8 text-sm text-fg-3 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 focus:outline-none cursor-pointer hover:border-line-strong transition-colors";

export default function ProjectWorkspace({ config }) {
  const {
    title,
    subtitle,
    apiBase,
    badgeField,
    badgeClasses = {},
    badgeLabel,
    filters = [],
    detailSections = [],
    statuses = ["for-review", "ongoing", "completed"],
    budgetField = "budget",
    showLeader = false,
    emptyHint = "",
  } = config;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState("");
  /* College a GAD coordinator is assigned to — the only budget they may see. */
  const [assignedCollege, setAssignedCollege] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  /* Which tab of an expanded card is open — always reset when a card opens. */
  const [detailTab, setDetailTab] = useState("details");
  const [editProject, setEditProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [milestoneProject, setMilestoneProject] = useState(null);
  const [actualsProject, setActualsProject] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [profileRes, projectsRes] = await Promise.all([
          fetch("/api/profile/my-profile", { credentials: "include" }),
          fetch(apiBase, { credentials: "include" }),
        ]);

        const profileData = await profileRes.json();
        const projectsData = await projectsRes.json();

        if (!projectsRes.ok) {
          throw new Error(
            projectsData.error ||
              projectsData.message ||
              "Unable to load projects.",
          );
        }

        if (!mounted) return;

        setUserId(profileData?.user?._id || null);
        setUserRole(profileData?.user?.role || "");
        setAssignedCollege(profileData?.user?.assignedCollege || "");
        setProjects(Array.isArray(projectsData.data) ? projectsData.data : []);
        setError("");
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load projects. Please retry.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [apiBase, refreshKey]);

  const years = useMemo(() => {
    const unique = new Set();
    projects.forEach((project) => {
      if (project?.year) unique.add(Number(project.year));
    });
    return [...unique].sort((a, b) => b - a);
  }, [projects]);

  useEffect(() => {
    if (!year && years.length > 0) setYear(String(years[0]));
  }, [years, year]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (year && String(project.year) !== String(year)) return false;
      if (status && getProjectStatus(project, statuses) !== status)
        return false;

      if (term) {
        const haystack = [
          project.reference_number,
          getFieldValue(project.title),
          getFieldValue(project[badgeField]),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      for (const filter of filters) {
        const chosen = filterState[filter.key];
        if (!chosen) continue;
        if (String(getFieldValue(project[filter.key])) !== String(chosen)) {
          return false;
        }
      }

      return true;
    });
  }, [
    projects,
    year,
    status,
    search,
    filterState,
    filters,
    statuses,
    badgeField,
  ]);

  const stats = useMemo(() => {
    const ongoing = filtered.filter(
      (project) => getProjectStatus(project, statuses) === "ongoing",
    ).length;
    const completed = filtered.filter(
      (project) => getProjectStatus(project, statuses) === "completed",
    ).length;

    return { total: filtered.length, ongoing, completed };
  }, [filtered, statuses]);

  /* Budget figures are scoped by role: the focal person sees every office, a
     coordinator only the college they are assigned to, everyone else none. */
  const budgetView = useMemo(() => budgetViewFor(userRole), [userRole]);

  const budgetSummary = useMemo(
    () =>
      summarizeBudget(
        budgetProjectsFor(budgetView, filtered, assignedCollege),
        budgetField,
      ),
    [budgetView, filtered, assignedCollege, budgetField],
  );

  const canCreate = PROJECT_EDITOR_ROLES.includes(
    String(userRole || "")
      .trim()
      .toLowerCase(),
  );

  const handleCreated = (created) => {
    setShowCreate(false);
    if (created) {
      setProjects((prev) => [created, ...prev]);
      setExpandedId(created._id);
    }
    reload();
  };

  const renderProjectCard = (project) => {
    const projectStatus = getProjectStatus(project, statuses);
    const isExpanded = expandedId === project._id;
    const badgeValue = getFieldValue(project[badgeField]);
    const badgeClass = badgeClasses[badgeValue] || "bg-muted text-fg-3";
    const titleValue = getFieldValue(project.title) || "(untitled project)";
    const budget = Number(getFieldValue(project[budgetField])) || 0;
    const spent = Number(project.actual_expenditures) || 0;
    const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const events = [...getActiveEvents(project)].sort(
      (a, b) =>
        (getEventStart(a)?.getTime() || 0) - (getEventStart(b)?.getTime() || 0),
    );
    const milestones = Array.isArray(project.milestones)
      ? project.milestones.filter((m) => m && String(m.title || "").trim())
      : [];
    const milestoneDone = milestones.filter(
      (m) => m.status === "completed",
    ).length;
    const managementAllowed = canManageProject(project, userId, userRole);
    const creatorAllowed = isProjectCreator(project, userId);
    const accomplishment = resolveAccomplishmentText(project);
    /* Budget figures follow the viewer's budget scope — a coordinator sees them
       only on his own college's projects. */
    const canSeeBudget = canViewProjectBudget(
      budgetView,
      project,
      assignedCollege,
    );

    /* Renders a configured detail field's saved value for the spec sheet. */
    const renderDetailValue = (field) => {
      if (field.kind === "array") {
        return getArrayValue(project[field.key]).join(", ") || "—";
      }
      if (field.kind === "peso") {
        const raw = getFieldValue(project[field.key]);
        return raw ? fmtPeso(raw) : "—";
      }
      if (field.kind === "date") {
        return formatDate(project[field.key]) || "—";
      }
      return getFieldValue(project[field.key]) || "—";
    };

    return (
      <div
        key={project._id}
        className="rounded-2xl bg-white border border-line-subtle shadow-sm overflow-hidden"
      >
        <button
          type="button"
          onClick={() => {
            /* Opening a card always starts on the first tab. */
            setDetailTab("details");
            setExpandedId(isExpanded ? null : project._id);
          }}
          className="w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 hover:bg-subtle/60 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-mono font-semibold text-fg-muted">
                {project.reference_number || "—"}
              </span>
              {badgeValue && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                >
                  {badgeValue}
                </span>
              )}
              <StatusBadge status={projectStatus} />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-fg mt-1.5">
              {titleValue}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-fg-muted">
              <span>
                {formatDate(project.start_date) || "No start date"} →{" "}
                {formatDate(project.end_date) || "No end date"}
              </span>
              {canSeeBudget && <span>Budget {fmtPeso(budget)}</span>}
              <span>
                {milestones.length} milestone
                {milestones.length === 1 ? "" : "s"} ({milestoneDone} done)
              </span>
              <span>
                {events.length} linked event{events.length === 1 ? "" : "s"}
              </span>
              {showLeader && project.project_leader?.username && (
                <span>Lead: {project.project_leader.username}</span>
              )}
            </div>
          </div>
          <span className="text-fg-muted mt-1">
            {isExpanded ? (
              <FaChevronUp size={12} />
            ) : (
              <FaChevronDown size={12} />
            )}
          </span>
        </button>

        {isExpanded && (
          <div className="border-t border-line-subtle px-4 sm:px-5 py-4 space-y-5">
            <DetailTabs
              tabs={[
                { key: "details", label: "Project Details" },
                {
                  key: "milestones",
                  label: "Milestones",
                  count: milestones.length,
                },
                { key: "events", label: "Linked Events", count: events.length },
                {
                  key: "accomplishment",
                  label: "Actuals & Accomplishment",
                },
              ]}
              active={detailTab}
              onChange={setDetailTab}
            />

            {detailTab === "details" && (
              <div className="animate-fade-in space-y-5" role="tabpanel">
                {detailSections.map((section) => (
                  <DetailSection key={section.title} title={section.title}>
                    {section.fields
                      .filter(
                        (field) =>
                          canSeeBudget ||
                          (!BUDGET_DETAIL_KEYS.includes(field.key) &&
                            field.key !== budgetField),
                      )
                      .map((field) => (
                        <DetailRow
                          key={field.key}
                          label={field.label}
                          value={renderDetailValue(field)}
                        />
                      ))}
                    {section.fields.some(
                      (field) => field.key === budgetField,
                    ) &&
                      canSeeBudget && (
                        <DetailBarRow
                          label="Budget Utilization"
                          percent={budget > 0 ? utilization : 0}
                          over={budget > 0 && spent > budget}
                          caption={
                            budget > 0
                              ? `${fmtPeso(spent)} of ${fmtPeso(budget)}`
                              : "No budget encoded"
                          }
                        />
                      )}
                  </DetailSection>
                ))}
              </div>
            )}

            {detailTab === "milestones" && (
              <div className="animate-fade-in" role="tabpanel">
                {managementAllowed ? (
                  <MilestonesModal
                    inline
                    key={`${project._id}-${(project.gantt_activities || []).length}-${milestones.length}`}
                    project={project}
                    userId={userId}
                    endpoint={apiBase}
                    onSaved={() => reload()}
                  />
                ) : (
                  <div className="mb-4">
                    <GanttReadOnly project={project} compact />
                  </div>
                )}

                <p
                  className={`text-2xs font-semibold uppercase tracking-wider text-fg-muted mb-2 ${
                    managementAllowed ? "hidden" : ""
                  }`}
                >
                  Milestones
                </p>
                <ul
                  className={`space-y-1.5 ${managementAllowed ? "hidden" : ""}`}
                >
                  {milestones.map((milestone, index) => (
                    <li
                      key={`${project._id}-ms-${index}`}
                      className="flex flex-wrap items-center gap-2 text-xs text-fg-4"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          milestone.status === "completed"
                            ? "bg-emerald-500"
                            : milestone.status === "ongoing"
                              ? "bg-secondary-500"
                              : "bg-gray-300"
                        }`}
                      />
                      <span className="font-medium text-fg-2">
                        {milestone.title}
                      </span>
                      <span className="text-fg-muted">{milestone.status}</span>
                      {(formatDate(milestone.actual_date) ||
                        formatDate(milestone.target_date)) && (
                        <span className="text-fg-muted">
                          ·{" "}
                          {formatDate(milestone.actual_date) ||
                            formatDate(milestone.target_date)}
                        </span>
                      )}
                      {Array.isArray(milestone.proofs) &&
                        milestone.proofs.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-fg-muted">
                            <FaPaperclip size={9} /> {milestone.proofs.length}
                          </span>
                        )}
                      {milestone.source_activity && (
                        <span className="basis-full pl-3.5 text-xs text-fg-muted">
                          from: {milestone.source_activity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {milestones.length === 0 && !managementAllowed && (
                  <p className="text-xs text-fg-muted italic">
                    No milestones recorded yet.
                  </p>
                )}
              </div>
            )}

            {detailTab === "events" && (
              <div className="animate-fade-in" role="tabpanel">
                <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
                  Linked Events
                </p>
                {events.length === 0 && (
                  <p className="text-xs text-fg-muted italic">
                    No linked events yet.
                  </p>
                )}
                <ul className="space-y-1.5">
                  {events.map((event) => (
                    <li
                      key={event._id}
                      className="flex flex-wrap items-center gap-2 text-xs text-fg-4"
                    >
                      <span className="font-medium text-fg-2">
                        {event.title}
                      </span>
                      {getEventStart(event) && (
                        <span className="text-fg-muted">
                          {formatDate(getEventStart(event))}
                        </span>
                      )}
                      <span className="text-fg-muted">
                        {participantCount(event)} attended
                      </span>
                      {event.status && event.status !== "active" && (
                        <span className="text-fg-muted">{event.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detailTab === "accomplishment" && (
              <div className="animate-fade-in" role="tabpanel">
                <div className="rounded-xl border border-line-subtle bg-subtle/50 p-3.5">
                  {milestones.length > 0 && (
                    <p className="text-xs text-fg-muted mb-2">
                      Milestone progress:{" "}
                      <span className="font-medium text-fg-3">
                        {milestoneDone}/{milestones.length} completed (
                        {Math.round((milestoneDone / milestones.length) * 100)}
                        %)
                      </span>
                    </p>
                  )}

                  <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
                    Actual Accomplishment
                  </p>
                  <p className="text-sm text-fg-2 mt-1 whitespace-pre-line">
                    {accomplishment || "—"}
                  </p>
                  {canSeeBudget &&
                    Array.isArray(project.expenditure_evidence) &&
                    project.expenditure_evidence.length > 0 && (
                      <p className="text-xs text-fg-muted mt-2 inline-flex items-center gap-1">
                        <FaPaperclip size={9} />{" "}
                        {project.expenditure_evidence.length} evidence file
                        {project.expenditure_evidence.length === 1 ? "" : "s"}
                      </p>
                    )}
                </div>
              </div>
            )}

            {(managementAllowed || creatorAllowed) && (
              <div className="flex flex-wrap items-center gap-2">
                {managementAllowed && (
                  <button
                    type="button"
                    onClick={() => setEditProject(project)}
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-fg-3 hover:bg-subtle transition-colors"
                  >
                    <FaPen size={11} />
                    Edit Project
                  </button>
                )}
                {creatorAllowed && (
                  <Button
                    variant="primary"
                    onClick={() => setActualsProject(project)}
                    className="rounded-lg px-3.5 py-2 text-xs"
                  >
                    <FaWallet size={11} />
                    Update Actuals
                  </Button>
                )}
                {managementAllowed && (
                  <button
                    type="button"
                    onClick={() => setDeletingProject(project)}
                    className="inline-flex items-center gap-2 rounded-lg border border-danger-border bg-white px-3.5 py-2 text-xs font-medium text-danger hover:bg-danger-subtle transition-colors"
                  >
                    <FaTrash size={11} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-fg">
            {title}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
            className="px-5"
          >
            <FaPlus size={12} />
            New Project
          </Button>
        )}
      </div>

      <div
        className={`grid grid-cols-2 gap-3 ${
          budgetView === BUDGET_VIEW.NONE ? "lg:grid-cols-3" : "lg:grid-cols-4"
        }`}
      >
        <StatCard
          icon={<FaFolderOpen size={14} />}
          iconClass="bg-rose-50 text-rose-600"
          label="Total Projects"
          value={stats.total}
          sub={year ? ayLabel(year) : "All years"}
        />
        <StatCard
          icon={<FaClock size={14} />}
          iconClass="bg-secondary-50 text-secondary-600"
          label="Ongoing"
          value={stats.ongoing}
        />
        <StatCard
          icon={<FaCheckCircle size={14} />}
          iconClass="bg-success-subtle text-success"
          label="Completed"
          value={stats.completed}
        />
        {budgetView !== BUDGET_VIEW.NONE && (
          <StatCard
            icon={<FaWallet size={14} />}
            iconClass="bg-secondary-50 text-secondary-600"
            label="Budget"
            value={fmtPeso(budgetSummary.totalBudget)}
            sub={`Spent ${fmtPeso(budgetSummary.totalExpenditures)}`}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={toolbarSelect}
        >
          {years.length === 0 && <option value="">No years yet</option>}
          {years.map((option) => (
            <option key={option} value={option}>
              {ayLabel(option)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={toolbarSelect}
        >
          <option value="">All Statuses</option>
          {statuses.map((option) => (
            <option key={option} value={option}>
              {getProjectModuleStatusMeta(option).label}
            </option>
          ))}
        </select>

        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filterState[filter.key] || ""}
            onChange={(e) =>
              setFilterState((prev) => ({
                ...prev,
                [filter.key]: e.target.value,
              }))
            }
            className={toolbarSelect}
          >
            <option value="">{filter.label}: All</option>
            {filter.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ))}

        <div className="relative flex-1 min-w-[180px]">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
            size={12}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or reference no."
            className="w-full rounded-lg border border-line bg-white pl-8 pr-3 py-2 text-sm text-fg-3 placeholder:text-fg-muted focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-fg-muted">
          <FaSpinner className="animate-spin" size={20} />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-subtle px-4 py-3 text-sm text-danger">
          <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-line-subtle py-16 text-center">
          <FaFolderOpen className="h-10 w-10 text-fg-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-fg">No projects found</p>
          <p className="text-xs text-fg-muted mt-1">
            {projects.length === 0
              ? emptyHint ||
                "Create the first project to start monitoring it here."
              : "Try adjusting the year, status, or search filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">{filtered.map(renderProjectCard)}</div>
      )}

      {showCreate && (
        <ProjectCreateModal
          config={config}
          apiBase={apiBase}
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editProject && (
        <EditProjectModal
          config={config}
          project={editProject}
          apiBase={apiBase}
          userId={userId}
          onClose={() => setEditProject(null)}
          onSaved={() => {
            setEditProject(null);
            reload();
          }}
        />
      )}

      {deletingProject && (
        <ProjectDeleteModal
          project={deletingProject}
          apiBase={apiBase}
          onClose={() => setDeletingProject(null)}
          onDeleted={(deletedId) => {
            setDeletingProject(null);
            setExpandedId((prev) => (prev === deletedId ? null : prev));
            setProjects((prev) => prev.filter((p) => p._id !== deletedId));
            reload();
          }}
        />
      )}

      {milestoneProject && (
        <MilestonesModal
          project={milestoneProject}
          userId={userId}
          endpoint={apiBase}
          onClose={() => setMilestoneProject(null)}
          onSaved={() => {
            setMilestoneProject(null);
            reload();
          }}
        />
      )}

      {actualsProject && (
        <ActualsEncoderModal
          project={actualsProject}
          userId={userId}
          endpoint={apiBase}
          budgetField={budgetField}
          budgetLabel="Budget (Planned)"
          onClose={() => setActualsProject(null)}
          onSaved={() => {
            setActualsProject(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
