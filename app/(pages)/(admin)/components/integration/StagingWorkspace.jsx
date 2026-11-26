"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import BatchTable from "./BatchTable";
import StagingRecordsTable from "./StagingRecordsTable";
import RecordDetailPanel from "./RecordDetailPanel";
import SyncLogsPanel from "./SyncLogsPanel";
import BatchActionBar from "./BatchActionBar";
import { canEditRecord } from "./recordEdit";
import { fieldLabel } from "@/app/api/integration/_utils/fieldLabels";

/* Problems that concern the whole file rather than one row: columns that
   are missing or unused, and validation errors shared by many rows. */
function BatchFileNotes({ batch }) {
  const report = batch.header_report || {};
  const problems = report.problems || [];
  const unused = report.unrecognized || [];
  const summary = (batch.error_summary || []).filter((e) => e.count > 1);
  if (!problems.length && !unused.length && !summary.length) return null;

  return (
    <div className="space-y-2 text-xs">
      {problems.length > 0 && (
        <div className="bg-danger-subtle border border-danger-border rounded p-2 text-danger">
          <div className="font-semibold mb-1">Problems with the file:</div>
          {problems.map((p) => (
            <div key={p}>• {p}</div>
          ))}
          {report.columns?.length > 0 && (
            <div className="mt-1 text-fg-3">
              Columns in the file: {report.columns.join(", ")}
            </div>
          )}
        </div>
      )}
      {summary.length > 0 && (
        <div className="bg-warning-subtle border border-warning-border rounded p-2 text-warning">
          <div className="font-semibold mb-1">Most common problems:</div>
          {summary.map((e) => (
            <div key={`${e.field}|${e.code}`}>
              • {e.count} row(s) — {fieldLabel(e.field)}: {e.message}
            </div>
          ))}
        </div>
      )}
      {unused.length > 0 && (
        <p className="text-fg-muted">
          Columns not used: {unused.join(", ")}.
        </p>
      )}
    </div>
  );
}

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
  /* Valid rows matched only on name + birthday: "Approve All" skips them. */
  const needsReviewCount = d.records.filter(
    (r) =>
      r.status === "valid" &&
      (r.validation_errors || []).some(
        (e) => e.code === "matched_by_name_birthday",
      ),
  ).length;
  /* Rows whose migration failed: Validate re-checks them for a retry. */
  const failedCount = d.records.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-line rounded-md p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <h2 className="text-base font-medium text-fg">
            Import Batches
          </h2>
          <button
            type="button"
            onClick={d.loadBatches}
            disabled={d.loadingBatches}
            className="px-3 py-1.5 rounded border border-line-strong text-sm"
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
        <div className="bg-white border border-line rounded-md p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-fg">
                Selected Batch: {batch.source_name || batch._id}
              </h2>
              <p className="text-xs text-fg-muted mt-1">
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
                    <span className="text-secondary-600 font-medium">
                      {batch.totals.existing} already exist in production
                    </span>
                  )}
                  {batch.totals?.existing > 0 &&
                    batch.totals?.identical > 0 &&
                    " · "}
                  {batch.totals?.identical > 0 && (
                    <span className="text-fg-muted font-medium">
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
              needsReviewCount={needsReviewCount}
              failedCount={failedCount}
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
          <BatchFileNotes batch={batch} />
          <div className="flex items-center gap-2">
            <label htmlFor="recordFilter" className="text-sm text-fg-3">
              Filter records:
            </label>
            <select
              id="recordFilter"
              value={d.recordsFilter}
              onChange={(e) => {
                d.setRecordsFilter(e.target.value);
                d.loadBatchDetails(batch._id, e.target.value);
              }}
              className="border border-line-strong rounded px-2 py-1 text-sm"
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
              <h3 className="text-sm font-semibold text-fg mb-2">
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
              <h3 className="text-sm font-semibold text-fg mb-2">
                {d.selectedRecord ? "Record Details" : "Sync Logs"}
              </h3>
              {d.selectedRecord ? (
                <div className="max-h-80 overflow-auto border border-line rounded p-2">
                  <RecordDetailPanel
                    /* A new row opens with the form closed. */
                    key={d.selectedRecord._id}
                    record={d.selectedRecord}
                    allRecords={d.records}
                    onClose={() => d.setSelectedRecordId(null)}
                    canEdit={canEditRecord(d.selectedRecord, batch)}
                    saving={d.busyAction === "Save Row"}
                    onSave={(payload) =>
                      d.runAction("Save Row", () => ({
                        url: `/api/integration/records/${d.selectedRecord._id}`,
                        options: {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mapped_payload: payload }),
                        },
                      }))
                    }
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
      <Modal
        open={Boolean(deleteTargetBatch)}
        onClose={() => setDeleteTargetBatch(null)}
        title="Confirm Delete Batch"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTargetBatch(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteBatch}>
              Delete Batch
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-4">
          This will permanently delete batch
          <span className="font-semibold">
            {" "}
            {deleteTargetBatch?.source_name || deleteTargetBatch?._id}
          </span>
          , including all staging records and logs.
        </p>
      </Modal>
    </div>
  );
}