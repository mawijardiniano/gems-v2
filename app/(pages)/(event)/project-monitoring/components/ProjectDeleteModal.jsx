"use client";

import { useState } from "react";
import {
  FaExclamationTriangle,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";

/*
 * Confirmation dialog for deleting a module project. Mirrors the sidebar's
 * logout confirm modal so destructive actions look the same across the app.
 */

const getFieldValue = (field) => {
  if (field === null || field === undefined) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

export default function ProjectDeleteModal({
  project,
  apiBase,
  onClose,
  onDeleted,
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/${project._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to delete project");
      }

      onDeleted(project._id);
    } catch (err) {
      setError(err.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const title = getFieldValue(project?.title) || "(untitled project)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
          <FaTrash className="text-2xl text-red-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">
            Delete this project?
          </h2>
          <p className="text-sm text-gray-600 break-words">
            <span className="font-medium text-gray-900">{title}</span>
            {project?.reference_number && (
              <>
                <br />
                <span className="text-xs text-gray-400 font-mono">
                  {project.reference_number}
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-400">
            The project and its budget entries will be permanently removed.
            Linked events stay in the calendar. This cannot be undone.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 text-left">
            <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting && <FaSpinner className="animate-spin" size={12} />}
            {deleting ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
