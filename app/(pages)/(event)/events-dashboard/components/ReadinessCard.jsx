"use client";

import { useRouter } from "next/navigation";
import {
  CardShell,
  ReadinessItem,
  SnapshotSkeleton,
  StatusBadge,
} from "./DashboardUi";
import { ArrowRight, ClipboardCheck } from "lucide-react";

/* Report readiness for the selected GPB year. */
export default function ReadinessCard({ dashboard }) {
  const router = useRouter();
  const {
    selectedYear,
    readiness,
    readinessLoading,
    readinessError,
  } = dashboard;

  return (
    <CardShell
      icon={ClipboardCheck}
      iconClass="bg-secondary-50 text-secondary-600"
      title="Report Readiness"
      subtitle={selectedYear ? `GPB ${selectedYear}` : "No year selected"}
      action={
        readiness?.gpbStatus ? (
          <StatusBadge status={readiness.gpbStatus} />
        ) : null
      }
    >
      {readinessLoading ? (
        <SnapshotSkeleton rows={3} />
      ) : readinessError ? (
        <p className="text-xs text-gray-500 italic">{readinessError}</p>
      ) : !readiness ? (
        <p className="text-xs text-gray-500 italic">
          Select an academic year to see what is still missing.
        </p>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            <ReadinessItem
              count={
                readiness.projects?.missingAccomplishments?.length || 0
              }
              label="projects without an accomplishment entry"
              clearLabel="Every project has an accomplishment entry"
              linkLabel="Open GAD Projects"
              onOpen={() => router.push("/project-monitoring/gad-projects")}
            />
            <ReadinessItem
              count={readiness.projects?.missingEvidence?.length || 0}
              label="projects with spending but no evidence"
              clearLabel="All expenditures have supporting evidence"
              linkLabel="Open GAD Projects"
              onOpen={() => router.push("/project-monitoring/gad-projects")}
            />
            <ReadinessItem
              count={readiness.events?.missingReports?.length || 0}
              label="completed events without a report"
              hint={`${readiness.events?.completed || 0} completed events this year`}
              clearLabel="All completed events have accomplishment reports"
              linkLabel="Open Events"
              onOpen={() => router.push("/events-list")}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={() => router.push("/reports")}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-secondary-600 hover:text-secondary-700 py-2 rounded-lg hover:bg-secondary-50 transition duration-200"
            >
              Open Reports &amp; Readiness
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </CardShell>
  );
}
