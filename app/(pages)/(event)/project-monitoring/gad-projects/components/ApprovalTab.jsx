"use client";

import React, { useState } from "react";
import axios from "axios";
import { getFieldValue } from "../../lib/projectView";
import {
  DetailRow,
  EditButton,
  ErrorNote,
  FieldLabel,
  SaveCancel,
  inputClass,
} from "./DetailFields";

const MAX_LENGTH = 500;

/* "Approval" tab: approved resolution number and other details. Both are
   optional and saved separately from the schedule. */
export default function ApprovalTab({ project, canManage, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resolution = getFieldValue(project.approved_resolution_no);
  const otherDetails = getFieldValue(project.other_details);

  const start = () => {
    setError("");
    setDraft({
      approved_resolution_no: String(resolution || ""),
      other_details: String(otherDetails || ""),
    });
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    const approved_resolution_no = draft.approved_resolution_no.trim();
    const other_details = draft.other_details.trim();
    if (
      approved_resolution_no.length > MAX_LENGTH ||
      other_details.length > MAX_LENGTH
    ) {
      setError(`Approval details are too long (max ${MAX_LENGTH} characters).`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.put(
        `/api/project/${project._id}`,
        { approved_resolution_no, other_details },
        { withCredentials: true },
      );
      onSaved({
        approved_resolution_no: { value: approved_resolution_no },
        other_details: { value: other_details },
      });
      setEditing(false);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Failed to save approval details. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));

  return (
    <div className="max-w-3xl animate-fade-in" role="tabpanel">
      <section className="rounded-xl bg-white border border-line-subtle p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel>Approval Details</FieldLabel>
          {canManage && !editing && (
            <EditButton onClick={start}>
              {resolution || otherDetails ? "Update" : "Add Details"}
            </EditButton>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            <label className="block">
              <FieldLabel className="mb-1">Approved Resolution #</FieldLabel>
              <input
                type="text"
                value={draft.approved_resolution_no}
                onChange={set("approved_resolution_no")}
                placeholder="e.g. SP Res. No. 2026-045"
                maxLength={MAX_LENGTH}
                className={inputClass}
              />
            </label>
            <label className="block">
              <FieldLabel className="mb-1">
                Others (Other Details / Information)
              </FieldLabel>
              <textarea
                value={draft.other_details}
                onChange={set("other_details")}
                rows={3}
                placeholder="Optional — any other approval details or information"
                maxLength={MAX_LENGTH}
                className={`${inputClass} resize-none`}
              />
            </label>
            <SaveCancel
              saving={saving}
              onSave={save}
              onCancel={() => {
                setEditing(false);
                setError("");
              }}
            />
          </div>
        ) : (
          <>
            <DetailRow label="Approved Resolution #" value={resolution} />
            <DetailRow
              label="Others (Other Details / Information)"
              value={otherDetails}
            />
            {!canManage && (
              <p className="text-xs text-fg-muted italic">
                Only the project creator or a GAD Focal Person can update the
                approval details.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
