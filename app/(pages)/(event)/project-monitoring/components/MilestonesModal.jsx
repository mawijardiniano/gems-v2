"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaExclamationTriangle,
  FaPaperclip,
  FaPlus,
  FaSpinner,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { useFileLifecycle } from "@/hooks/useFileLifecycle";
import {
  MAX_GANTT_ACTIVITIES,
  emptyActivity,
  generateMilestonesFromGantt,
  isMilestonesOutdated,
  mergeMilestones,
  toInputDate,
} from "@/lib/gantt";
import GanttEncodeTab from "./GanttEncodeTab";
import GanttUploadTab from "./GanttUploadTab";
import GanttTimeline from "./GanttTimeline";

const CARD = "rounded-xl border border-gray-200 bg-white p-4 min-w-0";
const CARD_TITLE =
  "mb-3 text-sm font-semibold text-gray-800";
const CARD_HEADER = "mb-3 flex flex-wrap items-center justify-between gap-2";
const CARD_TITLE_INLINE = "text-sm font-semibold text-gray-800";

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

const ACCEPTED_PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_PROOF_SIZE = 10 * 1024 * 1024;

const emptyRow = () => ({
  title: "",
  target_date: "",
  actual_date: "",
  status: "pending",
  proofs: [],
  source_activity: "",
});

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function MilestonesModal({
  project,
  userId,
  /* API base of the project module — defaults to the GAD project routes. */
  endpoint = "/api/project",
  /* inline: render in-page (no overlay/header/cancel) instead of as a modal. */
  inline = false,
  onClose,
  onSaved,
}) {
  const fileLifecycle = useFileLifecycle();

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
      proofs: (Array.isArray(m.proofs) ? m.proofs : []).filter(
        (file) => file && (file.url || file.key),
      ),
      source_activity: m.source_activity || "",
    }));
  });
  const [activities, setActivities] = useState(() =>
    (Array.isArray(project?.gantt_activities) ? project.gantt_activities : [])
      .filter((a) => a && a.activity)
      .map((a) => ({
        activity: a.activity,
        start_date: toInputDate(a.start_date),
        end_date: toInputDate(a.end_date),
        person_responsible: a.person_responsible || "",
      })),
  );

  const timelineYear = useMemo(() => {
    const source = project?.start_date || activities.find((a) => a.start_date)?.start_date;
    const date = source ? new Date(source) : null;
    if (date && !Number.isNaN(date.getTime())) return date.getFullYear();
    return Number(project?.year) || new Date().getFullYear();
  }, [project, activities]);

  const milestonesOutdated = useMemo(
    () => isMilestonesOutdated(activities, rows),
    [activities, rows],
  );

  /* Replaces the milestone list with ones generated from the Gantt chart.
     Proofs/status of milestones with the same title are kept. */
  const regenerateMilestones = () => {
    const generated = generateMilestonesFromGantt(activities);
    if (generated.length === 0) {
      setError(
        "Add at least one activity with a name, start date, and end date first.",
      );
      return;
    }
    setError("");
    const { milestones: next, removed } = mergeMilestones(
      generated,
      rows.filter((r) => r.title || r.target_date),
    );
    const lostProgress = removed.filter(
      (r) => r.status === "completed" || (r.proofs || []).length > 0,
    );
    if (
      lostProgress.length > 0 &&
      !window.confirm(
        `${lostProgress.length} milestone(s) with completed status or proofs no longer exist in the Gantt chart and will be removed:\n- ${lostProgress
          .map((r) => r.title)
          .join("\n- ")}\n\nContinue?`,
      )
    ) {
      return;
    }
    setRows(next);
    syncProofKeys(next);
  };
  const [editingActivity, setEditingActivity] = useState(null);

  /* Appends a blank activity and opens it for editing. */
  const addActivity = () => {
    if (activities.length >= MAX_GANTT_ACTIVITIES) return;
    setActivities([...activities, emptyActivity()]);
    setEditingActivity(activities.length);
  };
  const [uploadingRow, setUploadingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* Proofs already saved on the project are recorded so files dropped later in
     the session are only released once they are truly no longer referenced. */
  useEffect(() => {
    if (!project) return;
    const keys = (Array.isArray(project.milestones) ? project.milestones : [])
      .flatMap((m) => (Array.isArray(m?.proofs) ? m.proofs : []))
      .map((file) => file?.key)
      .filter(Boolean);
    fileLifecycle.startSession(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

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

  /** Keeps the file lifecycle in sync with every proof key currently attached. */
  const syncProofKeys = (nextRows) =>
    fileLifecycle.syncCurrent(
      nextRows
        .flatMap((row) => (Array.isArray(row.proofs) ? row.proofs : []))
        .map((file) => file?.key)
        .filter(Boolean),
    );

  const removeRow = (index) => {
    const nextRows = rows.filter((_, i) => i !== index);
    setRows(nextRows);
    syncProofKeys(nextRows);
  };

  const handleProofUpload = async (index, e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0) return;

    const invalid = fileList.filter(
      (file) =>
        !ACCEPTED_PROOF_TYPES.includes(file.type) || file.size > MAX_PROOF_SIZE,
    );
    if (invalid.length > 0) {
      setError("Proof files must be PDF, JPG, or PNG and under 10MB each.");
      return;
    }

    setUploadingRow(index);
    setError("");
    try {
      const uploaded = [];
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "milestone-proof");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.message || "Upload failed");
        }
        uploaded.push({ url: data.url, key: data.key, name: file.name });
      }

      const nextRows = rows.map((row, i) =>
        i === index
          ? { ...row, proofs: [...(row.proofs || []), ...uploaded] }
          : row,
      );
      setRows(nextRows);
      syncProofKeys(nextRows);
    } catch (err) {
      setError(err.message || "Failed to upload proof files");
    } finally {
      setUploadingRow(null);
    }
  };

  const removeProof = (index, file) => {
    const nextRows = rows.map((row, i) =>
      i === index
        ? {
            ...row,
            proofs: (row.proofs || []).filter((proof) => proof !== file),
          }
        : row,
    );
    setRows(nextRows);
    syncProofKeys(nextRows);

    /* Files uploaded in this session are deleted right away; files that were
       already saved are only released when the save is committed. */
    if (file?.key && !fileLifecycle.hasOriginal(file.key)) {
      fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: file.key }),
      }).catch(() => {});
    }
  };

  const closeAndCleanup = () => {
    fileLifecycle.rollback();
    fileLifecycle.resetSession();
    onClose();
  };

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
        proofs: Array.isArray(row.proofs) ? row.proofs : [],
        source_activity: row.source_activity || "",
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

    /* Completed milestones can never be saved without proof of completion. */
    const missingProof = cleaned.find(
      (row) => row.status === "completed" && row.proofs.length === 0,
    );
    if (missingProof) {
      setError(
        `"${missingProof.title}" is marked completed — upload at least one proof file (PDF, JPG, or PNG) before saving.`,
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${endpoint}/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          milestones: cleaned,
          gantt_activities: activities.filter((a) => a.activity.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save");
      }

      await fileLifecycle.commit();
      onSaved?.(
        Array.isArray(data.data?.milestones) ? data.data.milestones : cleaned,
        Array.isArray(data.data?.gantt_activities)
          ? data.data.gantt_activities
          : activities.filter((a) => a.activity.trim()),
      );
      if (!inline) onClose?.();
    } catch (err) {
      setError(err.message || "Failed to save milestones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={
        inline ? "" : "fixed inset-0 z-50 flex items-center justify-center p-4"
      }
    >
      {!inline && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={closeAndCleanup}
          aria-hidden="true"
        />
      )}
      <div
        className={
          inline
            ? "w-full bg-white"
            : "relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-fade-in"
        }
      >
        {/* Header */}
        {!inline && (
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Project Gantt Chart &amp; Milestones
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Encode or upload the Gantt chart; activities and timelines
              generate the milestones. Completed milestones require at least
              one proof file.
            </p>
          </div>
          <button
            type="button"
            onClick={closeAndCleanup}
            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>
        )}

        <div className={inline ? "space-y-4" : "p-5 space-y-4"}>
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

          {milestonesOutdated && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>
                The Gantt chart changed. Milestones are out of date.
              </span>
              <button
                type="button"
                onClick={regenerateMilestones}
                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-100"
              >
                Apply to Milestones
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <section className={CARD}>
            <div className={CARD_HEADER}>
              <h4 className={CARD_TITLE_INLINE}>Encode Gantt Chart</h4>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addActivity}
                  disabled={activities.length >= MAX_GANTT_ACTIVITIES}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPlus size={10} />
                  Add Activity
                </button>
                <button
                  type="button"
                  onClick={regenerateMilestones}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Generate Milestones
                </button>
              </div>
            </div>
            <GanttEncodeTab
              activities={activities}
              onChange={setActivities}
              editingIndex={editingActivity}
              onEditingChange={setEditingActivity}
            />
          </section>

          <section className={CARD}>
            <h4 className={CARD_TITLE}>Gantt Chart</h4>
            <GanttTimeline activities={activities} year={timelineYear} />
          </section>

          <section className={CARD}>
            <h4 className={CARD_TITLE}>Upload Gantt Chart</h4>
            <GanttUploadTab
              onApply={(parsed) => {
                setActivities(parsed);
              }}
            />
          </section>

          <section className={CARD}>
          <div className={CARD_HEADER}>
            <h4 className={CARD_TITLE_INLINE}>
              Generated Milestones ({rows.filter((r) => r.title).length})
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={regenerateMilestones}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= MAX_MILESTONES}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlus size={10} />
                Add Milestone
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500">
              Milestones are generated from the Gantt activities. You may edit
              them as needed.
            </p>
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
                    <th className="px-2.5 py-1.5 font-semibold">
                      Milestone / Activity
                    </th>
                    <th className="px-2.5 py-1.5 font-semibold w-40">
                      Source Activity
                    </th>
                    <th className="px-2.5 py-1.5 font-semibold w-36">
                      Target Date
                    </th>
                    <th className="px-2.5 py-1.5 font-semibold w-36">
                      Actual Date
                    </th>
                    <th className="px-2.5 py-1.5 font-semibold w-32">Status</th>
                    <th className="px-2.5 py-1.5 font-semibold w-48">Proof</th>
                    <th className="px-2.5 py-1.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-2.5 py-5 text-center text-xs text-gray-400 italic"
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
                        <td className="px-2.5 py-1.5">
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
                        <td className="px-2.5 py-2">
                          {row.source_activity ? (
                            <span
                              className="block max-w-40 truncate text-xs text-gray-600"
                              title={row.source_activity}
                            >
                              {row.source_activity}
                            </span>
                          ) : (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="date"
                            value={row.target_date}
                            onChange={(e) =>
                              updateRow(i, { target_date: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="date"
                            value={row.actual_date}
                            onChange={(e) =>
                              updateRow(i, { actual_date: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
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
                        <td className="px-2.5 py-1.5">
                          <div className="space-y-1.5">
                            {(row.proofs || []).length > 0 && (
                              <ul className="space-y-1">
                                {(row.proofs || []).map((file, fileIndex) => (
                                  <li
                                    key={file.key || file.url || fileIndex}
                                    className="flex items-center gap-1.5 text-[11px] text-gray-600"
                                  >
                                    <FaPaperclip
                                      size={9}
                                      className="shrink-0 text-gray-400"
                                    />
                                    <span
                                      className="max-w-[120px] truncate"
                                      title={file.name || file.key || ""}
                                    >
                                      {file.name || "Proof file"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeProof(i, file)}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
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
                                <label className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors">
                                  {uploadingRow === i ? (
                                    <FaSpinner
                                      size={10}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <FaPaperclip size={10} />
                                  )}
                                  {uploadingRow === i
                                    ? "Uploading…"
                                    : "Upload proof"}
                                  <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    disabled={uploadingRow !== null}
                                    onChange={(e) => handleProofUpload(i, e)}
                                  />
                                </label>
                                {(row.proofs || []).length === 0 && (
                                  <p className="text-[10px] font-medium text-amber-600">
                                    Proof required
                                  </p>
                                )}
                              </>
                            ) : (
                              (row.proofs || []).length === 0 && (
                                <span className="text-[11px] text-gray-300">
                                  —
                                </span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
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
          </div>
          </section>
          </div>
        </div>

        <div
          className={
            inline
              ? "mt-4 border-t border-gray-100 pt-3.5 flex items-center justify-end gap-3"
              : "sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3.5 flex items-center justify-end gap-3 rounded-b-2xl"
          }
        >
          {!inline && (
            <button
              type="button"
              onClick={closeAndCleanup}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
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