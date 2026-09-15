"use client";

import { useState } from "react";
import BatchTable from "./BatchTable";
import StagingRecordsTable from "./StagingRecordsTable";
import RecordDetailPanel from "./RecordDetailPanel";
import SyncLogsPanel from "./SyncLogsPanel";
import BatchActionBar from "./BatchActionBar";

/**
 * Shared staging/review workspace: batch table, delete confirmation, and the
 * selected-batch review area (actions, record filter, records table, and the
 * record details / sync logs panel). Used by both the HRMIS integration page
 * and the manual upload page.
 */
export default function StagingWorkspace({ d }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteTargetBatch, setDeleteTargetBatch] = useState(null);

  function toggleRow(id, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(selectableRecords, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        selectableRecords.forEach((r) => next.add(r._id));
      } else {
        selectableRecords.forEach((r) => next.delete(r._id));
      }
      return next;
    });
  }

  function confirmDeleteBatch() {
    if (!deleteTargetBatch?._id) return;
    const batchId = deleteTargetBatch._id;
    setDeleteTargetBatch(null);
    setSelectedIds(new Set());

    if (d.selectedBatchId === batchId) {
      d.setSelectedBatchId("");
    }
    d.runAction("Delete Batch", () => ({
      url: `/api/integration/batches/${batchId}`,
      options: {
        method: "DELETE",
        credentials: "include",
      },
    }));
  }

  const batch = d.selectedBatch;
  const validCount =
    batch?.totals?.valid ??
    d.records.filter((r) => r.status === "valid").length;
  const approvedCount = batch?.totals?.approved ?? 0;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <h2 className="text-base font-medium text-gray-900">
            Import Batches
          </h2>
          <button
            type="button"
            onClick={d.loadBatches}
            disabled={d.loadingBatches}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm"
          >
            {d.loadingBatches ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <BatchTable
          batches={d.batches}
          selectedBatchId={d.selectedBatchId}
          onSelect={(id) => {
            d.setSelectedBatchId(id);
            setSelectedIds(new Set());
            d.setSelectedRecordId(null);
          }}
          onDelete={setDeleteTargetBatch}
          loading={d.loadingBatches}
        />
      </div>
      {batch && (
        <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-gray-900">
                Selected Batch: {batch.source_name || batch._id}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Uploaded by:{" "}
                <span className="font-semibold">
                  {batch.created_by_username || "Unknown"}
                </span>
                {batch.createdAt && (
                  <> on {new Date(batch.createdAt).toLocaleString()}</>
                )}
              </p>
              {(batch.totals?.existing > 0 ||
                batch.totals?.identical > 0) && (
                <p className="text-xs mt-1">
                  {batch.totals?.existing > 0 && (
                    <span className="text-amber-600 font-medium">
                      {batch.totals.existing} already exist in production
                    </span>
                  )}
                  {batch.totals?.existing > 0 &&
                    batch.totals?.identical > 0 &&
                    " · "}
                  {batch.totals?.identical > 0 && (
                    <span className="text-gray-500 font-medium">
                      {batch.totals.identical} were identical (no changes made)
                    </span>
                  )}
                </p>
              )}
            </div>
            <BatchActionBar
              batch={batch}
              busyAction={d.busyAction}
              selectedIds={selectedIds}
              validCount={validCount}
              approvedCount={approvedCount}
              onValidate={() =>
                d.runAction("Validate Batch", () => ({
                  url: `/api/integration/batches/${batch._id}/validate`,
                  options: { method: "POST", credentials: "include" },
                }))
              }
              onApprove={(ids) =>
                d.runAction("Approve Records", () => ({
                  url: `/api/integration/batches/${batch._id}/approve`,
                  options: {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ids ? { record_ids: ids } : {}),
                  },
                }))
              }
              onReject={(ids) =>
                d.runAction("Reject Records", () => ({
                  url: `/api/integration/batches/${batch._id}/reject`,
                  options: {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ids ? { record_ids: ids } : {}),
                  },
                }))
              }
              onMigrate={() =>
                d.runAction("Migrate Approved", () => ({
                  url: `/api/integration/batches/${batch._id}/migrate`,
                  options: { method: "POST", credentials: "include" },
                }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="recordFilter" className="text-sm text-gray-700">
              Filter records:
            </label>
            <select
              id="recordFilter"
              value={d.recordsFilter}
              onChange={(e) => {
                d.setRecordsFilter(e.target.value);
                d.loadBatchDetails(batch._id, e.target.value);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="valid">valid</option>
              <option value="invalid">invalid</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="duplicate">duplicate</option>
              <option value="migrated">migrated</option>
              <option value="failed">failed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Staging Records
              </h3>
              <StagingRecordsTable
                records={d.records}
                loading={d.loadingDetails}
                selectedRecordId={d.selectedRecordId}
                onRowClick={(id) =>
                  d.setSelectedRecordId(d.selectedRecordId === id ? null : id)
                }
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {d.selectedRecord ? "Record Details" : "Sync Logs"}
              </h3>
              {d.selectedRecord ? (
                <div className="max-h-80 overflow-auto border border-gray-200 rounded p-2">
                  <RecordDetailPanel
                    record={d.selectedRecord}
                    allRecords={d.records}
                    onClose={() => d.setSelectedRecordId(null)}
                  />
                </div>
              ) : (
                <SyncLogsPanel
                  logs={d.logs}
                  loading={d.loadingDetails}
                  records={d.records}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {deleteTargetBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteTargetBatch(null)}
          />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-lg p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Confirm Delete Batch
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                This will permanently delete batch
                <span className="font-semibold">
                  {" "}
                  {deleteTargetBatch.source_name || deleteTargetBatch._id}
                </span>
                , including all staging records and logs.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetBatch(null)}
                className="px-3 py-1.5 rounded border border-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBatch}
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm"
              >
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}