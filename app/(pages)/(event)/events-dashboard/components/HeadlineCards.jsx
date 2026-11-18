"use client";

import { useRouter } from "next/navigation";
import { SkeletonCard, StatCard } from "./DashboardUi";
import {
  AlertCircle,
  PiggyBank,
  Target,
  Users,
} from "lucide-react";
import { fmtPesoCompact } from "../lib/dashboardData";

/* The four headline cards: GAD impact, participation gaps, budget utilized, completion. */
export default function HeadlineCards({ dashboard }) {
  const router = useRouter();
  const {
    eventsLoading,
    gpbLoading,
    useSample,
    sampleImpact,
    genderLoading,
    selectedYearLabel,
    readinessLoading,
    readiness,
    projectsSnapshot,
    selectedYear,
  } = dashboard;

  return (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    {eventsLoading || gpbLoading ? (
      Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
    ) : (
      <>
        <StatCard
          icon={Users}
          iconClass="bg-pink-50 text-pink-600"
          label="Female Participation"
          source={useSample ? "sample" : "live"}
          value={
            useSample
              ? sampleImpact?.femalePct != null
                ? `${sampleImpact.femalePct}%`
                : "—"
              : genderLoading
                ? "…"
                : "—"
          }
          hint={
            useSample
              ? sampleImpact
                ? `${sampleImpact.female.toLocaleString()} F · ${sampleImpact.male.toLocaleString()} M · ${selectedYearLabel}`
                : `No sample data for ${selectedYearLabel}`
              : selectedYearLabel
          }
          barPercent={useSample ? sampleImpact?.femalePct : undefined}
          barClass="bg-pink-500"
          onClick={() => router.push("/gender-statistics/students")}
        />
        <StatCard
          icon={AlertCircle}
          iconClass={
            useSample && sampleImpact && sampleImpact.gaps.length === 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-secondary-50 text-secondary-600"
          }
          label="Participation Gaps"
          source={useSample ? "sample" : "live"}
          value={
            useSample
              ? sampleImpact
                ? sampleImpact.gaps.length
                : "—"
              : (readinessLoading
                ? "…"
                : (readiness?.projects?.missingAccomplishments?.length || 0) +
                  (readiness?.projects?.missingEvidence?.length || 0))
          }
          hint={
            useSample
              ? sampleImpact
                ? sampleImpact.gaps.length === 0
                  ? `All clear · ${selectedYearLabel}`
                  : `Lowest: ${sampleImpact.gaps[0].name} ${sampleImpact.gaps[0].femalePct}% · ${selectedYearLabel}`
                : `No sample data for ${selectedYearLabel}`
              : `Missing entries · ${selectedYearLabel}`
          }
          onClick={() => router.push("/gender-statistics/students")}
        />
        <StatCard
          icon={PiggyBank}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Budget Utilized"
          source="live"
          value={`${projectsSnapshot.utilizationPct}%`}
          hint={`${fmtPesoCompact(projectsSnapshot.spent)} of ${fmtPesoCompact(projectsSnapshot.allotted)} · ${selectedYearLabel}`}
          barPercent={projectsSnapshot.utilizationPct}
          barClass="bg-emerald-500"
          onClick={() =>
            selectedYear ? router.push(`/gpb/${selectedYear}`) : router.push("/gpb")
          }
        />
        <StatCard
          icon={Target}
          iconClass="bg-secondary-50 text-secondary-600"
          label="Completion"
          source="live"
          value={
            projectsSnapshot.total
              ? `${projectsSnapshot.completed}/${projectsSnapshot.total}`
              : "—"
          }
          hint={
            projectsSnapshot.total
              ? `${projectsSnapshot.completionPct}% done · ${projectsSnapshot.ongoing} ongoing · ${selectedYearLabel}`
              : `No GPB projects · ${selectedYearLabel}`
          }
          barPercent={projectsSnapshot.completionPct}
          barClass="bg-secondary-500"
          onClick={() => router.push("/project-monitoring/gad-projects")}
        />
      </>
    )}
          </div>
  );
}
