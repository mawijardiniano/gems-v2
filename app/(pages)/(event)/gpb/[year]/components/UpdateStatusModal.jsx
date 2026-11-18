"use client";

import { gpbStatusOptions } from "@/data/lib/gpbStatus";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative"
        role="dialog"
        aria-modal="true"
        aria-label="Update GPB status"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-800">
            Update GPB Status
          </h2>

          <button
            onClick={() => setUpdateStatusModal(false)}
            className="text-gray-500 hover:text-gray-700 text-3xl"
          >
            ×
          </button>
        </div>

        {(selectedGPBStatus?.status ||
          selectedGPBStatus?.scanned_copy?.url) && (
          <div className="mb-4 rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
            <p className="text-gray-600">
              Current status:{" "}
              <span className="font-semibold capitalize">
                {selectedGPBStatus?.status || "draft"}
              </span>
            </p>
            {selectedGPBStatus?.reason && (
              <p className="text-gray-500 text-xs mt-1">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-secondary-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason
          </label>

          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            rows={4}
            placeholder="Write the reason..."
            value={reasonField}
            onChange={(e) => setReasonField(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scanned Copy (Optional)
          </label>

          <input
            type="file"
            className="w-full border border-gray-300 rounded-lg p-2"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          {selectedFile ? (
            <p className="mt-2 text-xs text-gray-500">
              New file: {selectedFile.name} — the current scanned copy will
              be replaced.
            </p>
          ) : selectedGPBStatus?.scanned_copy?.url ? (
            <p className="mt-2 text-xs text-gray-500">
              A scanned copy is already attached (see link above). Selecting
              a new file will replace it.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              No scanned copy attached yet.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setUpdateStatusModal(false)}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleUpdateStatus}
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-white transition ${
              saving
                ? "bg-gray-400 cursor-not-allowed"
                : statusType === "approved"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {saving ? "Saving..." : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
