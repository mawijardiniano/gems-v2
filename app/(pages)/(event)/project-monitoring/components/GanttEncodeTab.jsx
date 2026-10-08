"use client";

import { useState } from "react";
import { FaCheck, FaPen, FaTrash } from "react-icons/fa";
import { calcDurationDays } from "@/lib/gantt";

const INPUT =
  "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default";

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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
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
                className="px-2.5 py-5 text-center text-xs italic text-gray-400"
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
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="px-2.5 py-2 text-xs text-gray-500">{i + 1}</td>
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
                <td className="px-2.5 py-2 text-sm text-gray-700">
                  {invalid ? (
                    <span className="text-xs text-red-600">Invalid</span>
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
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
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
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove activity"
                        >
                          <FaTrash size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(i)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
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