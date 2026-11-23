"use client";

/**
 * Confirmation for cancelling an event.
 *
 * Cancelling is reversible — `lib/eventStatus.js` allows `cancelled → active` —
 * so the copy no longer claims the action is permanent, which the previous
 * version did while nothing could actually undo it.
 *
 * The reason is required: the status API rejects a cancellation without one
 * (`requiresCancelReason`), and a cancellation trail with no reason is weak
 * evidence on a GAD accomplishment report.
 */
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function CancelEventModal({
  isOpen,
  onClose,
  onConfirm,
  reason = "",
  onReasonChange,
  loading = false,
  error = "",
}) {
  if (!isOpen) return null;

  const canSubmit = reason.trim().length > 0 && !loading;

  return (
    <Modal
      open
      onClose={onClose}
      busy={loading}
      title="Cancel Event"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            No, keep it
          </Button>

          <Button variant="danger" onClick={onConfirm} disabled={!canSubmit}>
            {loading ? "Cancelling..." : "Yes, cancel"}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        <p>Are you sure you want to cancel this event?</p>
        <p className="mt-2 text-gray-500">
          Participants will no longer be able to check in, and the event drops
          out of Discover. You can reinstate it later if plans change.
        </p>

        <label
          htmlFor="cancel-reason"
          className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-500"
        >
          Reason for cancelling
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => onReasonChange?.(e.target.value)}
          rows={3}
          maxLength={500}
          disabled={loading}
          placeholder="e.g. Venue double-booked with the Regional Research Congress"
          className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 focus:border-red-400 focus:outline-none disabled:bg-gray-50"
        />
        <p className="mt-1 text-xs text-gray-500">
          {reason.trim().length === 0
            ? "A reason is required."
            : `${reason.trim().length}/500 characters`}
        </p>

        {error && <p className="text-danger mt-2">{error}</p>}
      </div>
    </Modal>
  );
}
