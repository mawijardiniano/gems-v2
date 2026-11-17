"use client";

import { FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import { effectiveStatus, canTransition } from "@/data/lib/eventStatus";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import CancelEventModal from "../CancelEventModal";

/* Cancel / reinstate and delete, with their confirmation dialogs.

   The cancel/reinstate buttons are gated by the transition matrix, not by role
   or by a hardcoded status comparison, so they appear exactly when the API
   would accept the change.

   `canTransition(s, s)` is true by design (re-applying the current value is a
   harmless no-op), so asking the matrix "can this be cancelled?" answers true
   for an already-cancelled event as well. That made `canCancel` win for every
   status and left Reinstate unreachable. The stored phase decides *which*
   button to show; the matrix only decides whether that button is legal. */
export default function EventDangerZone({
  event,
  canDelete,
  showCancelModal,
  setShowCancelModal,
  cancelReason,
  setCancelReason,
  handleCancelEvent,
  handleReinstateEvent,
  cancelling,
  reinstating,
  cancelError,
  showDeleteModal,
  setShowDeleteModal,
  deleteError,
  deleting,
  handleDeleteEvent,
}) {
  useEscapeKey(showDeleteModal && !deleting, () => setShowDeleteModal(false));

  const isCancelled = effectiveStatus(event) === "cancelled";
  const canCancel = !isCancelled && canTransition(event.status, "cancelled");
  const canReinstate = canTransition(event.status, "active");

  return (
    <>
      {(canCancel || canReinstate) && (
        <div className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <FiX size={18} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {isCancelled ? "Reinstate this event" : "Cancel this event"}
                </p>
                <p className="text-sm text-gray-500">
                  {isCancelled
                    ? "Reinstating puts the event back to active and reopens check-in."
                    : "Cancelling stops check-in and hides the event from Discover. It can be reinstated later."}
                </p>
                {event.cancel_reason && (
                  <p className="mt-1 text-xs text-gray-400">
                    Cancelled because: {event.cancel_reason}
                  </p>
                )}
              </div>
            </div>

            {canCancel ? (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 shrink-0"
                onClick={() => setShowCancelModal(true)}
              >
                <FiX size={13} />
                Cancel Event
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 shrink-0 disabled:opacity-50"
                onClick={handleReinstateEvent}
                disabled={reinstating}
              >
                <FiCheck size={13} />
                {reinstating ? "Reinstating…" : "Reinstate"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mirrors the DELETE route: creator or Admin only. */}
      {canDelete && (
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <FiTrash2 size={18} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete this event</p>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. All event data will be
                  permanently removed.
                </p>
              </div>
            </div>
            <button
              className="btn-danger !py-2 !px-4 !rounded-lg !text-xs shrink-0"
              onClick={() => setShowDeleteModal(true)}
            >
              <FiTrash2 size={13} />
              Delete Event
            </button>
          </div>
        </div>
      )}

      <CancelEventModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelEvent}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        loading={cancelling}
        error={cancelError}
      />

      {showDeleteModal && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-event-title"
          >
            <div className="modal-header">
              <h2
                id="delete-event-title"
                className="text-lg font-bold text-gray-900"
              >
                Delete Event
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-ghost !p-2"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <FiTrash2 className="text-red-500" size={20} />
                </div>
                <div>
                  <p className="text-md font-medium text-gray-900">
                    Are you sure you want to delete this event?
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    This action cannot be undone. All event data will be
                    permanently removed.
                  </p>
                  {deleteError && (
                    <p className="alert-error mt-3 !p-2">{deleteError}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? (
                  <>
                    <FaSpinner className="animate-spin" /> Deleting...
                  </>
                ) : (
                  "Yes, delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
