"use client";

import React from "react";
import { FaPaperclip, FaUsers } from "react-icons/fa";
import { formatPeso } from "@/data/lib/money";
import { aggregateIndicatorProgress } from "@/data/lib/performanceTracking";
import ParticipantBreakdown from "../../components/ParticipantBreakdown";
import ParticipantTargetProgress from "../../components/ParticipantTargetProgress";
import { getFieldValue, getSortedEvents } from "../../lib/projectView";
import { EditButton, FileChip } from "./DetailFields";

function BudgetUtilization({ project, canManage, onEditActuals }) {
  const budget = Number(getFieldValue(project.gad_budget) || 0);
  const spent = Number(project.actual_expenditures || 0);
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const isOver = pct > 100;
  return (
    <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Budget Utilization
        </p>
        {canManage && <EditButton onClick={onEditActuals}>Update</EditButton>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-900">{formatPeso(spent)}</span>
        <span className="text-gray-500">of {formatPeso(budget)}</span>
        <span className={`font-bold ${isOver ? "text-red-600" : "text-emerald-600"}`}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
      {budget === 0 && (
        <p className="text-xs text-gray-400 italic">
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
    <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
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
        <p className="text-xs text-gray-400 italic">
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
    <section className="rounded-xl bg-white border border-gray-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
        <FaUsers className="h-3 w-3" />
        Participants per Event
      </p>
      {events.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No linked events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                <th className="text-left py-1.5 font-semibold">Event</th>
                <th className="text-center py-1.5 font-semibold w-16">Attended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((ev, i) => (
                <tr key={ev?._id || i}>
                  <td className="py-2 pr-2 text-gray-800">
                    <span className="line-clamp-2">{ev?.title || "Untitled event"}</span>
                  </td>
                  <td className="py-2 text-center text-gray-800">
                    {Array.isArray(ev?.attended_users) ? ev.attended_users.length : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ParticipantTargetProgress
            className="mt-4 border-t border-gray-100 pt-3"
            actual={indicatorProgress.actualTotal}
            target={indicatorProgress.targetTotal}
            emptyMessage="No participant target found in the Performance Indicator / Target."
          />
        </div>
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
