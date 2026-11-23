"use client";

import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import {
  generateAccomplishmentSummary,
  resolveAccomplishmentLines,
  usesAccomplishmentOverride,
} from "@/data/lib/accomplishmentSummary";
import GanttReadOnly from "../../components/GanttReadOnly";
import MilestonesModal from "../../components/MilestonesModal";
import { formatDate, getEventStart, getSortedEvents } from "../../lib/projectView";
import {
  EVENT_STATUS_META,
  MILESTONE_STATUS_META,
  getMilestoneProgress,
  getMilestones,
} from "../lib/gadProjects";
import { EditButton, FieldLabel, FileChip, StatusPill } from "./DetailFields";

/* Read-only milestone table for viewers who cannot edit the project. */
function MilestoneTable({ project }) {
  const milestones = getMilestones(project);
  const progress = getMilestoneProgress(project);

  if (milestones.length === 0) {
    return (
      <p className="text-xs text-fg-muted italic">
        No milestones recorded yet. Only the project creator or a GAD Focal
        Person can add milestones.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-line-subtle">
        <table className="w-full text-left">
          <thead className="bg-subtle text-2xs uppercase tracking-wider text-fg-muted">
            <tr>
              <th className="px-2 py-1.5 font-semibold">Milestone / Activity</th>
              <th className="px-2 py-1.5 font-semibold whitespace-nowrap">
                Target Date
              </th>
              <th className="px-2 py-1.5 font-semibold whitespace-nowrap">
                Actual Date
              </th>
              <th className="px-2 py-1.5 font-semibold">Status</th>
              <th className="px-2 py-1.5 font-semibold">Proof</th>
              <th className="px-2 py-1.5 font-semibold">Source Activity</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => {
              const meta =
                MILESTONE_STATUS_META[m.status] || MILESTONE_STATUS_META.pending;
              const proofs = (Array.isArray(m.proofs) ? m.proofs : []).filter(
                (file) => file && (file.url || file.key),
              );
              return (
                <tr key={m._id || i} className="border-t border-line-subtle">
                  <td className="px-2 py-2 text-xs text-fg-3">{m.title}</td>
                  <td className="px-2 py-2 text-xs text-fg-4 whitespace-nowrap">
                    {formatDate(m.target_date) || "—"}
                  </td>
                  <td className="px-2 py-2 text-xs text-fg-4 whitespace-nowrap">
                    {formatDate(m.actual_date) || "—"}
                  </td>
                  <td className="px-2 py-2">
                    <StatusPill meta={meta} className="text-xs" />
                  </td>
                  <td className="px-2 py-2">
                    {proofs.length > 0 ? (
                      <ul className="flex flex-wrap gap-1">
                        {proofs.map((file, fi) => (
                          <li key={file.key || file.url || fi}>
                            <FileChip file={file} fallbackName="Proof file" size="sm" />
                          </li>
                        ))}
                      </ul>
                    ) : m.status === "completed" ? (
                      <span className="text-xs font-medium text-secondary-600">
                        Missing proof
                      </span>
                    ) : (
                      <span className="text-xs text-fg-muted">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-fg-4">
                    {m.source_activity || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-fg-muted">
        Progress:{" "}
        <span className="font-medium text-fg-3">
          {progress.done}/{progress.total} ({progress.percent}%)
        </span>
      </p>
    </>
  );
}

/* Linked events as a timeline, then the actual accomplishment text. */
function Accomplishments({ project }) {
  const events = getSortedEvents(project);
  /* Saved custom text wins; otherwise the accomplishment is derived live
     from the linked events so it never goes stale. */
  const isOverride = usesAccomplishmentOverride(project);
  const generated =
    project.generated_accomplishment || generateAccomplishmentSummary(project);
  const accomplishments = isOverride
    ? resolveAccomplishmentLines(project)
    : [generated].filter(Boolean);

  if (events.length === 0 && accomplishments.length === 0) {
    return (
      <p className="text-xs text-fg-muted italic">
        No linked events or accomplishment entries yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {events.length > 0 && (
        <ol>
          {events.map((ev, i) => {
            const meta = EVENT_STATUS_META[ev?.status] || EVENT_STATUS_META.active;
            const start = getEventStart(ev);
            return (
              <li key={ev?._id || i} className="relative flex gap-3 pb-4 last:pb-0">
                {i < events.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-emphasis" />
                )}
                <span
                  className={`h-4 w-4 rounded-full mt-0.5 shrink-0 ring-4 ring-white ${meta.dot}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg break-words">
                    {ev?.title || "Untitled event"}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {start ? formatDate(start) : "No date set"}
                    {ev?.venue ? ` • ${ev.venue}` : ""}
                  </p>
                  <span className="mt-1 inline-block">
                    <StatusPill meta={meta} className="text-xs" />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {accomplishments.length > 0 && (
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5 flex flex-wrap items-center gap-2">
            Actual Accomplishment
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium normal-case tracking-normal ${
                isOverride
                  ? "border-secondary-200 bg-secondary-50 text-secondary-700"
                  : "border-success-border bg-success-subtle text-success"
              }`}
            >
              {isOverride ? "Custom (manual)" : "Auto from linked events"}
            </span>
          </p>
          <ul className="space-y-1">
            {accomplishments.map((a, i) => (
              <li key={i} className="text-xs text-fg-3 flex gap-2">
                <FaCheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* "Milestones & Accomplishments" tab. Managers edit milestones and the
   Gantt chart inline; everyone else sees the chart and a milestone table. */
export default function MilestonesTab({
  project,
  canManage,
  userId,
  onMilestonesSaved,
  onEditActuals,
}) {
  const milestoneCount = getMilestones(project).length;
  return (
    <section
      className="rounded-xl bg-white border border-line-subtle p-4 animate-fade-in"
      role="tabpanel"
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        Milestones &amp; Accomplishments
      </p>

      <div className="mb-4 space-y-2">
        <FieldLabel>Milestones</FieldLabel>
        {canManage ? (
          <MilestonesModal
            inline
            key={`${project._id}-${(project.gantt_activities || []).length}-${milestoneCount}`}
            project={project}
            userId={userId}
            onSaved={onMilestonesSaved}
          />
        ) : (
          <>
            <GanttReadOnly project={project} />
            <div className="space-y-2">
              <MilestoneTable project={project} />
            </div>
          </>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
          Actual Accomplishments
        </p>
        {canManage && <EditButton onClick={onEditActuals}>Update Actuals</EditButton>}
      </div>

      <Accomplishments project={project} />
    </section>
  );
}
