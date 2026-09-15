"use client";

import StatusBadge, { BATCH_STATUS_STYLES } from "./statuses";

export default function BatchTable({
  batches,
  selectedBatchId,
  onSelect,
  onDelete,
  loading,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">Source</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Raw</th>
            <th className="text-left px-3 py-2">Valid</th>
            <th className="text-left px-3 py-2">Invalid</th>
            <th className="text-left px-3 py-2">Approved</th>
            <th className="text-left px-3 py-2">Dupes</th>
            <th className="text-left px-3 py-2">Migrated</th>
            <th className="text-left px-3 py-2">Failed</th>
            <th className="text-left px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => {
            const migrated =
              (batch.totals?.migrated_created ?? 0) +
              (batch.totals?.migrated_updated ?? 0);
            return (
              <tr
                key={batch._id}
                className={`border-t border-gray-100 ${
                  selectedBatchId === batch._id ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-3 py-2">{batch.source_name || "-"}</td>
                <td className="px-3 py-2 text-xs">{batch.source_type}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    status={batch.status}
                    styles={BATCH_STATUS_STYLES}
                  />
                </td>
                <td className="px-3 py-2">{batch.totals?.fetched ?? 0}</td>
                <td className="px-3 py-2">{batch.totals?.valid ?? 0}</td>
                <td className="px-3 py-2 text-red-600">
                  {batch.totals?.invalid ?? 0}
                </td>
                <td className="px-3 py-2">{batch.totals?.approved ?? 0}</td>
                <td className="px-3 py-2 text-yellow-600">
                  {batch.totals?.duplicates ?? 0}
                </td>
                <td className="px-3 py-2">{migrated}</td>
                <td className="px-3 py-2 text-red-600">
                  {batch.totals?.failed ?? 0}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(batch._id)}
                      className="px-2 py-1 rounded border border-gray-300 text-xs"
                    >
                      {selectedBatchId === batch._id ? "Selected" : "Select"}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onDelete(batch)}
                      className="px-2 py-1 rounded border border-red-300 text-red-700 text-xs disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {batches.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-gray-500" colSpan={11}>
                {loading ? "Loading batches..." : "No batches yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}