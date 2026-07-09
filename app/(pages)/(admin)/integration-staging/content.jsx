"use client";

import { useEffect, useMemo, useState } from "react";

export default function IntegrationStagingContent() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recordsFilter, setRecordsFilter] = useState("");
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  const [apiEndpoint, setApiEndpoint] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [defaultSchoolYear, setDefaultSchoolYear] = useState("");
  const [defaultSemester, setDefaultSemester] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTargetBatch, setDeleteTargetBatch] = useState(null);

  const selectedBatch = useMemo(
    () => batches.find((b) => b._id === selectedBatchId) || null,
    [batches, selectedBatchId],
  );

  const selectedRecord = useMemo(
    () => records.find((r) => r._id === selectedRecordId) || null,
    [records, selectedRecordId],
  );

  function getStagedCount(batch) {
    const fetched = batch?.totals?.fetched ?? 0;
    const skipped = batch?.totals?.skipped ?? 0;
    return Math.max(fetched - skipped, 0);
  }

  async function readJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Request failed");
    }
    return data;
  }

  async function loadBatches() {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/integration/batches", {
        credentials: "include",
      });
      const data = await readJson(res);
      setBatches(data.data || []);
      if (!selectedBatchId && data.data?.length) {
        setSelectedBatchId(data.data[0]._id);
      }
    } catch (err) {
      setMessage(err.message || "Failed to load batches");
    } finally {
      setLoadingBatches(false);
    }
  }

  async function loadBatchDetails(batchId, statusFilter = recordsFilter) {
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
      setMessage(err.message || "Failed to load batch details");
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchDetails(selectedBatchId);
    } else {
      setRecords([]);
      setLogs([]);
    }
  }, [selectedBatchId]);

  async function runAction(actionName, requestFactory) {
    setBusyAction(actionName);
    setMessage("");
    try {
      const req = requestFactory();
      const res = await fetch(req.url, req.options);
      const data = await readJson(res);
      if (
        ["Upload to Staging", "Fetch to Staging"].includes(actionName) &&
        data?.data
      ) {
        setMessage(
          `Imported ${data.data.fetched ?? 0} raw rows. ${data.data.staged ?? 0} staged. ${data.data.skipped_duplicates ?? 0} duplicate rows skipped.`,
        );
      } else {
        setMessage(data?.message || `${actionName} completed successfully`);
      }
      await loadBatches();
      if (selectedBatchId) {
        await loadBatchDetails(selectedBatchId);
      }
    } catch (err) {
      setMessage(err.message || `${actionName} failed`);
    } finally {
      setBusyAction("");
    }
  }

  function onFetchFromApi(e) {
    e.preventDefault();
    runAction("Fetch to Staging", () => ({
      url: "/api/integration/fetch",
      options: {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: apiEndpoint,
          source_name: sourceName || "HRMIS API",
          school_year: defaultSchoolYear,
          semester: defaultSemester,
        }),
      },
    }));
  }

  function selectRecord(recordId) {
    setSelectedRecordId(selectedRecordId === recordId ? null : recordId);
  }

  function onUploadCsv(e) {
    e.preventDefault();
    if (!uploadFile) {
      setMessage("Please choose a CSV/XLSX file first.");
      return;
    }

    runAction("Upload to Staging", () => {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("school_year", defaultSchoolYear);
      formData.append("semester", defaultSemester);

      return {
        url: "/api/integration/upload",
        options: {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      };
    });
  }

  function onDeleteBatch(batch) {
    setDeleteTargetBatch(batch);
  }

  function cancelDeleteBatch() {
    setDeleteTargetBatch(null);
  }

  function confirmDeleteBatch() {
    if (!deleteTargetBatch?._id) return;

    const batchId = deleteTargetBatch._id;
    setDeleteTargetBatch(null);

    runAction("Delete Batch", () => ({
      url: `/api/integration/batches/${batchId}`,
      options: {
        method: "DELETE",
        credentials: "include",
      },
    }));

    if (selectedBatchId === batchId) {
      setSelectedBatchId("");
      setRecords([]);
      setLogs([]);
      setSelectedRecordId(null);
    }
  }

  return (
    <div className="py-8 space-y-4">
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Integration Staging
        </h1>
        <p className="text-sm text-gray-600">
          Fetch HRMIS data or upload SIS/ARO files, validate, approve, and
          migrate into production.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form
          onSubmit={onFetchFromApi}
          className="bg-white border border-gray-200 rounded-md p-4 space-y-3"
        >
          <h2 className="text-base font-medium text-gray-900">
            Fetch From HRMIS API
          </h2>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Source name (optional)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={defaultSchoolYear}
              onChange={(e) => setDefaultSchoolYear(e.target.value)}
              placeholder="Default school year (e.g. 2026-2027)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <select
              value={defaultSemester}
              onChange={(e) => setDefaultSemester(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Default semester</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          <input
            type="url"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            placeholder="https://example.com/hrmis/endpoint"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={busyAction !== ""}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {busyAction === "Fetch to Staging"
              ? "Fetching..."
              : "Fetch to Staging"}
          </button>
        </form>

        <form
          onSubmit={onUploadCsv}
          className="bg-white border border-gray-200 rounded-md p-4 space-y-3"
        >
          <h2 className="text-base font-medium text-gray-900">
            Manual Upload (CSV/XLSX)
          </h2>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={defaultSchoolYear}
              onChange={(e) => setDefaultSchoolYear(e.target.value)}
              placeholder="Default school year (e.g. 2026-2027)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <select
              value={defaultSemester}
              onChange={(e) => setDefaultSemester(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Default semester</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busyAction !== ""}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
          >
            {busyAction === "Upload to Staging"
              ? "Uploading..."
              : "Upload to Staging"}
          </button>
        </form>
      </div>

      {message && (
        <div className="bg-slate-100 border border-slate-300 rounded px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <h2 className="text-base font-medium text-gray-900">
            Import Batches
          </h2>
          <button
            type="button"
            onClick={loadBatches}
            disabled={loadingBatches}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm"
          >
            {loadingBatches ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Source</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Raw Rows</th>
                <th className="text-left px-3 py-2">Staged</th>
                <th className="text-left px-3 py-2">Dupes Skipped</th>
                <th className="text-left px-3 py-2">Valid</th>
                <th className="text-left px-3 py-2">Approved</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch._id}
                  className={selectedBatchId === batch._id ? "bg-blue-50" : ""}
                >
                  <td className="px-3 py-2">{batch.source_name || "-"}</td>
                  <td className="px-3 py-2">{batch.source_type}</td>
                  <td className="px-3 py-2">{batch.status}</td>
                  <td className="px-3 py-2">{batch.totals?.fetched ?? 0}</td>
                  <td className="px-3 py-2">{getStagedCount(batch)}</td>
                  <td className="px-3 py-2">{batch.totals?.skipped ?? 0}</td>
                  <td className="px-3 py-2">{batch.totals?.valid ?? 0}</td>
                  <td className="px-3 py-2">{batch.totals?.approved ?? 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBatchId(batch._id)}
                        className="px-2 py-1 rounded border border-gray-300"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        disabled={busyAction !== ""}
                        onClick={() => onDeleteBatch(batch)}
                        className="px-2 py-1 rounded border border-red-300 text-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={9}>
                    No batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTargetBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={cancelDeleteBatch}
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
                onClick={cancelDeleteBatch}
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

      {selectedBatch && (
        <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-gray-900">
                Selected Batch: {selectedBatch.source_name || selectedBatch._id}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Uploaded by:{" "}
                <span className="font-semibold">
                  {selectedBatch.created_by?.full_name ||
                    selectedBatch.created_by_username ||
                    "Unknown"}
                </span>
                {selectedBatch.created_at && (
                  <> on {new Date(selectedBatch.created_at).toLocaleString()}</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyAction !== ""}
                onClick={() =>
                  runAction("Validate Batch", () => ({
                    url: `/api/integration/batches/${selectedBatch._id}/validate`,
                    options: {
                      method: "POST",
                      credentials: "include",
                    },
                  }))
                }
                className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm disabled:opacity-50"
              >
                {busyAction === "Validate Batch" ? "Validating..." : "Validate"}
              </button>
              <button
                type="button"
                disabled={busyAction !== ""}
                onClick={() =>
                  runAction("Approve Batch", () => ({
                    url: `/api/integration/batches/${selectedBatch._id}/approve`,
                    options: {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    },
                  }))
                }
                className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
              >
                {busyAction === "Approve Batch"
                  ? "Approving..."
                  : "Approve Valid"}
              </button>
              <button
                type="button"
                disabled={busyAction !== ""}
                onClick={() =>
                  runAction("Migrate Batch", () => ({
                    url: `/api/integration/batches/${selectedBatch._id}/migrate`,
                    options: {
                      method: "POST",
                      credentials: "include",
                    },
                  }))
                }
                className="px-3 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50"
              >
                {busyAction === "Migrate Batch"
                  ? "Migrating..."
                  : "Migrate Approved"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="recordFilter" className="text-sm text-gray-700">
              Filter records:
            </label>
            <select
              id="recordFilter"
              value={recordsFilter}
              onChange={(e) => {
                const val = e.target.value;
                setRecordsFilter(val);
                loadBatchDetails(selectedBatch._id, val);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="valid">valid</option>
              <option value="invalid">invalid</option>
              <option value="approved">approved</option>
              <option value="migrated">migrated</option>
              <option value="failed">failed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Staging Records
              </h3>
              <div className="max-h-80 overflow-auto border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1">Row</th>
                      <th className="text-left px-2 py-1">Status</th>
                      <th className="text-left px-2 py-1">Identity</th>
                      <th className="text-left px-2 py-1">Term</th>
                      <th className="text-left px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr
                        key={r._id}
                        className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          selectedRecordId === r._id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => selectRecord(r._id)}
                      >
                        <td className="px-2 py-1">{r.row_number}</td>
                        <td className="px-2 py-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              r.status === "valid"
                                ? "bg-green-100 text-green-700"
                                : r.status === "invalid"
                                  ? "bg-red-100 text-red-700"
                                  : r.status === "approved"
                                    ? "bg-blue-100 text-blue-700"
                                    : r.status === "migrated"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-[11px]">
                          {r.identity?.student_id ||
                            r.identity?.employee_id ||
                            r.identity?.email ||
                            "-"}
                        </td>
                        <td className="px-2 py-1 text-[11px]">
                          {`${r.school_year || "-"} ${r.semester || ""}`.trim()}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {r.validation_errors &&
                            r.validation_errors.length > 0 && (
                              <span className="text-xs text-red-600 font-semibold">
                                !
                              </span>
                            )}
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td className="px-2 py-3 text-gray-500" colSpan={5}>
                          {loadingDetails ? "Loading..." : "No records"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {selectedRecord ? "Record Details" : "Sync Logs"}
              </h3>
              <div className="max-h-80 overflow-auto border border-gray-200 rounded p-2 space-y-2">
                {selectedRecord ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="font-semibold text-gray-900">
                        Row {selectedRecord.row_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedRecordId(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    {selectedRecord.validation_errors &&
                      selectedRecord.validation_errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="font-semibold text-red-700 mb-1">
                            Validation Errors:
                          </div>
                          <div className="space-y-1 text-red-600">
                            {selectedRecord.validation_errors.map(
                              (err, idx) => (
                                <div key={idx}>
                                  • {err.field}: {err.message}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {selectedRecord.migration_result &&
                      (selectedRecord.migration_result.action ||
                        selectedRecord.migration_result.message) && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2">
                          <div className="font-semibold text-amber-700 mb-1">
                            Migration Result:
                          </div>
                          <div className="space-y-1 text-amber-700">
                            {selectedRecord.migration_result.action && (
                              <div>
                                • Action:{" "}
                                {selectedRecord.migration_result.action}
                              </div>
                            )}
                            {selectedRecord.migration_result.message && (
                              <div>
                                • Reason:{" "}
                                {selectedRecord.migration_result.message}
                              </div>
                            )}
                            {selectedRecord.migration_result.profile_id && (
                              <div>
                                • Profile ID:{" "}
                                {String(
                                  selectedRecord.migration_result.profile_id,
                                )}
                              </div>
                            )}
                            {selectedRecord.migration_result
                              .profile_term_id && (
                              <div>
                                • Profile Term ID:{" "}
                                {String(
                                  selectedRecord.migration_result
                                    .profile_term_id,
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {selectedRecord.raw_payload && (
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">
                          Raw Data:
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-1.5 overflow-auto max-h-24">
                          <pre className="text-[10px] text-gray-700">
                            {JSON.stringify(
                              selectedRecord.raw_payload,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </div>
                    )}

                    {selectedRecord.mapped_payload && (
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">
                          Normalized Data:
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded p-1.5 overflow-auto max-h-30">
                          <pre className="text-[10px] text-gray-700">
                            {JSON.stringify(
                              selectedRecord.mapped_payload,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {logs.map((log) => (
                      <div
                        key={log._id}
                        className="border border-gray-100 rounded p-2"
                      >
                        <div className="text-xs font-semibold text-gray-800">
                          {log.action}
                        </div>
                        <div className="text-xs text-gray-600">
                          {log.message}
                        </div>
                        {log.details &&
                          Object.keys(log.details || {}).length > 0 && (
                            <div className="mt-1 rounded bg-gray-50 border border-gray-200 p-1.5">
                              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        <div className="text-[11px] text-gray-500">
                          {new Date(
                            log.executed_at || log.createdAt,
                          ).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="text-xs text-gray-500">
                        {loadingDetails ? "Loading..." : "No logs yet"}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
