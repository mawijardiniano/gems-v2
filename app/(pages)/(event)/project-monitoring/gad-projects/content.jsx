"use client";

import React, { useMemo, useState } from "react";
import { FaChartLine, FaExclamationTriangle, FaFolderOpen } from "react-icons/fa";
import {
  budgetProjectsFor,
  budgetViewFor,
  summarizeBudget,
} from "@/data/lib/budgetVisibility";
import ActualsEncoderModal from "../components/ActualsEncoderModal";
import { useGadProjects } from "./hooks/useGadProjects";
import { useGadProjectList } from "./hooks/useGadProjectList";
import { useProgressReport } from "./hooks/useProgressReport";
import { GadFilterBar, GadStatCards, QuickReports } from "./components/GadOverview";
import GadProjectsTable from "./components/GadProjectsTable";

const ErrorBanner = ({ children }) => (
  <div
    className="flex items-center gap-3 p-4 rounded-xl border border-danger-border bg-danger-subtle text-danger text-sm animate-slide-up"
    role="alert"
  >
    <FaExclamationTriangle className="h-5 w-5 shrink-0" />
    <span>{children}</span>
  </div>
);

export default function GADProjectsMonitoringContent() {
  const { projects, loading, error, viewer, loadProjects, patchProject } =
    useGadProjects();
  const list = useGadProjectList(projects, loading);
  const report = useProgressReport(list.filters.yearFilter);
  /* The project whose actuals (expenditures, evidence) are being encoded. */
  const [actualsProject, setActualsProject] = useState(null);

  /* Budget figures are scoped by role: the focal person sees every office,
     a coordinator only the college they are assigned to, everyone else none. */
  const budgetView = useMemo(() => budgetViewFor(viewer.role), [viewer.role]);
  const budgetSummary = useMemo(
    () =>
      summarizeBudget(
        budgetProjectsFor(budgetView, list.filteredProjects, viewer.assignedCollege),
      ),
    [budgetView, list.filteredProjects, viewer.assignedCollege],
  );

  const actions = { patchProject, editActuals: setActualsProject };

  return (
    <div className="space-y-5 mx-auto py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2">
            <FaChartLine className="text-rose-600" />
            GAD Projects/Activities Monitoring
          </h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Monitor GAD projects and activities across academic years — update
            actuals as activities are conducted
          </p>
        </div>
        <p className="text-xs text-fg-muted">
          {list.totals.listed} project{list.totals.listed !== 1 ? "s" : ""} listed
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {report.reportError && <ErrorBanner>{report.reportError}</ErrorBanner>}

      {actualsProject && (
        <ActualsEncoderModal
          project={actualsProject}
          userId={viewer.userId}
          onClose={() => setActualsProject(null)}
          onSaved={() => loadProjects()}
        />
      )}

      <GadStatCards
        totals={list.totals}
        yearFilter={list.filters.yearFilter}
        budgetView={budgetView}
        budgetSummary={budgetSummary}
      />

      <GadFilterBar list={list} />

      <QuickReports yearFilter={list.filters.yearFilter} report={report} />

      {loading ? (
        <div className="animate-pulse space-y-4 p-6 bg-white rounded-2xl border border-line-subtle">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-emphasis rounded" />
          ))}
        </div>
      ) : list.filteredProjects.length === 0 ? (
        <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-12 text-center">
          <FaFolderOpen className="h-10 w-10 text-fg-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-fg">
            No GAD projects/activities found
          </p>
          <p className="text-xs text-fg-muted mt-1">
            {projects.length === 0
              ? "Create GPB projects first — they will appear here for monitoring."
              : "Try adjusting the academic year, college/office, status, or search filters."}
          </p>
        </div>
      ) : (
        <GadProjectsTable
          list={list}
          viewer={viewer}
          budgetView={budgetView}
          actions={actions}
        />
      )}
    </div>
  );
}
