"use client";

export default function RecordDetailPanel({ record, allRecords = [], onClose }) {
  if (!record) return null;
  const migration = record.migration_result;
  const duplicateSource = record.duplicate_of
    ? allRecords.find((r) => r._id === String(record.duplicate_of))
    : null;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="font-semibold text-gray-900">
          Row {record.row_number}
          {record.status === "duplicate" && (
            <span className="ml-2 text-yellow-600">(Duplicate)</span>
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {record.duplicate_of && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-700">
          <div className="font-semibold mb-1">Duplicate Of:</div>
          <div>
            •{" "}
            {duplicateSource
              ? `Row ${duplicateSource.row_number}`
              : `Record ${String(record.duplicate_of)}`}
          </div>
        </div>
      )}

      {record.validation_errors && record.validation_errors.length > 0 && (
        <>
          {record.validation_errors.filter((e) => e.level !== "warning")
            .length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <div className="font-semibold text-red-700 mb-1">
                Validation Errors:
              </div>
              <div className="space-y-1 text-red-600">
                {record.validation_errors
                  .filter((e) => e.level !== "warning")
                  .map((err, idx) => (
                    <div key={idx}>
                      • {err.field}: {err.message}
                    </div>
                  ))}
              </div>
            </div>
          )}
          {record.validation_errors.filter((e) => e.level === "warning")
            .length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2">
              <div className="font-semibold text-amber-700 mb-1">
                Warnings (non-blocking):
              </div>
              <div className="space-y-1 text-amber-700">
                {record.validation_errors
                  .filter((e) => e.level === "warning")
                  .map((err, idx) => (
                    <div key={idx}>
                      • {err.field}: {err.message}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {migration && (migration.action || migration.message) && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <div className="font-semibold text-amber-700 mb-1">
            Migration Result:
          </div>
          <div className="space-y-1 text-amber-700">
            {migration.action && <div>• Action: {migration.action}</div>}
            {migration.message && <div>• Reason: {migration.message}</div>}
            {migration.profile_id && (
              <div>• Profile ID: {String(migration.profile_id)}</div>
            )}
            {migration.profile_term_id && (
              <div>• Profile Term ID: {String(migration.profile_term_id)}</div>
            )}
          </div>
          {migration.changes && migration.changes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <div className="font-semibold text-amber-700 mb-1">
                Changes made: {migration.changes.length}
              </div>
              <div className="space-y-1 text-amber-700">
                {migration.changes.map((change, idx) => (
                  <div key={idx}>
                    • {change.field}: {String(change.from ?? "")} →{" "}
                    {String(change.to ?? "")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {record.raw_payload && (
        <div>
          <div className="font-semibold text-gray-900 mb-1">Raw Data:</div>
          <div className="bg-gray-50 border border-gray-200 rounded p-1.5 overflow-auto max-h-24">
            <pre className="text-[10px] text-gray-700">
              {JSON.stringify(record.raw_payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {record.mapped_payload && (
        <div>
          <div className="font-semibold text-gray-900 mb-1">
            Normalized Data:
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-1.5 overflow-auto max-h-30">
            <pre className="text-[10px] text-gray-700">
              {JSON.stringify(record.mapped_payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}