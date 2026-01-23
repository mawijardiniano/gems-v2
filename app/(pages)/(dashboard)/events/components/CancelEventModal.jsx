"use client";

export default function CancelEventModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = "",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-red-600">Cancel Event</h2>
        </div>

        <div className="px-6 py-4 text-sm text-gray-700">
          <p>Are you sure you want to cancel this event?</p>
          <p className="mt-2 text-gray-500">
            This action cannot be undone and participants will no longer be able
            to join.
          </p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>

        <div className="px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
            disabled={loading}
          >
            No, keep it
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm disabled:bg-gray-400"
          >
            {loading ? "Cancelling..." : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
