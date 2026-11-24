"use client";

import { useState } from "react";
import { FaFileAlt, FaEdit, FaExternalLinkAlt } from "react-icons/fa";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  MAX_UPLOAD_FILE_BYTES,
  UPLOAD_FOLDER_RULES,
  describeExtensions,
  extensionOf,
} from "@/data/lib/uploadRules";

const FOLDER = "gfps/issuance";
const ALLOWED = UPLOAD_FOLDER_RULES[FOLDER];

/** "2026-08-01" for an ISO date or Date; "" when empty. */
const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

/** "August 1, 2026"; "—" when empty. */
const toDisplayDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
};

/* Files are served through the session-checked proxy, never a storage URL. */
const fileUrl = (key) => `/api/files/proxy?key=${encodeURIComponent(key)}`;

/**
 * The memorandum or special order that constitutes the GFPS for the selected
 * academic year: its number, date, effectivity and a scanned copy.
 *
 * PCW requires the GFPS to be created by an issuance; this is where the year's
 * issuance is recorded. Editors (Admin, GAD Focal Person) can change it on the
 * active year; everyone else who can open the page sees it read-only.
 */
export default function IssuanceCard({ academicYear, issuance, canEdit, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = issuance || {};
  const hasIssuance = Boolean(current.number || current.date || current.file?.key);

  const openEditor = () => {
    setForm({
      number: current.number || "",
      date: toInputDate(current.date),
      effectivity: toInputDate(current.effectivity),
      file: current.file?.key ? current.file : null,
    });
    setPendingFile(null);
    setError("");
    setOpen(true);
  };

  const pickFile = (file) => {
    setError("");
    if (!file) return setPendingFile(null);
    if (!ALLOWED.includes(extensionOf(file.name))) {
      setError(`Choose a ${describeExtensions(ALLOWED)} file.`);
      return setPendingFile(null);
    }
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      setError("The file is larger than 25 MB.");
      return setPendingFile(null);
    }
    setPendingFile(file);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      let file = form.file || null;
      if (pendingFile) {
        const data = new FormData();
        data.append("file", pendingFile);
        data.append("folder", FOLDER);
        const up = await fetch("/api/upload", { method: "POST", body: data });
        const upJson = await up.json().catch(() => ({}));
        if (!up.ok || !upJson.key) {
          setError(upJson.error || "Upload failed");
          return;
        }
        file = { key: upJson.key, name: pendingFile.name };
      }

      const res = await fetch("/api/gfps/issuance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academic_year: academicYear,
          number: form.number,
          date: form.date || null,
          effectivity: form.effectivity || null,
          file,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to save the issuance");
        return;
      }
      setOpen(false);
      onSaved?.(json.data);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full border border-line-strong rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition";

  return (
    <div className="rounded-2xl border border-line-subtle bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-secondary-50 text-secondary-600 shrink-0">
          <FaFileAlt className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">GFPS Issuance</h3>
          {hasIssuance ? (
            <div className="text-sm text-fg-3 mt-0.5 space-y-0.5">
              <p className="break-words">
                {current.number || "No number recorded"}
                {current.date && <> · dated {toDisplayDate(current.date)}</>}
              </p>
              <p className="text-xs text-fg-muted">
                Effective {toDisplayDate(current.effectivity)}
                {current.file?.key && (
                  <>
                    {" · "}
                    <a
                      href={fileUrl(current.file.key)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-secondary-700 hover:underline"
                    >
                      {current.file.name || "View file"}
                      <FaExternalLinkAlt className="h-2.5 w-2.5" />
                    </a>
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-fg-muted mt-0.5">
              No issuance recorded for AY {academicYear}. PCW requires the GFPS
              to be created by a memorandum or special order.
            </p>
          )}
        </div>
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={openEditor}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-secondary-600 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
        >
          <FaEdit className="h-3.5 w-3.5" />
          {hasIssuance ? "Edit" : "Add issuance"}
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={saving}
        title="GFPS Issuance"
        description={`Memorandum or special order for AY ${academicYear}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-3 mb-1.5">
              Memorandum / Special Order No.
            </label>
            <input
              type="text"
              value={form.number || ""}
              maxLength={120}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder="e.g. Special Order No. 123, s. 2026"
              className={field}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1.5">Date issued</label>
              <input
                type="date"
                value={form.date || ""}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1.5">Effectivity</label>
              <input
                type="date"
                value={form.effectivity || ""}
                onChange={(e) => setForm((f) => ({ ...f, effectivity: e.target.value }))}
                className={field}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-3 mb-1.5">
              Scanned copy ({describeExtensions(ALLOWED)}, up to 25 MB)
            </label>
            {form.file?.key && !pendingFile && (
              <div className="flex items-center justify-between gap-2 mb-2 text-sm border border-line rounded-xl px-3 py-2">
                <a
                  href={fileUrl(form.file.key)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-secondary-700 hover:underline"
                >
                  {form.file.name || "Current file"}
                </a>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, file: null }))}
                  className="touch-target shrink-0 text-xs px-2 py-1 rounded-md border border-line text-fg-4 hover:bg-subtle"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept={ALLOWED.join(",")}
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-fg-3 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-secondary-50 file:text-secondary-700"
            />
            {form.file?.key && !pendingFile && (
              <p className="mt-1 text-xs text-fg-muted">Choosing a new file replaces the current one.</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-danger bg-danger-subtle border border-danger-border rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
