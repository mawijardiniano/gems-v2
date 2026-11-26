"use client";

import { useState } from "react";
import { fieldLabel } from "@/app/api/integration/_utils/fieldLabels";
import {
  EDIT_SECTIONS,
  buildEditedPayload,
  initialEditValues,
} from "./recordEdit";

const INPUT_CLASS =
  "w-full border border-line-strong rounded px-2 py-1 text-xs text-fg bg-white";

/* Form for fixing one staging row. Saving puts the row back to pending; the
   batch Validate runs the full checks again before it can be approved. */
function RecordEditForm({ record, saving, onSave, onCancel }) {
  const [values, setValues] = useState(() =>
    initialEditValues(record.mapped_payload),
  );
  const status = values["personal.currentStatus"];

  function setValue(path, value) {
    setValues((prev) => ({ ...prev, [path]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSave(buildEditedPayload(record.mapped_payload, values));
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-fg-muted">
        Saving sets this row back to pending. Press Validate on the batch to
        check it again before approving it.
      </p>
      {EDIT_SECTIONS.filter((s) => !s.show || s.show === status).map(
        (section) => (
          <fieldset key={section.title} className="space-y-1">
            <legend className="font-semibold text-fg mb-1">
              {section.title}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {section.fields.map((field) => {
                const id = `edit-${record._id}-${field.path}`;
                const value = values[field.path] ?? "";
                /* Keep a stored value the list doesn't know, so opening the
                   form never changes it silently. */
                const options =
                  field.options && value && !field.options.includes(value)
                    ? [...field.options, value]
                    : field.options;
                return (
                  <div key={field.path}>
                    <label htmlFor={id} className="block text-fg-3 mb-0.5">
                      {fieldLabel(field.path)}
                    </label>
                    {options ? (
                      <select
                        id={id}
                        value={value}
                        onChange={(e) => setValue(field.path, e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        type={field.type || "text"}
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(e) => setValue(field.path, e.target.value)}
                        className={INPUT_CLASS}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ),
      )}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded border border-line-strong text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded bg-secondary-600 text-white text-xs disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save row"}
        </button>
      </div>
    </form>
  );
}

export default function RecordDetailPanel({
  record,
  allRecords = [],
  onClose,
  canEdit = false,
  saving = false,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  if (!record) return null;
  const migration = record.migration_result;
  const duplicateSource = record.duplicate_of
    ? allRecords.find((r) => r._id === String(record.duplicate_of))
    : null;

  const header = (
    <div className="flex items-center justify-between pb-2 border-b">
      <span className="font-semibold text-fg">
        Row {record.row_number}
        {record.status === "duplicate" && (
          <span className="ml-2 text-warning">(Duplicate)</span>
        )}
      </span>
      <div className="flex items-center gap-2">
        {canEdit && onSave && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-2 py-1 rounded border border-line-strong text-xs text-fg-3 hover:bg-subtle"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close record details"
          className="touch-target text-fg-muted hover:text-fg-4"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );

  if (editing && canEdit && onSave) {
    return (
      <div className="space-y-3 text-xs">
        {header}
        <RecordEditForm
          record={record}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSave={async (payload) => {
            if (await onSave(payload)) setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      {header}

      {record.duplicate_of && (
        <div className="bg-warning-subtle border border-warning-border rounded p-2 text-warning">
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
            <div className="bg-danger-subtle border border-danger-border rounded p-2">
              <div className="font-semibold text-danger mb-1">
                Validation Errors:
              </div>
              <div className="space-y-1 text-danger">
                {record.validation_errors
                  .filter((e) => e.level !== "warning")
                  .map((err, idx) => (
                    <div key={idx}>
                      • {fieldLabel(err.field)}: {err.message}
                    </div>
                  ))}
              </div>
            </div>
          )}
          {record.validation_errors.filter((e) => e.level === "warning")
            .length > 0 && (
            <div className="bg-secondary-50 border border-secondary-200 rounded p-2">
              <div className="font-semibold text-secondary-700 mb-1">
                Warnings (non-blocking):
              </div>
              <div className="space-y-1 text-secondary-700">
                {record.validation_errors
                  .filter((e) => e.level === "warning")
                  .map((err, idx) => (
                    <div key={idx}>
                      • {fieldLabel(err.field)}: {err.message}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {migration && (migration.action || migration.message) && (
        <div className="bg-secondary-50 border border-secondary-200 rounded p-2">
          <div className="font-semibold text-secondary-700 mb-1">
            Migration Result:
          </div>
          <div className="space-y-1 text-secondary-700">
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
            <div className="mt-2 pt-2 border-t border-secondary-200">
              <div className="font-semibold text-secondary-700 mb-1">
                Changes made: {migration.changes.length}
              </div>
              <div className="space-y-1 text-secondary-700">
                {migration.changes.map((change, idx) => (
                  <div key={idx}>
                    • {fieldLabel(change.field)}
                    {change.field?.startsWith("pii.")
                      ? " (updated)"
                      : `: ${String(change.from ?? "")} → ${String(change.to ?? "")}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {record.payload_cleared_at && (
        <div className="rounded border border-line bg-subtle p-1.5 text-xs text-fg-4">
          Personal data in this row was cleared on{" "}
          {new Date(record.payload_cleared_at).toLocaleDateString()} after the
          batch was imported. The person&apos;s details are kept encrypted in
          their profile.
        </div>
      )}

      {record.raw_payload && !record.payload_cleared_at && (
        <div>
          <div className="font-semibold text-fg mb-1">Raw Data:</div>
          <div className="bg-subtle border border-line rounded p-1.5 overflow-auto max-h-24">
            <pre className="text-xs text-fg-3">
              {JSON.stringify(record.raw_payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {record.mapped_payload && !record.payload_cleared_at && (
        <div>
          <div className="font-semibold text-fg mb-1">
            Normalized Data:
          </div>
          <div className="bg-secondary-50 border border-secondary-200 rounded p-1.5 overflow-auto max-h-30">
            <pre className="text-xs text-fg-3">
              {JSON.stringify(record.mapped_payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}