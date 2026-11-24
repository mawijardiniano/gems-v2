"use client";

import { useState } from "react";
import { FaCheck, FaPen, FaTrash } from "react-icons/fa";
import { calcDurationDays } from "@/data/lib/gantt";

const INPUT =
  "w-full rounded-lg border border-line px-2.5 py-1.5 text-sm text-fg-2 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-400 disabled:bg-subtle disabled:text-fg-muted disabled:cursor-default";

/** Activity table with auto-computed duration. One row is editable at a time. */
export default function GanttEncodeTab({
  activities,
  onChange,
  /* Index of the row being edited (controlled by the parent). */
  editingIndex = null,
  onEditingChange,
}) {
  const [localEditing, setLocalEditing] = useState(null);
  const editing = onEditingChange ? editingIndex : localEditing;
  const setEditing = onEditingChange || setLocalEditing;

  const update = (index, patch) =>
    onChange(activities.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left">
        <thead className="bg-subtle text-2xs uppercase tracking-wider text-fg-muted">
          <tr>
            <th className="px-2.5 py-1.5 w-8">#</th>
            <th className="px-2.5 py-1.5">Activity / Deliverable</th>
            <th className="px-2.5 py-1.5 w-36">Start Date</th>
            <th className="px-2.5 py-1.5 w-36">End Date</th>
            <th className="px-2.5 py-1.5 w-16">Days</th>
            <th className="px-2.5 py-1.5 w-40">Person Responsible</th>
            <th className="px-2.5 py-1.5 w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-2.5 py-5 text-center text-xs italic text-fg-muted"
              >
                No activities yet — click “Add Activity”.
              </td>
            </tr>
          )}
          {activities.map((row, i) => {
            const days = calcDurationDays(row.start_date, row.end_date);
            const invalid = row.start_date && row.end_date && days === 0;
            const isEditing = editing === i;
            return (
              <tr key={i} className="border-t border-line-subtle align-top">
                <td className="px-2.5 py-2 text-xs text-fg-muted">{i + 1}</td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    value={row.activity}
                    disabled={!isEditing}
                    placeholder="e.g. Develop Training Materials"
                    onChange={(e) => update(i, { activity: e.target.value })}
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={row.start_date}
                    disabled={!isEditing}
                    onChange={(e) => update(i, { start_date: e.target.value })}
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={row.end_date}
                    disabled={!isEditing}
                    onChange={(e) => update(i, { end_date: e.target.value })}
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-2 text-sm text-fg-3">
                  {invalid ? (
                    <span className="text-xs text-danger">Invalid</span>
                  ) : (
                    days || "—"
                  )}
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    value={row.person_responsible}
                    disabled={!isEditing}
                    placeholder="Office / person"
                    onChange={(e) =>
                      update(i, { person_responsible: e.target.value })
                    }
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="inline-flex items-center gap-1 rounded-md border border-success-border bg-success-subtle px-2 py-1 text-xs font-medium text-success hover:bg-emerald-100"
                        >
                          <FaCheck size={9} />
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(activities.filter((_, idx) => idx !== i));
                            setEditing(null);
                          }}
                          className="touch-target text-fg-muted hover:text-danger transition-colors"
                          title="Remove activity"
                        >
                          <FaTrash size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(i)}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-fg-4 hover:bg-subtle"
                      >
                        <FaPen size={9} />
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
