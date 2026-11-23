"use client";

import { gpbStatusOptions } from "@/data/lib/gpbStatus";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";

/* Extracted from the GPB year page (gpb/[year]/content.jsx). The page owns
   the state and handlers and passes them in. */
export default function UpdateStatusModal({
  handleUpdateStatus,
  openScannedViewer,
  reasonField,
  saving,
  selectedFile,
  selectedGPBStatus,
  setReasonField,
  setSelectedFile,
  setStatusType,
  setUpdateStatusModal,
  statusType,
}) {
  const dialogRef = useDialog(saving ? null : () => setUpdateStatusModal(false));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative"
        role="dialog"
        aria-modal="true"
        aria-label="Update GPB status"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-fg-2">
            Update GPB Status
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={() => setUpdateStatusModal(false)}
            className="touch-target text-fg-muted hover:text-fg-3 text-3xl"
          >
            ×
          </button>
        </div>

        {(selectedGPBStatus?.status ||
          selectedGPBStatus?.scanned_copy?.url) && (
          <div className="mb-4 rounded-lg bg-subtle border border-line-subtle p-3 text-sm">
            <p className="text-fg-4">
              Current status:{" "}
              <span className="font-semibold capitalize">
                {selectedGPBStatus?.status || "draft"}
              </span>
            </p>
            {selectedGPBStatus?.reason && (
              <p className="text-fg-muted text-xs mt-1">
                Reason: {selectedGPBStatus.reason}
              </p>
            )}
            {selectedGPBStatus?.scanned_copy?.url && (
              <button
                onClick={openScannedViewer}
                className="text-secondary-600 hover:underline text-xs mt-1 inline-block"
              >
                View current scanned copy
              </button>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-fg-3 mb-2">
            Status
          </label>

          <select
            className="w-full border border-line-strong rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            value={statusType}
            onChange={(e) => setStatusType(e.target.value)}
          >
            {/* An approved plan is final — Draft is not offered again. */}
            {gpbStatusOptions(selectedGPBStatus?.status).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-fg-3 mb-2">
            Reason
          </label>

          <textarea
            className="w-full border border-line-strong rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            rows={4}
            placeholder="Write the reason..."
            value={reasonField}
            onChange={(e) => setReasonField(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-fg-3 mb-2">
            Scanned Copy (Optional)
          </label>

          <input
            type="file"
            className="w-full border border-line-strong rounded-lg p-2"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          {selectedFile ? (
            <p className="mt-2 text-xs text-fg-muted">
              New file: {selectedFile.name} — the current scanned copy will
              be replaced.
            </p>
          ) : selectedGPBStatus?.scanned_copy?.url ? (
            <p className="mt-2 text-xs text-fg-muted">
              A scanned copy is already attached (see link above). Selecting
              a new file will replace it.
            </p>
          ) : (
            <p className="mt-2 text-xs text-fg-muted">
              No scanned copy attached yet.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setUpdateStatusModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant={statusType === "approved" ? "success" : "danger"}
            onClick={handleUpdateStatus}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Status"}
          </Button>
        </div>
      </div>
    </div>
  );
}
