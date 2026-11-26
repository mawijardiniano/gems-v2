"use client";

import { useCallback, useEffect, useState } from "react";

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }
  return data;
}

const POLL_MS = 3000;

export default function useIntegrationData() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recordsFilter, setRecordsFilter] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState(null);

  const selectedBatch = batches.find((b) => b._id === selectedBatchId) || null;
  const selectedRecord = records.find((r) => r._id === selectedRecordId) || null;

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/integration/batches", {
        credentials: "include",
      });
      const data = await readJson(res);
      setBatches(data.data || []);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to load batches" });
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const loadBatchDetails = useCallback(async (batchId, statusFilter = "") => {
    if (!batchId) return;
    setLoadingDetails(true);
    try {
      const recordsUrl = statusFilter
        ? `/api/integration/batches/${batchId}/records?status=${encodeURIComponent(statusFilter)}`
        : `/api/integration/batches/${batchId}/records`;

      const [recordsRes, logsRes] = await Promise.all([
        fetch(recordsUrl, { credentials: "include" }),
        fetch(`/api/integration/batches/${batchId}/logs`, {
          credentials: "include",
        }),
      ]);

      const recordsData = await readJson(recordsRes);
      const logsData = await readJson(logsRes);

      setRecords(recordsData.data || []);
      setLogs(logsData.data || []);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to load batch details",
      });
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchDetails(selectedBatchId, recordsFilter);
    } else {
      setRecords([]);
      setLogs([]);
    }
  }, [selectedBatchId]);

  /* A large migration runs on the server after the request returns; poll
     until no batch is migrating, so status and progress stay current. */
  const anyMigrating = batches.some((b) => b.status === "migrating");
  useEffect(() => {
    if (!anyMigrating) return undefined;
    const timer = setInterval(() => {
      loadBatches();
      if (selectedBatchId) loadBatchDetails(selectedBatchId, recordsFilter);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [anyMigrating, selectedBatchId, recordsFilter, loadBatches, loadBatchDetails]);

  function buildResultMessage(actionName, data) {
    if (!data) return null;
    if (actionName === "Migrate Approved" && data.background) {
      return `Migrating ${data.total ?? 0} row(s) on the server. You can leave this page; progress shows on the batch.`;
    }
    if (["Fetch to Staging", "Sync Now", "Upload to Staging"].includes(actionName)) {
      const counts = `Imported ${data.fetched ?? 0} raw rows. ${data.staged ?? 0} staged. ${data.duplicates_flagged ?? 0} duplicates flagged.`;
      /* Column problems fail every row; say so now, not after Validate. */
      const problems = data.header_problems || [];
      const base = problems.length
        ? `${counts} Check the file: ${problems.join(" ")}`
        : counts;
      const same = data.same_as;
      if (!same) return base;
      const when = same.created_at
        ? ` on ${new Date(same.created_at).toLocaleString()}`
        : "";
      return `${base} Heads up: these are the same rows as batch "${same.source_name || same.batch_id}" staged${when} (${same.status}). If this is a repeat, delete the new batch instead of importing it twice.`;
    }
    if (actionName === "Test Connection") {
      const secs = ((data.elapsed_ms ?? 0) / 1000).toFixed(1);
      const missing = data.missing_columns || [];
      const base = `Connection OK: the endpoint answered in ${secs}s with ${data.rows ?? 0} row(s). Nothing was staged.`;
      if ((data.rows ?? 0) === 0) {
        return `${base} The feed is empty, so a sync would stage no one.`;
      }
      return missing.length
        ? `${base} Missing expected column(s): ${missing.join("; ")}. Columns found: ${(data.columns || []).join(", ")}.`
        : `${base} Columns found: ${(data.columns || []).join(", ")}.`;
    }
    if (actionName === "Validate Batch") {
      return `Validation complete: ${data.valid ?? 0} valid, ${data.invalid ?? 0} invalid.`;
    }
    if (actionName.startsWith("Approve")) {
      const review = data.needs_review ?? 0;
      return review > 0
        ? `Approved ${data.approved_now ?? 0} record(s). ${review} matched only on name + birthday were left out — tick them to approve after checking they are the same person.`
        : `Approved ${data.approved_now ?? 0} record(s).`;
    }
    if (actionName.startsWith("Reject")) {
      return `Rejected ${data.rejected_now ?? 0} record(s).`;
    }
    if (actionName === "Migrate Approved") {
      return `Migration complete: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped, ${data.failed ?? 0} failed.`;
    }
    if (actionName === "Undo Import") {
      const parts = [`Import undone: ${data.removed ?? 0} person(s) removed`];
      if (data.terms_removed) parts.push(`${data.terms_removed} term(s) removed`);
      if (data.kept) parts.push(`${data.kept} kept because they changed or are in use`);
      const tail = data.updated_not_reverted
        ? ` ${data.updated_not_reverted} updated person(s) were not changed back.`
        : "";
      return `${parts.join(", ")}.${tail}`;
    }
    if (actionName === "Save Row") {
      return `Row ${data.row_number ?? ""} saved and set back to pending. Press Validate to check it again, then approve it.`;
    }
    return null;
  }

  /* Resolves true when the action succeeded, so a caller (the row edit form)
     can close itself; failures are shown in the message banner. */
  const runAction = useCallback(
    async (actionName, requestFactory) => {
      setBusyAction(actionName);
      setMessage(null);
      try {
        const req = requestFactory();
        const res = await fetch(req.url, req.options);
        const data = await readJson(res);
        const resultMessage = buildResultMessage(actionName, data?.data);
        setMessage({
          type: "success",
          text: resultMessage || `${actionName} completed successfully`,
        });
        await loadBatches();
        if (selectedBatchId) {
          await loadBatchDetails(selectedBatchId, recordsFilter);
        }
        return true;
      } catch (err) {
        setMessage({
          type: "error",
          text: err.message || `${actionName} failed`,
        });
        return false;
      } finally {
        setBusyAction("");
      }
    },
    [loadBatches, loadBatchDetails, selectedBatchId, recordsFilter],
  );

  return {
    batches,
    selectedBatch,
    selectedBatchId,
    setSelectedBatchId,
    records,
    logs,
    recordsFilter,
    setRecordsFilter,
    selectedRecord,
    selectedRecordId,
    setSelectedRecordId,
    loadingBatches,
    loadingDetails,
    busyAction,
    message,
    setMessage,
    loadBatches,
    loadBatchDetails,
    runAction,
  };
}