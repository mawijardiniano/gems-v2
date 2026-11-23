"use client";

import React from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFileAlt,
  FaTimes,
} from "react-icons/fa";
import { formatPeso } from "@/data/lib/money";
import { canManageProject } from "@/data/lib/projectAccess";
import { BUDGET_VIEW, canViewProjectBudget } from "@/data/lib/budgetVisibility";
import DetailTabs from "../../components/DetailTabs";
import {
  ayLabel,
  formatDate,
  getActiveEvents,
  getArrayValue,
  getFieldValue,
} from "../../lib/projectView";
import {
  PROJECTS_PER_PAGE,
  PROJECT_STATUS_META,
  getMilestoneProgress,
  getMilestones,
  getProjectStatus,
  isOwnProject,
  pageWindow,
} from "../lib/gadProjects";
import { StatusPill } from "./DetailFields";
import DetailsTab from "./DetailsTab";
import ApprovalTab from "./ApprovalTab";
import MilestonesTab from "./MilestonesTab";
import EventsTab from "./EventsTab";

const HEADERS = [
  { label: "#", className: "text-center w-14" },
  { label: "GAD Activity" },
  { label: "College/Office" },
  { label: "GAD Mandate" },
  { label: "Start", className: "whitespace-nowrap" },
  { label: "End", className: "whitespace-nowrap" },
  { label: "Budget", className: "whitespace-nowrap", budget: true },
  { label: "Status" },
  { label: "Progress", className: "whitespace-nowrap" },
  { label: "Actions", className: "text-center w-24" },
];

function ProgressBar({ project }) {
  const progress = getMilestoneProgress(project);
  return (
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
  );
}

/* The opened project: its tabs and their content. */
function ProjectPanel({ project, access, list, viewer, actions }) {
  const statusMeta = PROJECT_STATUS_META[getProjectStatus(project)];
  const tabs = [
    { key: "details", label: "Project Details" },
    { key: "approval", label: "Approval" },
    {
      key: "milestones",
      label: "Milestones & Accomplishments",
      count: getMilestones(project).length,
    },
    {
      key: "events",
      label: "Events / Actuals",
      count: getActiveEvents(project).length,
    },
  ];
  const onSaved = (changes) => actions.patchProject(project._id, changes);
  const onEditActuals = () => actions.editActuals(project);

  return (
    <div className="p-4 sm:p-5 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FaFileAlt className="text-rose-500" />
          Project Details
          <span className="ml-2">
            <StatusPill meta={statusMeta} />
          </span>
        </h3>
        <button
          type="button"
          onClick={list.closeProject}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
        >
          <FaTimes className="h-3 w-3" />
          Close
        </button>
      </div>

      <DetailTabs tabs={tabs} active={list.detailTab} onChange={list.setDetailTab} />

      {list.detailTab === "details" && (
        <DetailsTab project={project} canManage={access.canManage} onSaved={onSaved} />
      )}
      {list.detailTab === "approval" && (
        <ApprovalTab project={project} canManage={access.canManage} onSaved={onSaved} />
      )}
      {list.detailTab === "milestones" && (
        <MilestonesTab
          project={project}
          canManage={access.canManage}
          userId={viewer.userId}
          onMilestonesSaved={(milestones, activities) =>
            onSaved({
              milestones,
              ...(Array.isArray(activities) ? { gantt_activities: activities } : {}),
            })
          }
          onEditActuals={onEditActuals}
        />
      )}
      {list.detailTab === "events" && (
        <EventsTab
          project={project}
          canManage={access.canManage}
          canSeeBudget={access.canSeeBudget}
          onEditActuals={onEditActuals}
        />
      )}
    </div>
  );
}

function ProjectRow({ project, displayIndex, showBudget, list, viewer, budgetView, actions }) {
  const activities = getArrayValue(project.gad_activity);
  /* Index-paired with the titles; shorter on legacy projects. */
  const descriptions = getArrayValue(project.gad_activity_description);
  const office = getArrayValue(project.responsible_office).join(", ");
  const statusMeta = PROJECT_STATUS_META[getProjectStatus(project)];
  const budget = Number(getFieldValue(project.gad_budget) || 0);
  const isExpanded = list.expandedId === project._id;

  /* The same rule the API enforces: the creator, a GAD Focal Person or an
     Admin. The creator also keeps sight of their own project's budget even
     when it falls outside their budget scope. */
  const access = {
    canManage:
      Boolean(viewer.userId) &&
      canManageProject({ _id: viewer.userId, role: viewer.role }, project),
    canSeeBudget:
      canViewProjectBudget(budgetView, project, viewer.assignedCollege) ||
      isOwnProject(project, viewer.userId),
  };

  const cell = "px-3 py-4 align-top text-xs text-gray-800";

  return (
    <>
      <tr
        id={`gad-project-${project._id}`}
        onClick={() => list.toggleExpand(project._id)}
        className={`transition-colors ${
          isExpanded ? "bg-rose-50/40" : "hover:bg-gray-50 cursor-pointer"
        }`}
      >
        <td className="px-3 py-4 text-center text-xs font-medium text-gray-800 align-top">
          <div>{displayIndex}</div>
          {project.reference_number && (
            <div
              className="mt-1 font-mono text-[10px] font-normal text-gray-500 whitespace-nowrap"
              title="Project reference number"
            >
              {project.reference_number}
            </div>
          )}
        </td>
        <td className={cell}>
          {activities.length > 0 ? (
            <ol className="list-decimal list-inside space-y-0.5">
              {activities.map((a, i) => (
                <li key={i}>
                  {a}
                  {descriptions[i] ? (
                    <span className="mt-0.5 block">{descriptions[i]}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            "—"
          )}
        </td>
        <td className={cell}>{office || "—"}</td>
        <td className={cell}>{getFieldValue(project.gender_issue) || "—"}</td>
        <td className={`${cell} whitespace-nowrap`}>
          {formatDate(project.start_date) || "—"}
        </td>
        <td className={`${cell} whitespace-nowrap`}>
          {formatDate(project.end_date) || "—"}
        </td>
        {showBudget && (
          <td className={`${cell} font-medium whitespace-nowrap`}>
            {access.canSeeBudget && budget > 0 ? formatPeso(budget) : "—"}
          </td>
        )}
        <td className="px-3 py-4 align-top text-xs">
          <StatusPill meta={statusMeta} className="text-[10px]" />
        </td>
        <td className="px-3 py-4 align-top text-xs">
          <ProgressBar project={project} />
        </td>
        <td className="px-3 py-4 text-center align-top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              list.toggleExpand(project._id);
            }}
            title={isExpanded ? "Hide details" : "View details"}
            aria-expanded={isExpanded}
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
          <td colSpan={showBudget ? 10 : 9} className="p-0 bg-gray-50/60">
            <ProjectPanel
              project={project}
              access={access}
              list={list}
              viewer={viewer}
              actions={actions}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function Pagination({ list }) {
  const { currentPage, totalPages, filteredProjects, expandedId, filters } = list;
  const count = filteredProjects.length;
  const plural = count !== 1 ? "s" : "";
  const yearNote = filters.yearFilter ? ` for ${ayLabel(filters.yearFilter)}` : "";
  const pageStart = count === 0 ? 0 : (currentPage - 1) * PROJECTS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * PROJECTS_PER_PAGE, count);
  const navButton =
    "p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-xs text-gray-500">
        {expandedId ? (
          <>
            Viewing <span className="font-medium text-gray-700">1</span> of {count}{" "}
            project{plural}
            {yearNote} — close the details to show the rest
          </>
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-gray-700">
              {pageStart}–{pageEnd}
            </span>{" "}
            of {count} project{plural}
            {yearNote} — click a row to view its details
          </>
        )}
      </p>

      {!expandedId && totalPages > 1 && (
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => list.goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className={navButton}
          >
            <FaChevronLeft className="text-[10px]" />
          </button>
          {pageWindow(currentPage, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-gray-500">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => list.goToPage(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  p === currentPage
                    ? "bg-rose-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => list.goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className={navButton}
          >
            <FaChevronRight className="text-[10px]" />
          </button>
        </div>
      )}
    </div>
  );
}

/* The GAD projects table: one row per project, the opened project's
   panel underneath its row, and pagination. */
export default function GadProjectsTable({ list, viewer, budgetView, actions }) {
  const showBudget = budgetView !== BUDGET_VIEW.NONE;
  const indexOf = new Map(
    list.filteredProjects.map((p, i) => [String(p._id), i + 1]),
  );

  return (
    <div
      id="gad-projects-table"
      className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              {HEADERS.filter((h) => showBudget || !h.budget).map((h) => (
                <th
                  key={h.label}
                  className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider ${
                    h.className?.includes("text-center") ? "" : "text-left"
                  } ${h.className || ""}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.visibleProjects.map((project, idx) => (
              <ProjectRow
                key={project._id || idx}
                project={project}
                displayIndex={indexOf.get(String(project._id)) || idx + 1}
                showBudget={showBudget}
                list={list}
                viewer={viewer}
                budgetView={budgetView}
                actions={actions}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination list={list} />
    </div>
  );
}
