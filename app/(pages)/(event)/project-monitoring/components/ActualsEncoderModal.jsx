"use client";

import { useEffect, useState } from "react";
import { useFileLifecycle } from "@/hooks/useFileLifecycle";
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
} from "@/lib/accomplishmentSummary";

const ACCEPTED_EVIDENCE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

const getFieldValue = (field) => {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

const fmtPeso = (n) =>
  `₱ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Suggested accomplishment text built from the events linked to the project.
 * Kept as a named export for backwards compatibility — the logic itself lives in
 * `@/lib/accomplishmentSummary` so every surface derives the same string.
 */
export function generateSuggestedActual(project) {
  return generateAccomplishmentSummary(project);
}

const getEvidenceDownloadUrl = (file) => {
  const key = file?.key || (file?.url ? file.url.split(".com/")[1] : null);
  if (!key) return null;
  const nameParam = file?.name ? `&name=${encodeURIComponent(file.name)}` : "";
  return `/api/download?key=${encodeURIComponent(key)}${nameParam}`;
};

export default function ActualsEncoderModal({ project, userId, onClose, onSaved }) {
  const fileLifecycle = useFileLifecycle();

  const [actual, setActual] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [suggested, setSuggested] = useState("");
  const [expenditures, setExpenditures] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const plannedBudget = Number(getFieldValue(project?.gad_budget)) || 0;
  const spent = Number(expenditures) || 0;
  const variance = plannedBudget - spent;
  const utilization =
    plannedBudget > 0 ? Math.round((spent / plannedBudget) * 1000) / 10 : 0;

  const handleEvidenceUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0) return;

    const invalid = fileList.filter(
      (f) =>
        !ACCEPTED_EVIDENCE_TYPES.includes(f.type) || f.size > MAX_EVIDENCE_SIZE,
    );
    if (invalid.length > 0) {
      setError("Evidence files must be PDF, JPG, or PNG and under 10MB each.");
      return;
    }

    setEvidenceUploading(true);
    try {
      const uploaded = [];
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "expenditure-evidence");
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
      const next = [...evidence, ...uploaded];
      setEvidence(next);
      fileLifecycle.syncCurrent(next.map((f) => f?.key));
    } catch (err) {
      setError(err.message || "Failed to upload evidence files");
    } finally {
      setEvidenceUploading(false);
    }
  };

  const removeEvidenceFile = (file) => {
    if (!file?.key) {
      setEvidence((prev) => prev.filter((f) => f !== file));
      return;
    }
    const next = evidence.filter((f) => f.key !== file.key);
    setEvidence(next);
    fileLifecycle.syncCurrent(next.map((f) => f?.key));
    if (!fileLifecycle.hasOriginal(file.key)) {
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

  /** Drops the manual text and goes back to the value derived from linked events. */
  const resetToGenerated = () => {
    setActual(suggested);
    setIsOverride(false);
  };

  const saveActuals = async () => {
    if (!project) return;
    if (spent > 0 && evidence.length === 0) {
      setError(
        "Actual expenditures require at least one evidence file (receipt, voucher, or financial report).",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/project/${project._id}`, {
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

      const data = await res.json();
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
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-base font-bold text-gray-900">Update Actuals</h3>
          <button
            type="button"
            onClick={closeAndCleanup}
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

          {/* Budget Utilization — planned vs actual, expenditure and evidence */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Budget Utilization
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                GAD Budget (Planned)
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {fmtPeso(plannedBudget)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50/60 border border-blue-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Actual
              </p>
              <p className="text-sm font-bold text-blue-900 mt-0.5">
                {fmtPeso(spent)}
              </p>
            </div>
            <div
              className={`rounded-lg border px-3 py-2.5 ${
                variance < 0
                  ? "bg-red-50 border-red-200"
                  : "bg-emerald-50 border-emerald-100"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  variance < 0 ? "text-red-400" : "text-emerald-500"
                }`}
              >
                Variance {variance < 0 ? "(Overspent)" : "(Under)"}
              </p>
              <p
                className={`text-sm font-bold mt-0.5 ${
                  variance < 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {fmtPeso(variance)}
              </p>
            </div>
          </div>

          {plannedBudget > 0 && (
            <div>
              <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                <span>Utilization</span>
                <span
                  className={`font-semibold ${
                    utilization > 100 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {utilization}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
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
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Actual Expenditures (₱) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenditures}
              onChange={(e) => setExpenditures(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              placeholder="0.00"
            />
            {spent > 0 && evidence.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <FaExclamationTriangle size={10} />
                Expenditures require evidence before saving.
              </p>
            )}
          </div>

          {/* Evidence */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Expenditure Evidence{" "}
              <span className="text-gray-400">
                (PDF, JPG, PNG — up to 10MB each)
              </span>
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors">
              {evidenceUploading ? (
                <FaSpinner className="animate-spin text-blue-500" size={12} />
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
                    className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
                  >
                    <FaPaperclip size={11} className="text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {file.name || file.key}
                    </span>
                    <a
                      href={getEvidenceDownloadUrl(file) || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <FaDownload size={11} />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeEvidenceFile(file)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
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
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-600">
                Actual Accomplishment{" "}
                <span className="text-gray-400 normal-case">
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaRedo size={9} />
                  Reset to auto-generated
                </button>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              placeholder="Actual accomplishments for this project…"
            />
            {!isOverride && (
              <p className="text-[11px] text-gray-400">
                Updates automatically whenever a linked event is added, edited or
                cancelled. Type in the box to keep a custom version instead.
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={closeAndCleanup}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveActuals}
            disabled={saving || evidenceUploading}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <FaSpinner className="animate-spin" size={12} />}
            {saving ? "Saving…" : "Save Actuals"}
          </button>
        </div>
      </div>
    </div>
  );
}



