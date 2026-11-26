"use client";

import React, { useState } from "react";
import {
  FaCalendarAlt,
  FaClipboardCheck,
  FaPaperclip,
  FaUsers,
} from "react-icons/fa";
import { formatPeso } from "@/data/lib/money";
import { participantCount } from "@/data/lib/eventParticipants";
import { aggregateIndicatorProgress } from "@/data/lib/performanceTracking";
import ParticipantBreakdown from "../../components/ParticipantBreakdown";
import ParticipantTargetProgress from "../../components/ParticipantTargetProgress";
import {
  formatDate,
  getEventStart,
  getFieldValue,
  getSortedEvents,
} from "../../lib/projectView";
import { EditButton, FileChip } from "./DetailFields";
import EventAttendanceModal from "./EventAttendanceModal";

function BudgetUtilization({ project, canManage, onEditActuals }) {
  const budget = Number(getFieldValue(project.gad_budget) || 0);
  const spent = Number(project.actual_expenditures || 0);
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const isOver = pct > 100;
  return (
    <section className="rounded-xl bg-white border border-line-subtle p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Budget Utilization
        </p>
        {canManage && <EditButton onClick={onEditActuals}>Update</EditButton>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-fg">{formatPeso(spent)}</span>
        <span className="text-fg-muted">of {formatPeso(budget)}</span>
        <span className={`font-bold ${isOver ? "text-danger" : "text-success"}`}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
      {budget === 0 && (
        <p className="text-xs text-fg-muted italic">
          No GAD budget set for this project.
        </p>
      )}
    </section>
  );
}

function ExpenditureEvidence({ project }) {
  const files = Array.isArray(project.expenditure_evidence)
    ? project.expenditure_evidence
    : [];
  return (
    <section className="rounded-xl bg-white border border-line-subtle p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
        <FaPaperclip className="h-3 w-3" />
        Expenditure Evidence
      </p>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <li key={file?.key || i}>
              <FileChip file={file} fallbackName="Evidence file" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg-muted italic">
          No expenditure evidence uploaded.
        </p>
      )}
    </section>
  );
}

function ParticipantsPerEvent({ project }) {
  const events = getSortedEvents(project);
  /* Target vs actual comes from the project's Performance Indicator / Target;
     events have no target of their own. */
  const indicatorProgress = aggregateIndicatorProgress(project);
  return (
    <section className="rounded-xl bg-white border border-line-subtle p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-1.5">
        <FaUsers className="h-3 w-3" />
        Participants per Event
      </p>
      {events.length === 0 ? (
        <p className="text-xs text-fg-muted italic">No linked events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-2xs uppercase tracking-wider text-fg-muted">
                <th className="text-left py-1.5 font-semibold">Event</th>
                <th className="text-center py-1.5 font-semibold w-16">Attended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-faint">
              {events.map((ev, i) => (
                <tr key={ev?._id || i}>
                  <td className="py-2 pr-2 text-fg-2">
                    <span className="line-clamp-2">{ev?.title || "Untitled event"}</span>
                  </td>
                  <td className="py-2 text-center text-fg-2">
                    {participantCount(ev)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ParticipantTargetProgress
            className="mt-4 border-t border-line-subtle pt-3"
            actual={indicatorProgress.actualTotal}
            target={indicatorProgress.targetTotal}
            emptyMessage="No participant target found in the Performance Indicator / Target."
          />
        </div>
      )}
    </section>
  );
}

/* Linked events with their office, the project they count toward and how many
   attended, plus an Attendance button per event (QR form or blank sheet). */
function LinkedEvents({ project }) {
  const events = getSortedEvents(project);
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const head = "text-left py-2 px-2 font-semibold";
  return (
    <section className="rounded-xl bg-white border border-line-subtle p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-1.5">
        <FaCalendarAlt className="h-3 w-3" />
        Linked Events
      </p>
      {events.length === 0 ? (
        <p className="text-xs text-fg-muted italic">No linked events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-2xs uppercase tracking-wider text-fg-muted border-b border-line-subtle">
                <th className={head}>Activity</th>
                <th className={`${head} whitespace-nowrap`}>Date</th>
                <th className={head}>Office / Project</th>
                <th className={head}>Participation</th>
                <th className="py-2 px-2 w-px" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-faint">
              {events.map((ev, i) => {
                const offices = Array.isArray(ev?.organizing_office_unit)
                  ? ev.organizing_office_unit.filter(Boolean).join(", ")
                  : "";
                const count = participantCount(ev);
                return (
                  <tr key={ev?._id || i} className="align-top">
                    <td className="py-2.5 px-2">
                      <span className="block font-medium text-fg-2 line-clamp-2">
                        {ev?.title || "Untitled event"}
                      </span>
                      {ev?.type_of_activity && (
                        <span className="block text-fg-muted mt-0.5">
                          {ev.type_of_activity}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap text-fg-2">
                      {formatDate(getEventStart(ev)) || "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="block text-fg-2">{offices || "—"}</span>
                      {project.reference_number && (
                        <span className="block font-mono text-2xs text-fg-muted mt-0.5">
                          {project.reference_number}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {count > 0 ? (
                        <span className="text-fg-2">{count} attended</span>
                      ) : (
                        <span className="text-fg-muted italic">Not yet reported</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => setAttendanceEvent(ev)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-fg-3 hover:bg-subtle transition-colors"
                      >
                        <FaClipboardCheck className="h-3 w-3" />
                        Attendance
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {attendanceEvent && (
        <EventAttendanceModal
          event={attendanceEvent}
          onClose={() => setAttendanceEvent(null)}
        />
      )}
    </section>
  );
}

/* "Events / Actuals" tab. The budget figures and their evidence follow the
   viewer's budget scope: a coordinator sees them only on their own college's
   projects, other roles not at all. */
export default function EventsTab({ project, canManage, canSeeBudget, onEditActuals }) {
  return (
    <div className="space-y-4 animate-fade-in" role="tabpanel">
      <LinkedEvents project={project} />

      {canSeeBudget && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BudgetUtilization
            project={project}
            canManage={canManage}
            onEditActuals={onEditActuals}
          />
          <ExpenditureEvidence project={project} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParticipantBreakdown project={project} />
        <ParticipantsPerEvent project={project} />
      </div>
    </div>
  );
}
