"use client";

import { useMemo, useState } from "react";
import {
  FaExclamationTriangle,
  FaPlus,
  FaSpinner,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const MILESTONE_STATUSES = ["pending", "ongoing", "completed"];

const MILESTONE_STATUS_META = {
  pending: {
    label: "Pending",
    classes: "bg-gray-50 text-gray-700 border-gray-200",
  },
  ongoing: {
    label: "Ongoing",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const MAX_MILESTONES = 50;

const emptyRow = () => ({
  title: "",
  target_date: "",
  actual_date: "",
  status: "pending",
});

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function MilestonesModal({ project, userId, onClose, onSaved }) {
  const [rows, setRows] = useState(() => {
    const existing = Array.isArray(project?.milestones)
      ? project.milestones.filter((m) => m && String(m.title || "").trim())
      : [];

    if (existing.length === 0) return [emptyRow()];

    return existing.map((m) => ({
      title: m.title || "",
      target_date: toDateInputValue(m.target_date),
      actual_date: toDateInputValue(m.actual_date),
      status: MILESTONE_STATUSES.includes(m.status) ? m.status : "pending",
    }));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const cleaned = rows.filter(
      (row) => row.title || row.target_date || row.actual_date,
    );
    const total = cleaned.length;
    const done = cleaned.filter((row) => row.status === "completed").length;
    return {
      total,
      done,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [rows]);

  const addRow = () => {
    if (rows.length >= MAX_MILESTONES) {
      setError(`You can add up to ${MAX_MILESTONES} milestones.`);
      return;
    }
    setRows((prev) => [...prev, emptyRow()]);
  };

  const updateRow = (index, patch) =>
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const removeRow = (index) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  const saveMilestones = async () => {
    if (!project) return;

    const cleaned = rows
      .map((row) => ({
        title: String(row.title || "").trim(),
        target_date: row.target_date || null,
        actual_date: row.actual_date || null,
        status: MILESTONE_STATUSES.includes(row.status)
          ? row.status
          : "pending",
      }))
      .filter((row) => row.title || row.target_date || row.actual_date);

    if (cleaned.some((row) => !row.title)) {
      setError("Each milestone needs a title/activity.");
      return;
    }

    if (cleaned.length > MAX_MILESTONES) {
      setError(`You can add up to ${MAX_MILESTONES} milestones.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/project/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, milestones: cleaned }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save");
      }

      onSaved?.(
        Array.isArray(data.data?.milestones) ? data.data.milestones : cleaned,
      );
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save milestones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Update Milestones
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Track each milestone&apos;s target date, actual date, and status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {stats.total > 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Milestone Progress
                </p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {stats.done}/{stats.total} completed
                </p>
              </div>
              <div className="flex items-center gap-2 w-40">
                <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {stats.percent}%
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-medium text-gray-500">
                Milestones &amp; Activities
              </label>
              <span className="text-[11px] text-gray-400">
                {rows.length}/{MAX_MILESTONES}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">
                      Milestone / Activity
                    </th>
                    <th className="px-3 py-2 font-semibold w-36">
                      Target Date
                    </th>
                    <th className="px-3 py-2 font-semibold w-36">
                      Actual Date
                    </th>
                    <th className="px-3 py-2 font-semibold w-32">Status</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-xs text-gray-400 italic"
                      >
                        No milestones yet — click “Add Milestone” to start.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-gray-100 align-top"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.title}
                            placeholder="e.g. Conduct GAD orientation"
                            onChange={(e) =>
                              updateRow(i, { title: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={row.target_date}
                            onChange={(e) =>
                              updateRow(i, { target_date: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={row.actual_date}
                            onChange={(e) =>
                              updateRow(i, { actual_date: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.status}
                            onChange={(e) =>
                              updateRow(i, { status: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                          >
                            {MILESTONE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {MILESTONE_STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove milestone"
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= MAX_MILESTONES}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlus size={10} />
              Add Milestone
            </button>
          </div>

        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveMilestones}
            disabled={saving}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <FaSpinner className="animate-spin" size={12} />}
            {saving ? "Saving…" : "Save Milestones"}
          </button>
        </div>
      </div>
    </div>
  );
}