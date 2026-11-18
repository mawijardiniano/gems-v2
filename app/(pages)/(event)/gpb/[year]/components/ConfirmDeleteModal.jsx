"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative"
        role="dialog"
        aria-modal="true"
        aria-label="Delete project"
      >
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-4xl"
          onClick={() => setDeleteModal({ open: false, project: null })}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4">Delete Project</h3>
        <p>Are you sure you want to delete this project?</p>
        <p className="mt-2 text-sm text-red-600">
          This also permanently deletes the events linked to this project
          (including their posters and accomplishment reports) and the
          uploaded evidence files. This cannot be undone.
        </p>
        {deleteError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {deleteError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={deletingProject}
            onClick={() => {
              setDeleteError("");
              setDeleteModal({ open: false, project: null });
            }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={deletingProject}
            onClick={() => handleDelete(deleteModal.project._id)}
          >
            {deletingProject ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
