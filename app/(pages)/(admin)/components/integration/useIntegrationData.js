"use client";

import { useCallback, useEffect, useState } from "react";

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }
  return data;
}

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

  function buildResultMessage(actionName, data) {
    if (!data) return null;
    if (["Fetch to Staging", "Sync Now", "Upload to Staging"].includes(actionName)) {
      return `Imported ${data.fetched ?? 0} raw rows. ${data.staged ?? 0} staged. ${data.duplicates_flagged ?? 0} duplicates flagged.`;
    }
    if (actionName === "Validate Batch") {
      return `Validation complete: ${data.valid ?? 0} valid, ${data.invalid ?? 0} invalid.`;
    }
    if (actionName.startsWith("Approve")) {
      return `Approved ${data.approved_now ?? 0} record(s).`;
    }
    if (actionName.startsWith("Reject")) {
      return `Rejected ${data.rejected_now ?? 0} record(s).`;
    }
    if (actionName === "Migrate Approved") {
      return `Migration complete: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped, ${data.failed ?? 0} failed.`;
    }
    return null;
  }

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
      } catch (err) {
        setMessage({
          type: "error",
          text: err.message || `${actionName} failed`,
        });
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