"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const STALE_MIGRATION_MS = 10 * 60 * 1000;

export default function BatchActionBar({
  batch,
  busyAction,
  selectedIds,
  validCount,
  approvedCount,
  needsReviewCount = 0,
  failedCount = 0,
  onValidate,
  onApprove,
  onReject,
  onMigrate,
}) {
  const [confirmingMigrate, setConfirmingMigrate] = useState(false);
  const busy = busyAction !== "";

  const finished = ["migrating", "completed"].includes(batch?.status);
  /* A background migration with no progress for 10 minutes has stopped
     (server restart); Validate puts the batch back to ready. Same limit as
     the validate route. */
  const progress = batch?.progress;
  const stalled =
    batch?.status === "migrating" &&
    Date.now() -
      new Date(progress?.updated_at || batch?.updatedAt || 0).getTime() >
      STALE_MIGRATION_MS;
  const canValidate = !busy && (!finished || stalled);
  const hasSelection = selectedIds.size > 0;
  const canReview = !busy && !finished && (hasSelection || validCount > 0);
  const canMigrate =
    !busy && approvedCount > 0 && batch?.status !== "migrating";

  const existingCount = batch?.totals?.existing ?? 0;
  const predictedUpdateCount = Math.min(existingCount, approvedCount);
  const predictedCreateCount = Math.max(approvedCount - existingCount, 0);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!canValidate}
          onClick={onValidate}
          className="rounded px-3 py-1.5"
        >
          {busyAction === "Validate Batch" ? "Validating..." : "Validate"}
        </Button>
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
        <Button
          variant="danger"
          disabled={!canReview}
          onClick={() => onReject(hasSelection ? [...selectedIds] : null)}
          className="rounded px-3 py-1.5"
        >
          {busyAction.startsWith("Reject")
            ? "Rejecting..."
            : hasSelection
              ? `Reject Selected (${selectedIds.size})`
              : "Reject All Valid"}
        </Button>
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
      {batch?.status === "migrating" && progress?.total > 0 && !stalled && (
        <p className="text-xs text-secondary-700" role="status">
          Migrating on the server: {progress.done ?? 0} of {progress.total}{" "}
          rows done. This updates every few seconds.
        </p>
      )}
      {stalled && (
        <p className="text-xs text-danger">
          This migration stopped making progress (the server may have
          restarted). Press Validate to put the batch back to ready, then
          migrate again; rows already imported are not imported twice.
        </p>
      )}
      {needsReviewCount > 0 && !finished && (
        <p className="text-xs text-warning">
          {needsReviewCount} row(s) matched an existing person on name +
          birthday only. &quot;Approve All Valid&quot; leaves them out — tick
          each one to approve it after checking it is the same person.
        </p>
      )}
      {failedCount > 0 && !finished && (
        <p className="text-xs text-danger">
          {failedCount} row(s) failed to import. Open a row to see why and
          press Edit to fix it, then press Validate to check it again,
          approve it and migrate.
        </p>
      )}

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
        <p className="text-sm text-fg-4">
          This will write{" "}
          <span className="font-semibold">{approvedCount}</span> approved
          record(s) into production (profiles, terms, and user accounts).
          Make sure you are connected to the intended database.
        </p>
        <p className="text-xs text-fg-muted mt-2">
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