"use client";

import {
  FaCheck,
  FaPaperclip,
  FaPen,
  FaSpinner,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { calcDurationDays } from "@/data/lib/gantt";

const INPUT =
  "w-full rounded-lg border border-line px-2.5 py-1.5 text-sm text-fg-2 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-400 disabled:bg-subtle disabled:text-fg-muted disabled:cursor-default";

export const MILESTONE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

/**
 * One table for the Gantt chart and its milestones: each activity is a
 * milestone whose target date is the activity's end date. The plan cells
 * (activity, dates, person) unlock one row at a time through Edit; progress
 * cells (actual date, status, proof) are always editable.
 */
export default function GanttEncodeTab({
  rows,
  /* Index of the row whose plan cells are being edited. */
  editingIndex = null,
  onEditingChange,
  onUpdate,
  onRemove,
  onUploadProof,
  onRemoveProof,
  isUploading = () => false,
  uploadBusy = false,
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[1100px] text-left">
        <thead className="bg-subtle text-2xs uppercase tracking-wider text-fg-muted">
          <tr>
            <th className="px-2.5 py-1.5 w-8">#</th>
            <th className="px-2.5 py-1.5">Activity / Deliverable</th>
            <th className="px-2.5 py-1.5 w-36">Start Date</th>
            <th className="px-2.5 py-1.5 w-36">End / Target Date</th>
            <th className="px-2.5 py-1.5 w-14">Days</th>
            <th className="px-2.5 py-1.5 w-36">Person Responsible</th>
            <th className="px-2.5 py-1.5 w-36">Actual Date</th>
            <th className="px-2.5 py-1.5 w-32">Status</th>
            <th className="px-2.5 py-1.5 w-44">Proof</th>
            <th className="px-2.5 py-1.5 w-24 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={10}
                className="px-2.5 py-5 text-center text-xs italic text-fg-muted"
              >
                No activities yet — click “Add Activity”.
              </td>
            </tr>
          )}
          {rows.map((row, i) => {
            const days = calcDurationDays(row.start_date, row.end_date);
            const invalid = row.start_date && row.end_date && days === 0;
            const isEditing = editingIndex === i;
            const proofs = row.proofs || [];
            return (
              <tr
                key={row._rid || i}
                className="border-t border-line-subtle align-top"
              >
                <td className="px-2.5 py-2 text-xs text-fg-muted">{i + 1}</td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    value={row.activity}
                    disabled={!isEditing}
                    placeholder="e.g. Develop Training Materials"
                    onChange={(e) => onUpdate(i, { activity: e.target.value })}
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={row.start_date}
                    disabled={!isEditing}
                    onChange={(e) =>
                      onUpdate(i, { start_date: e.target.value })
                    }
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={row.end_date}
                    disabled={!isEditing}
                    onChange={(e) => onUpdate(i, { end_date: e.target.value })}
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
                      onUpdate(i, { person_responsible: e.target.value })
                    }
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={row.actual_date}
                    onChange={(e) =>
                      onUpdate(i, { actual_date: e.target.value })
                    }
                    className={INPUT}
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <select
                    value={row.status}
                    onChange={(e) => onUpdate(i, { status: e.target.value })}
                    className={INPUT}
                  >
                    {MILESTONE_STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2.5 py-1.5">
                  <div className="space-y-1.5">
                    {proofs.length > 0 && (
                      <ul className="space-y-1">
                        {proofs.map((file, fileIndex) => (
                          <li
                            key={file.key || file.url || fileIndex}
                            className="flex items-center gap-1.5 text-xs text-fg-4"
                          >
                            <FaPaperclip
                              size={9}
                              className="shrink-0 text-fg-muted"
                            />
                            <span
                              className="max-w-[120px] truncate"
                              title={file.name || file.key || ""}
                            >
                              {file.name || "Proof file"}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveProof(i, file)}
                              className="touch-target text-fg-muted hover:text-danger transition-colors"
                              title="Remove proof"
                            >
                              <FaTimes size={9} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.status === "completed" ? (
                      <>
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2.5 py-1 text-xs font-medium text-fg-4 hover:bg-subtle hover:border-gray-400 cursor-pointer transition-colors">
                          {isUploading(i) ? (
                            <FaSpinner size={10} className="animate-spin" />
                          ) : (
                            <FaPaperclip size={10} />
                          )}
                          {isUploading(i) ? "Uploading…" : "Upload proof"}
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            disabled={uploadBusy}
                            onChange={(e) => onUploadProof(i, e)}
                          />
                        </label>
                        {proofs.length === 0 && (
                          <p className="text-xs font-medium text-secondary-600">
                            Proof required
                          </p>
                        )}
                      </>
                    ) : (
                      proofs.length === 0 && (
                        <span className="text-xs text-fg-muted">—</span>
                      )
                    )}
                  </div>
                </td>
                <td className="px-2.5 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => onEditingChange(null)}
                        className="inline-flex items-center gap-1 rounded-md border border-success-border bg-success-subtle px-2 py-1 text-xs font-medium text-success hover:bg-emerald-100"
                      >
                        <FaCheck size={9} />
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEditingChange(i)}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-fg-4 hover:bg-subtle"
                      >
                        <FaPen size={9} />
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="touch-target text-fg-muted hover:text-danger transition-colors"
                      title="Remove activity"
                    >
                      <FaTrash size={12} />
                    </button>
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
