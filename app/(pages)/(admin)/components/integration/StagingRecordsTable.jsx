"use client";

import StatusBadge from "./statuses";

function recordIdentity(r) {
  return (
    r.identity?.student_id || r.identity?.employee_id || r.identity?.email || "-"
  );
}

function recordName(r) {
  const p = r.mapped_payload?.personal;
  if (!p) return "-";
  return [p.last_name, p.first_name].filter(Boolean).join(", ") || "-";
}

function isSelectable(status) {
  return ["valid", "approved"].includes(status);
}

export default function StagingRecordsTable({
  records,
  loading,
  selectedRecordId,
  onRowClick,
  selectedIds,
  onToggleRow,
  onToggleAll,
}) {
  const selectableRecords = records.filter((r) => isSelectable(r.status));
  const allSelected =
    selectableRecords.length > 0 &&
    selectableRecords.every((r) => selectedIds.has(r._id));

  return (
    <div className="max-h-80 overflow-auto border border-gray-200 rounded">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-2 py-1 w-6">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(selectableRecords, e.target.checked)}
                disabled={selectableRecords.length === 0}
                aria-label="Select all reviewable records"
              />
            </th>
            <th className="text-left px-2 py-1">Row</th>
            <th className="text-left px-2 py-1">ID</th>
            <th className="text-left px-2 py-1">Name</th>
            <th className="text-left px-2 py-1">Sex</th>
            <th className="text-left px-2 py-1">Position</th>
            <th className="text-left px-2 py-1">Term</th>
            <th className="text-left px-2 py-1">Status</th>
            <th className="text-left px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const mapped = r.mapped_payload || {};
            const position =
              mapped.affiliation?.employment_information?.office ||
              mapped.affiliation?.academic_information?.course ||
              mapped.affiliation?.employment_information?.employment_status ||
              "-";
            return (
              <tr
                key={r._id}
                className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedRecordId === r._id ? "bg-blue-50" : ""
                }`}
                onClick={() => onRowClick(r._id)}
              >
                <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r._id)}
                    disabled={!isSelectable(r.status)}
                    onChange={(e) => onToggleRow(r._id, e.target.checked)}
                    aria-label={`Select row ${r.row_number}`}
                  />
                </td>
                <td className="px-2 py-1">{r.row_number}</td>
                <td className="px-2 py-1 text-[11px]">{recordIdentity(r)}</td>
                <td className="px-2 py-1 text-[11px]">{recordName(r)}</td>
                <td className="px-2 py-1 text-[11px]">
                  {mapped.gadData?.sexAtBirth || "-"}
                </td>
                <td className="px-2 py-1 text-[11px]">{position}</td>
                <td className="px-2 py-1 text-[11px]">
                  {`${r.school_year || "-"} ${r.semester || ""}`.trim()}
                </td>
                <td className="px-2 py-1">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-2 py-1 text-center">
                  {r.validation_errors && r.validation_errors.length > 0 && (
                    <>
                      {r.validation_errors.some(
                        (e) => e.level !== "warning",
                      ) && (
                        <span
                          className="text-xs text-red-600 font-semibold"
                          title="Validation errors"
                        >
                          !
                        </span>
                      )}
                      {r.validation_errors.some(
                        (e) => e.level === "warning",
                      ) && (
                        <span
                          className="text-xs text-amber-500 font-semibold"
                          title="Warnings (non-blocking)"
                        >
                          ⚠
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td className="px-2 py-3 text-gray-500" colSpan={9}>
                {loading ? "Loading..." : "No records"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}