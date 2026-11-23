"use client";

import { useRouter } from "next/navigation";
import {
  CardShell,
  EmptyState,
  SnapshotRow,
  SnapshotSkeleton,
} from "./DashboardUi";
import {
  ArrowRight,
  Clock,
  Inbox,
  PiggyBank,
  Target,
  TrendingUp,
} from "lucide-react";
import { fmtPesoCompact } from "../lib/dashboardData";

/* The selected year's GAD projects snapshot. */
export default function GadProjectsCard({ dashboard }) {
  const router = useRouter();
  const {
    selectedYear,
    projectsSnapshot,
    gpbLoading,
  } = dashboard;

  return (
    <CardShell
      icon={Target}
      iconClass="bg-rose-50 text-rose-600"
      title="GAD Projects"
      subtitle={
        selectedYear
          ? `AY ${selectedYear}-${Number(selectedYear) + 1}`
          : "Project monitoring"
      }
      action={
        projectsSnapshot.total > 0 ? (
          <span className="text-xs text-gray-500 shrink-0">
            {projectsSnapshot.total} listed
          </span>
        ) : null
      }
    >
      {gpbLoading ? (
        <SnapshotSkeleton rows={3} />
      ) : projectsSnapshot.total === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No projects"
          description={`No GAD projects recorded for ${
            selectedYear || "this year"
          } yet.`}
          action={
            <button
              onClick={() =>
                router.push("/project-monitoring/gad-projects")
              }
              className="text-xs font-medium text-secondary-600 hover:text-secondary-700 transition-colors"
            >
              Open Project Monitoring
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-gray-50/70 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                Accomplished
              </p>
              <p className="text-lg font-bold text-gray-900">
                {projectsSnapshot.completed}/{projectsSnapshot.total}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50/70 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                Milestones
              </p>
              <p className="text-lg font-bold text-gray-900">
                {projectsSnapshot.milestonesDone}/
                {projectsSnapshot.milestones}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <SnapshotRow
              icon={TrendingUp}
              label={`Project completion (${projectsSnapshot.ongoing} ongoing)`}
              value={`${projectsSnapshot.completionPct}%`}
              percent={projectsSnapshot.completionPct}
              barClass="bg-emerald-500"
            />
            <SnapshotRow
              icon={PiggyBank}
              label="Budget utilization"
              value={`${fmtPesoCompact(
                projectsSnapshot.spent,
              )} / ${fmtPesoCompact(projectsSnapshot.allotted)}`}
              percent={projectsSnapshot.utilizationPct}
              barClass="bg-secondary-500"
            />
            <SnapshotRow
              icon={Clock}
              label="Still for review"
              value={`${projectsSnapshot.forReview} project${
                projectsSnapshot.forReview === 1 ? "" : "s"
              }`}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={() =>
                router.push("/project-monitoring/gad-projects")
              }
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-secondary-600 hover:text-secondary-700 py-2 rounded-lg hover:bg-secondary-50 transition-all duration-200"
            >
              Open Project Monitoring
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </CardShell>
  );
}
