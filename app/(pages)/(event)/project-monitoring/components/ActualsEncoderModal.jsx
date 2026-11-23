"use client";

import { useEffect, useRef, useState } from "react";
import { useFileUploads } from "@/hooks/useFileUploads";
import { readJson } from "@/data/lib/uploadClient";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";
import { formatPeso } from "@/data/lib/money";
import { fileKeyOf } from "@/data/lib/eventFileKeys";
import {
  FaPaperclip,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaDownload,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";
import {
  generateAccomplishmentSummary,
  normalizeAccomplishmentLines,
  shouldUseAccomplishmentOverride,
} from "@/data/lib/accomplishmentSummary";

const getFieldValue = (field) => {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

const fmtPeso = (n) => formatPeso(n);

/**
 * Suggested accomplishment text built from the events linked to the project.
 * Kept as a named export for backwards compatibility — the logic itself lives in
 * `@/lib/accomplishmentSummary` so every surface derives the same string.
 */
export function generateSuggestedActual(project) {
  return generateAccomplishmentSummary(project);
}

const getEvidenceDownloadUrl = (file) => {
  const key = fileKeyOf(file);
  if (!key) return null;
  const nameParam = file?.name ? `&name=${encodeURIComponent(file.name)}` : "";
  return `/api/download?key=${encodeURIComponent(key)}${nameParam}`;
};

export default function ActualsEncoderModal({
  project,
  userId,
  /* API base of the project module — defaults to the GAD project routes. */
  endpoint = "/api/project",
  /* Field holding the planned budget + its display label. */
  budgetField = "gad_budget",
  budgetLabel = "GAD Budget (Planned)",
  onClose,
  onSaved,
}) {
  const fileLifecycle = useFileUploads();
  const evidenceUploading = fileLifecycle.isUploading;

  const [actual, setActual] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [suggested, setSuggested] = useState("");
  const [expenditures, setExpenditures] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* The latest evidence list, for uploads that finish after a render. */
  const evidenceRef = useRef(evidence);
  evidenceRef.current = evidence;
  const commitEvidence = (change) => {
    const next = change(evidenceRef.current);
    evidenceRef.current = next;
    setEvidence(next);
    fileLifecycle.syncCurrent(next.map((f) => f?.key));
  };

  const dialogRef = useDialog(saving ? null : () => closeAndCleanup());

  useEffect(() => {
    if (!project) return;
    const storedLines = normalizeAccomplishmentLines(
      project.actual_accomplishment,
    );
    const generated =
      generateAccomplishmentSummary(project) ||
      project.generated_accomplishment ||
      "";
    /* Legacy hand-written text on a project without linked events is kept as a
       manual override so saving the modal never wipes it. */
    const override = shouldUseAccomplishmentOverride(project, generated);

    setSuggested(generated);
    setIsOverride(override);
    setActual(
      override ? storedLines.join("\n") : generated || storedLines.join("\n"),
    );
    setExpenditures(project.actual_expenditures || "");
    const evidenceList = Array.isArray(project.expenditure_evidence)
      ? project.expenditure_evidence
      : [];
    setEvidence(evidenceList);
    fileLifecycle.startSession(evidenceList.map((f) => f?.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const plannedBudget = Number(getFieldValue(project?.[budgetField])) || 0;
  const spent = Number(expenditures) || 0;
  const variance = plannedBudget - spent;
  const utilization =
    plannedBudget > 0 ? Math.round((spent / plannedBudget) * 1000) / 10 : 0;

  const handleEvidenceUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0) return;
    setError("");
    try {
      const uploaded = await fileLifecycle.upload(fileList, {
        folder: "expenditure-evidence",
        label: "Evidence files",
      });
      /* Appended to the latest list, not the one captured when the upload
         started, so a file removed meanwhile does not come back. */
      /* null: the modal closed while it ran; the files were deleted. */
      if (!uploaded) return;
      commitEvidence((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err.message || "Failed to upload evidence files");
    }
  };

  const removeEvidenceFile = (file) => {
    if (!file?.key) {
      setEvidence((prev) => prev.filter((f) => f !== file));
      return;
    }
    commitEvidence((prev) => prev.filter((f) => f.key !== file.key));
    fileLifecycle.release(file);
  };

  const closeAndCleanup = () => {
    /* Closing mid-save would delete evidence the save is still linking. */
    if (saving) return;
    fileLifecycle.rollback();
    fileLifecycle.resetSession();
    onClose();
  };

  /** Drops the manual text and goes back to the value derived from linked events. */
  const resetToGenerated = () => {
    setActual(suggested);
    setIsOverride(false);
  };

  const saveActuals = async () => {
    if (!project) return;
    if (evidenceUploading) {
      setError("Please wait for the evidence upload to finish.");
      return;
    }
    if (!Number.isFinite(Number(expenditures || 0)) || spent < 0) {
      setError("Actual expenditures must be zero or a positive amount.");
      return;
    }
    if (spent > 0 && evidence.length === 0) {
      setError(
        "Actual expenditures require at least one evidence file (receipt, voucher, or financial report).",
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
          /* Only custom text is stored; auto mode clears the snapshot so the value
             keeps deriving live from the project's linked events. */
          actual_accomplishment: isOverride
            ? actual
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
            : [],
          actual_accomplishment_override: isOverride,
          actual_expenditures: spent,
          expenditure_evidence: evidence,
        }),
      });

      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save");
      }

      await fileLifecycle.commit();
      onSaved?.(project._id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save actuals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeAndCleanup}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="actuals-modal-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-line-subtle px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 id="actuals-modal-title" className="text-base font-bold text-fg">
            Update Actuals
          </h3>
          <button
            type="button"
            onClick={closeAndCleanup}
            className="touch-target h-8 w-8 rounded-lg text-fg-muted hover:bg-muted hover:text-fg-4 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger">
              <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Budget Utilization — planned vs actual, expenditure and evidence */}
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
            Budget Utilization
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-subtle border border-line-subtle px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
                {budgetLabel}
              </p>
              <p className="text-sm font-bold text-fg mt-0.5">
                {fmtPeso(plannedBudget)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary-50/60 border border-secondary-100 px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-secondary-400">
                Actual
              </p>
              <p className="text-sm font-bold text-secondary-900 mt-0.5">
                {fmtPeso(spent)}
              </p>
            </div>
            <div
              className={`rounded-lg border px-3 py-2.5 ${
                variance < 0
                  ? "bg-danger-subtle border-danger-border"
                  : "bg-success-subtle border-emerald-100"
              }`}
            >
              <p
                className={`text-2xs font-semibold uppercase tracking-wider ${
                  variance < 0 ? "text-red-400" : "text-emerald-500"
                }`}
              >
                Variance {variance < 0 ? "(Overspent)" : "(Under)"}
              </p>
              <p
                className={`text-sm font-bold mt-0.5 ${
                  variance < 0 ? "text-danger" : "text-success"
                }`}
              >
                {fmtPeso(variance)}
              </p>
            </div>
          </div>

          {plannedBudget > 0 && (
            <div>
              <div className="flex justify-between text-xs text-fg-muted mb-1">
                <span>Utilization</span>
                <span
                  className={`font-semibold ${
                    utilization > 100 ? "text-danger" : "text-success"
                  }`}
                >
                  {utilization}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    utilization > 100 ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Expenditures */}
          <div>
            <label className="text-xs font-medium text-fg-muted mb-1.5 block">
              Actual Expenditures (₱) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenditures}
              onChange={(e) => setExpenditures(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-fg-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              placeholder="0.00"
            />
            {spent > 0 && evidence.length === 0 && (
              <p className="text-xs text-secondary-600 mt-1 flex items-center gap-1">
                <FaExclamationTriangle size={10} />
                Expenditures require evidence before saving.
              </p>
            )}
          </div>

          {/* Evidence */}
          <div>
            <label className="text-xs font-medium text-fg-muted mb-1.5 block">
              Expenditure Evidence{" "}
              <span className="text-fg-muted">
                (PDF, JPG, PNG — up to 10MB each)
              </span>
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-2 text-xs font-medium text-fg-4 hover:bg-subtle hover:border-gray-400 cursor-pointer transition-colors">
              {evidenceUploading ? (
                <FaSpinner
                  className="animate-spin text-secondary-500"
                  size={12}
                />
              ) : (
                <FaPaperclip size={12} />
              )}
              {evidenceUploading ? "Uploading…" : "Attach files"}
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleEvidenceUpload}
                className="hidden"
                disabled={evidenceUploading}
              />
            </label>

            {evidence.length > 0 && (
              <ul className="mt-2.5 space-y-2">
                {evidence.map((file, i) => (
                  <li
                    key={file.key || i}
                    className="flex items-center gap-2 pointer-coarse:gap-5 rounded-lg border border-line-subtle bg-subtle/60 px-3 py-2"
                  >
                    <FaPaperclip size={11} className="text-fg-muted shrink-0" />
                    <span className="text-xs text-fg-3 truncate flex-1">
                      {file.name || file.key}
                    </span>
                    <a
                      href={getEvidenceDownloadUrl(file) || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="touch-target text-fg-muted hover:text-secondary-600 transition-colors"
                      title="Download"
                    >
                      <FaDownload size={11} />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeEvidenceFile(file)}
                      className="touch-target text-fg-muted hover:text-danger transition-colors"
                      title="Remove"
                    >
                      <FaTrash size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actual Accomplishment — auto-generated from linked events unless overridden */}
          <div className="rounded-xl border border-line-subtle bg-subtle/50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-fg-4">
                Actual Accomplishment{" "}
                <span className="text-fg-muted normal-case">
                  (
                  {isOverride
                    ? "custom text saved"
                    : "auto-generated from linked events"}
                  )
                </span>
              </label>
              {isOverride ? (
                <button
                  type="button"
                  onClick={resetToGenerated}
                  disabled={!suggested}
                  title={
                    suggested
                      ? "Replace the custom text with the auto-generated summary"
                      : "No linked events to generate from yet"
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-fg-4 transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaRedo size={9} />
                  Reset to auto-generated
                </button>
              ) : (
                <span className="inline-flex items-center rounded-full border border-success-border bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
                  Auto
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={actual}
              onChange={(e) => {
                setActual(e.target.value);
                /* Any edit becomes the project owner's custom version. */
                setIsOverride(true);
              }}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-fg-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              placeholder="Actual accomplishments for this project…"
            />
            {!isOverride && (
              <p className="text-xs text-fg-muted">
                Updates automatically whenever a linked event is added, edited
                or cancelled. Type in the box to keep a custom version instead.
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-line-subtle px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <Button
            variant="secondary"
            onClick={closeAndCleanup}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={saveActuals}
            disabled={saving || evidenceUploading}
            className="rounded-lg"
          >
            {saving && <FaSpinner className="animate-spin" size={12} />}
            {saving ? "Saving…" : "Save Actuals"}
          </Button>
        </div>
      </div>
    </div>
  );
}
