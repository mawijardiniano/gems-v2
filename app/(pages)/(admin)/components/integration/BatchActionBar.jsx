"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function BatchActionBar({
  batch,
  busyAction,
  selectedIds,
  validCount,
  approvedCount,
  onValidate,
  onApprove,
  onReject,
  onMigrate,
}) {
  const [confirmingMigrate, setConfirmingMigrate] = useState(false);
  const busy = busyAction !== "";

  const finished = ["migrating", "completed"].includes(batch?.status);
  const canValidate = !busy && !finished;
  const hasSelection = selectedIds.size > 0;
  const canReview = !busy && !finished && (hasSelection || validCount > 0);
  const canMigrate = !busy && approvedCount > 0;

  const existingCount = batch?.totals?.existing ?? 0;
  const predictedUpdateCount = Math.min(existingCount, approvedCount);
  const predictedCreateCount = Math.max(approvedCount - existingCount, 0);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canValidate}
          onClick={onValidate}
          className="px-3 py-1.5 rounded bg-secondary-500 text-white text-sm disabled:opacity-50"
        >
          {busyAction === "Validate Batch" ? "Validating..." : "Validate"}
        </button>
        <Button
          disabled={!canReview}
          onClick={() => onApprove(hasSelection ? [...selectedIds] : null)}
          className="rounded px-3 py-1.5"
        >
          {busyAction.startsWith("Approve")
            ? "Approving..."
            : hasSelection
              ? `Approve Selected (${selectedIds.size})`
              : "Approve All Valid"}
        </Button>
        <button
          type="button"
          disabled={!canReview}
          onClick={() => onReject(hasSelection ? [...selectedIds] : null)}
          className="px-3 py-1.5 rounded bg-orange-500 text-white text-sm disabled:opacity-50"
        >
          {busyAction.startsWith("Reject")
            ? "Rejecting..."
            : hasSelection
              ? `Reject Selected (${selectedIds.size})`
              : "Reject All Valid"}
        </button>
        <Button
          variant="success"
          disabled={!canMigrate}
          onClick={() => setConfirmingMigrate(true)}
          className="rounded px-3 py-1.5"
        >
          {busyAction === "Migrate Approved"
            ? "Migrating..."
            : `Migrate Approved (${approvedCount})`}
        </Button>
      </div>

      <Modal
        open={confirmingMigrate}
        onClose={() => setConfirmingMigrate(false)}
        title="Confirm Migration"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingMigrate(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setConfirmingMigrate(false);
                onMigrate();
              }}
            >
              Migrate Now
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This will write{" "}
          <span className="font-semibold">{approvedCount}</span> approved
          record(s) into production (profiles, terms, and user accounts).
          Make sure you are connected to the intended database.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-semibold">{predictedCreateCount}</span>{" "}
          will create new persons ·{" "}
          <span className="font-semibold">{predictedUpdateCount}</span>{" "}
          will update existing persons (blank CSV cells keep current
          values)
        </p>
      </Modal>
    </>
  );
}