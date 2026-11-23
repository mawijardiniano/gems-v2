"use client";

import { FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import { effectiveStatus, canTransition } from "@/data/lib/eventStatus";
import { useDialog } from "@/hooks/useDialog";
import CancelEventModal from "../CancelEventModal";
import Button from "@/components/ui/Button";

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
  canChangeStatus = false,
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
  const deleteDialogRef = useDialog(
    deleting ? null : () => setShowDeleteModal(false),
  );

  const isCancelled = effectiveStatus(event) === "cancelled";
  /* The matrix says which move is legal; the status API also requires the
     creator or an Admin, so others see neither button. */
  const canCancel =
    canChangeStatus && !isCancelled && canTransition(event.status, "cancelled");
  const canReinstate = canChangeStatus && canTransition(event.status, "active");

  return (
    <>
      {(canCancel || canReinstate) && (
        <div className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-subtle text-warning">
                <FiX size={18} />
              </div>
              <div>
                {/* Worded by the action offered: a completed event that can be
                    reinstated used to read "Cancel this event". */}
                <p className="font-semibold text-gray-900">
                  {canCancel ? "Cancel this event" : "Reinstate this event"}
                </p>
                <p className="text-sm text-gray-500">
                  {canCancel
                    ? "Cancelling stops check-in and hides the event from Discover. It can be reinstated later."
                    : isCancelled
                      ? "Reinstating puts the event back to active and reopens check-in."
                      : "Reinstating puts the event back to active."}
                </p>
                {event.cancel_reason && (
                  <p className="mt-1 text-xs text-gray-500">
                    Cancelled because: {event.cancel_reason}
                  </p>
                )}
              </div>
            </div>

            {canCancel ? (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-warning-border bg-warning-subtle px-4 py-2 text-xs font-semibold text-warning transition-colors hover:bg-amber-100 shrink-0"
                onClick={() => setShowCancelModal(true)}
              >
                <FiX size={13} />
                Cancel Event
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-success-border bg-success-subtle px-4 py-2 text-xs font-semibold text-success transition-colors hover:bg-emerald-100 shrink-0 disabled:opacity-50"
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-subtle text-danger">
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
            <Button
              variant="danger"
              className="!py-2 !px-4 !rounded-lg !text-xs shrink-0"
              onClick={() => setShowDeleteModal(true)}
            >
              <FiTrash2 size={13} />
              Delete Event
            </Button>
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
            ref={deleteDialogRef}
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
              <Button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                variant="ghost"
                className="touch-target !p-2"
                aria-label="Close"
              >
                <FiX />
              </Button>
            </div>
            <div className="modal-body">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-danger-subtle flex items-center justify-center shrink-0">
                  <FiTrash2 className="text-danger" size={20} />
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
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="secondary"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteEvent}
                disabled={deleting}
                variant="danger"
              >
                {deleting ? (
                  <>
                    <FaSpinner className="animate-spin" /> Deleting...
                  </>
                ) : (
                  "Yes, delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
