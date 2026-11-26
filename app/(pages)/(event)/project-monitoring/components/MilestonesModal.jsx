"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  FaExclamationTriangle,
  FaPlus,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import { useFileUploads } from "@/hooks/useFileUploads";
import { readJson } from "@/data/lib/uploadClient";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/useConfirm";
import { MAX_GANTT_ACTIVITIES, buildUnifiedRows } from "@/data/lib/gantt";
import GanttEncodeTab from "./GanttEncodeTab";
import GanttUploadTab from "./GanttUploadTab";
import GanttTimeline from "./GanttTimeline";
import PrintGantt from "./PrintGantt";

const CARD = "rounded-xl border border-line bg-white p-4 min-w-0";
const CARD_TITLE = "mb-3 text-sm font-semibold text-fg-2";
const CARD_HEADER = "mb-3 flex flex-wrap items-center justify-between gap-2";
const CARD_TITLE_INLINE = "text-sm font-semibold text-fg-2";

const MILESTONE_STATUSES = ["pending", "ongoing", "completed"];

/* Rows carry a client-only id: an upload resolves seconds later, by which time
   rows may have been added or removed, so it must find its row by id rather
   than by index. Stripped before saving. */
let rowSeq = 0;
const nextRowId = () => `row-${(rowSeq += 1)}`;
const withRowIds = (list) =>
  list.map((row) => (row._rid ? row : { ...row, _rid: nextRowId() }));

/* One row is both a Gantt activity and its milestone. */
const emptyRow = () => ({
  _rid: nextRowId(),
  activity: "",
  start_date: "",
  end_date: "",
  person_responsible: "",
  actual_date: "",
  status: "pending",
  proofs: [],
});

/* Rows as saved milestones — the shape buildUnifiedRows reads back. */
const rowsAsMilestones = (list) =>
  list.map((row) => ({
    title: row.activity,
    target_date: row.end_date,
    actual_date: row.actual_date,
    status: row.status,
    proofs: row.proofs,
    source_activity: row.activity,
  }));

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
  const { confirm, confirmDialog } = useConfirm();
  const fileLifecycle = useFileUploads();
  /* Index of the row whose proofs are uploading, or null. */
  /* A row whose proofs are uploading, or null; isUploadingTarget(i) per row. */
  const uploadingRow = fileLifecycle.uploading;

  /* One row per activity, carrying its milestone progress. Older projects
     saved generated milestones ("Project Start-Up", "<Activity> Completed");
     their progress is matched onto the activity rows. */
  const [rows, setRows] = useState(() =>
    withRowIds(
      buildUnifiedRows(project?.gantt_activities, project?.milestones),
    ),
  );

  /* The Gantt chart view and print read plain activities. */
  const activities = useMemo(
    () =>
      rows
        .filter((row) => row.activity.trim())
        .map((row) => ({
          activity: row.activity,
          start_date: row.start_date,
          end_date: row.end_date,
          person_responsible: row.person_responsible,
        })),
    [rows],
  );

  const timelineYear = useMemo(() => {
    const source =
      project?.start_date || activities.find((a) => a.start_date)?.start_date;
    const date = source ? new Date(source) : null;
    if (date && !Number.isNaN(date.getTime())) return date.getFullYear();
    return Number(project?.year) || new Date().getFullYear();
  }, [project, activities]);

  const [editingActivity, setEditingActivity] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* The latest rows, for work that finishes after a render (uploads). */
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  /* Applies `change` to the latest rows and keeps the file lifecycle in step,
     so an upload finishing late never overwrites edits made meanwhile. */
  const commitRows = (change) => {
    const next = change(rowsRef.current);
    rowsRef.current = next;
    setRows(next);
    syncProofKeys(next);
    return next;
  };

  /* Inline editors are unmounted by switching tab, collapsing the card or
     paging away — none of which went through Cancel, so proofs uploaded but
     never saved stayed in storage. After a save, commit() has made them
     "original", so nothing saved is deleted here. */
  useEffect(
    () => () => {
      fileLifecycle.rollback();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
    const cleaned = rows.filter((row) => row.activity.trim());
    const total = cleaned.length;
    const done = cleaned.filter((row) => row.status === "completed").length;
    return {
      total,
      done,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [rows]);

  /* Appends a blank activity and opens it for editing. */
  const addRow = () => {
    if (rows.length >= MAX_GANTT_ACTIVITIES) {
      setError(`You can add up to ${MAX_GANTT_ACTIVITIES} activities.`);
      return;
    }
    setEditingActivity(rows.length);
    setRows((prev) => [...prev, emptyRow()]);
  };

  /* An uploaded Gantt replaces the plan; progress follows each activity by
     name, and rows with progress that are no longer in the file are kept. */
  const applyUploadedGantt = (parsed) => {
    setEditingActivity(null);
    commitRows((prev) =>
      withRowIds(
        buildUnifiedRows(
          parsed,
          rowsAsMilestones(prev.filter((row) => row.activity.trim())),
        ),
      ),
    );
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

  const removeRow = async (index) => {
    const row = rowsRef.current[index];
    if (!row) return;
    const hasProgress =
      row.status === "completed" || (row.proofs || []).length > 0;
    if (
      hasProgress &&
      !(await confirm({
        title: "Remove activity?",
        message: `"${row.activity || "This activity"}" has a completed status or proof files. Removing it also removes its milestone progress.`,
        confirmLabel: "Remove",
        tone: "danger",
      }))
    ) {
      return;
    }
    const rid = row._rid;
    setEditingActivity(null);
    commitRows((prev) => prev.filter((r) => r._rid !== rid));
  };

  const handleProofUpload = async (index, e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0) return;

    const rowId = rowsRef.current[index]?._rid;
    setError("");
    try {
      const uploaded = await fileLifecycle.upload(fileList, {
        folder: "milestone-proof",
        label: "Proof files",
        target: index,
      });

      /* Built on the latest rows and matched by id: edits made while the
         upload ran survive, and a removed row does not receive the files. */
      /* null: the editor closed while it ran; the files were deleted. */
      if (!uploaded) return;

      let attached = false;
      commitRows((prev) =>
        prev.map((row) => {
          if (row._rid !== rowId) return row;
          attached = true;
          return { ...row, proofs: [...(row.proofs || []), ...uploaded] };
        }),
      );
      if (!attached) await fileLifecycle.discard(uploaded);
    } catch (err) {
      setError(err.message || "Failed to upload proof files");
    }
  };

  const removeProof = (index, file) => {
    commitRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              proofs: (row.proofs || []).filter((proof) => proof !== file),
            }
          : row,
      ),
    );
    /* Files uploaded in this session are deleted right away; files that were
       already saved are only released when the save is committed. */
    fileLifecycle.release(file);
  };

  const dialogRef = useDialog(saving ? null : () => closeAndCleanup());
  const titleId = useId();

  const closeAndCleanup = () => {
    /* Closing mid-save would delete files the save is still linking. */
    if (saving) return;
    fileLifecycle.rollback();
    fileLifecycle.resetSession();
    onClose();
  };

  const saveMilestones = async () => {
    if (!project) return;
    if (uploadingRow !== null) {
      setError("Please wait for the proof upload to finish.");
      return;
    }

    /* Untouched blank rows are skipped; a row with dates or progress but no
       name is an error. */
    const filled = rows.filter(
      (row) =>
        row.activity.trim() ||
        row.start_date ||
        row.end_date ||
        row.actual_date ||
        (row.proofs || []).length > 0,
    );

    if (filled.some((row) => !row.activity.trim())) {
      setError("Each activity needs a name.");
      return;
    }

    if (filled.length > MAX_GANTT_ACTIVITIES) {
      setError(`You can add up to ${MAX_GANTT_ACTIVITIES} activities.`);
      return;
    }

    const ganttActivities = filled.map((row) => ({
      activity: row.activity.trim(),
      start_date: row.start_date,
      end_date: row.end_date,
      person_responsible: row.person_responsible.trim(),
    }));

    /* Each activity is its own milestone; the end date is the target. */
    const cleaned = filled.map((row) => ({
      title: row.activity.trim(),
      target_date: row.end_date || null,
      actual_date: row.actual_date || null,
      status: MILESTONE_STATUSES.includes(row.status) ? row.status : "pending",
      proofs: Array.isArray(row.proofs) ? row.proofs : [],
      source_activity: row.activity.trim(),
    }));

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
          gantt_activities: ganttActivities,
        }),
      });

      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save");
      }

      await fileLifecycle.commit();
      onSaved?.(
        Array.isArray(data.data?.milestones) ? data.data.milestones : cleaned,
        Array.isArray(data.data?.gantt_activities)
          ? data.data.gantt_activities
          : ganttActivities,
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
        ref={inline ? undefined : dialogRef}
        role={inline ? undefined : "dialog"}
        aria-modal={inline ? undefined : "true"}
        aria-labelledby={inline ? undefined : titleId}
        className={
          inline
            ? "w-full bg-white"
            : "relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-fade-in"
        }
      >
        {/* Header */}
        {!inline && (
          <div className="sticky top-0 bg-white border-b border-line-subtle px-5 py-3.5 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h3 id={titleId} className="text-base font-bold text-fg">
                Project Gantt Chart &amp; Milestones
              </h3>
              <p className="text-xs text-fg-muted mt-0.5">
                Encode or upload the Gantt chart. Each activity is a milestone;
                its end date is the target date. Completed activities require at
                least one proof file.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PrintGantt
                project={{ ...project, gantt_activities: activities }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-fg-4 hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={closeAndCleanup}
                className="touch-target h-8 w-8 rounded-lg text-fg-muted hover:bg-muted hover:text-fg-4 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>
        )}

        <div className={inline ? "space-y-4" : "p-5 space-y-4"}>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger">
              <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {stats.total > 0 && (
            <div className="rounded-lg border border-line-subtle bg-subtle px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
                  Milestone Progress
                </p>
                <p className="text-sm font-bold text-fg mt-0.5">
                  {stats.done}/{stats.total} completed
                </p>
              </div>
              <div className="flex items-center gap-2 w-40">
                <div className="h-2 flex-1 rounded-full bg-emphasis overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-fg-4">
                  {stats.percent}%
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <section className={`${CARD} xl:col-span-2`}>
              <div className={CARD_HEADER}>
                <h4 className={CARD_TITLE_INLINE}>
                  Gantt Chart &amp; Milestones ({stats.total})
                </h4>
                <button
                  type="button"
                  onClick={addRow}
                  disabled={rows.length >= MAX_GANTT_ACTIVITIES}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-1.5 text-xs font-medium text-fg-4 hover:bg-subtle hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPlus size={10} />
                  Add Activity
                </button>
              </div>
              <p className="mb-2 text-xs text-fg-muted">
                Each activity is a milestone; its end date is the target date.
                Use Edit to change the plan. Status, actual date and proof can
                be updated anytime.
              </p>
              <GanttEncodeTab
                rows={rows}
                editingIndex={editingActivity}
                onEditingChange={setEditingActivity}
                onUpdate={updateRow}
                onRemove={removeRow}
                onUploadProof={handleProofUpload}
                onRemoveProof={removeProof}
                isUploading={(i) => fileLifecycle.isUploadingTarget(i)}
                uploadBusy={uploadingRow !== null}
              />
            </section>

            <section className={CARD}>
              <div className={CARD_HEADER}>
                <h4 className={CARD_TITLE_INLINE}>Gantt Chart</h4>
                <PrintGantt
                  project={{ ...project, gantt_activities: activities }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-fg-4 hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <GanttTimeline activities={activities} year={timelineYear} />
            </section>

            <section className={CARD}>
              <h4 className={CARD_TITLE}>Upload Gantt Chart</h4>
              <GanttUploadTab onApply={applyUploadedGantt} />
            </section>
          </div>
        </div>

        <div
          className={
            inline
              ? "mt-4 border-t border-line-subtle pt-3.5 flex items-center justify-end gap-3"
              : "sticky bottom-0 bg-white border-t border-line-subtle px-5 py-3.5 flex items-center justify-end gap-3 rounded-b-2xl"
          }
        >
          {!inline && (
            <Button
              variant="secondary"
              onClick={closeAndCleanup}
              disabled={saving}
              className="rounded-lg"
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={saveMilestones}
            disabled={saving || uploadingRow !== null}
            className="rounded-lg"
          >
            {saving && <FaSpinner className="animate-spin" size={12} />}
            {saving ? "Saving…" : "Save Milestones"}
          </Button>
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
