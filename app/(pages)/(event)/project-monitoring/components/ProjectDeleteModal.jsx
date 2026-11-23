"use client";

import { useState } from "react";
import { useDialog } from "@/hooks/useDialog";
import {
  FaExclamationTriangle,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
import Button from "@/components/ui/Button";

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

  const dialogRef = useDialog(deleting ? null : onClose);
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
        onClick={() => !deleting && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-delete-title"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-danger-subtle flex items-center justify-center">
          <FaTrash className="text-2xl text-danger" />
        </div>

        <div className="space-y-2">
          <h2 id="project-delete-title" className="text-xl font-bold text-fg">
            Delete this project?
          </h2>
          <p className="text-sm text-fg-4 break-words">
            <span className="font-medium text-fg">{title}</span>
            {project?.reference_number && (
              <>
                <br />
                <span className="text-xs text-fg-muted font-mono">
                  {project.reference_number}
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-fg-muted">
            The project and its budget entries will be permanently removed.
            Linked events stay in the calendar. This cannot be undone.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger text-left">
            <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            type="button"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <FaSpinner className="animate-spin" size={12} />}
            {deleting ? "Deleting…" : "Delete Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
