"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

/* Extracted from the GPB year page (gpb/[year]/content.jsx). The page owns
   the state and handlers and passes them in. */
export default function ConfirmDeleteModal({
  deleteError,
  deleteModal,
  deletingProject,
  handleDelete,
  setDeleteError,
  setDeleteModal,
}) {
  return (
    <Modal
      open
      onClose={() => setDeleteModal({ open: false, project: null })}
      busy={deletingProject}
      title="Delete Project"
      footer={
        <>
          <Button
            variant="secondary"
            disabled={deletingProject}
            onClick={() => {
              setDeleteError("");
              setDeleteModal({ open: false, project: null });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deletingProject}
            onClick={() => handleDelete(deleteModal.project._id)}
          >
            {deletingProject ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <p>Are you sure you want to delete this project?</p>
      <p className="mt-2 text-sm text-danger">
        This also permanently deletes the events linked to this project
        (including their posters and accomplishment reports) and the
        uploaded evidence files. This cannot be undone.
      </p>
      {deleteError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {deleteError}
        </p>
      )}
    </Modal>
  );
}
