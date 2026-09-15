"use client";

import { useState } from "react";

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
          className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm disabled:opacity-50"
        >
          {busyAction === "Validate Batch" ? "Validating..." : "Validate"}
        </button>
        <button
          type="button"
          disabled={!canReview}
          onClick={() => onApprove(hasSelection ? [...selectedIds] : null)}
          className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
        >
          {busyAction.startsWith("Approve")
            ? "Approving..."
            : hasSelection
              ? `Approve Selected (${selectedIds.size})`
              : "Approve All Valid"}
        </button>
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
        <button
          type="button"
          disabled={!canMigrate}
          onClick={() => setConfirmingMigrate(true)}
          className="px-3 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50"
        >
          {busyAction === "Migrate Approved"
            ? "Migrating..."
            : `Migrate Approved (${approvedCount})`}
        </button>
      </div>

      {confirmingMigrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmingMigrate(false)}
          />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-lg p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Confirm Migration
              </h3>
              <p className="text-sm text-gray-600 mt-1">
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
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingMigrate(false)}
                className="px-3 py-1.5 rounded border border-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingMigrate(false);
                  onMigrate();
                }}
                className="px-3 py-1.5 rounded bg-green-600 text-white text-sm"
              >
                Migrate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}