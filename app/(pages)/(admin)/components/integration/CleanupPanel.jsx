"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data.data;
}

/* Setting for removing old batches nobody imported, with the list of
   batches it would remove now. */
export default function CleanupPanel({ onRemoved }) {
  const [days, setDays] = useState("0");
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await readJson(
        await fetch("/api/integration/cleanup", { credentials: "include" }),
      );
      setSaved(data);
      setDays(String(data.after_days || 0));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy("save");
    setMessage(null);
    try {
      await readJson(
        await fetch("/api/integration/cleanup", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ after_days: Number(days) }),
        }),
      );
      setMessage({
        type: "success",
        text:
          Number(days) > 0
            ? `Saved. Batches not imported and untouched for ${days} days are removed once a day.`
            : "Saved. Automatic cleanup is off.",
      });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy("");
    }
  }

  async function removeNow() {
    setConfirming(false);
    setBusy("remove");
    setMessage(null);
    try {
      const data = await readJson(
        await fetch("/api/integration/cleanup", {
          method: "POST",
          credentials: "include",
        }),
      );
      setMessage({
        type: "success",
        text: `Removed ${data.removed} batch(es) and ${data.deleted_records} staged row(s).`,
      });
      await load();
      onRemoved?.();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy("");
    }
  }

  const preview = saved?.preview || [];
  const savedDays = saved?.after_days || 0;

  return (
    <div className="space-y-4 text-sm">
      <form onSubmit={save} className="space-y-2">
        <p className="text-xs text-fg-muted">
          Batches that were never imported keep a plain copy of people&apos;s
          details in their staged rows. Remove them automatically once nobody
          has touched them for a number of days. Batches with any imported
          row, and batches being migrated, are never removed. Each removal is
          recorded in the activity log.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="cleanupDays" className="text-fg-3">
            Remove after
          </label>
          <input
            id="cleanupDays"
            type="number"
            min="0"
            max="365"
            step="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-24 border border-line-strong rounded px-2 py-1 text-sm"
          />
          <span className="text-fg-3">days without changes (0 = off)</span>
          <Button type="submit" variant="primary" loading={busy === "save"}>
            Save
          </Button>
        </div>
        {saved?.last_run_on && (
          <p className="text-xs text-fg-muted">
            Last automatic run: {saved.last_run_on}
            {saved.updated_by_username
              ? ` (set by ${saved.updated_by_username})`
              : ""}
            .
          </p>
        )}
      </form>

      {savedDays > 0 && (
        <section className="space-y-2" aria-labelledby="cleanup-preview-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="cleanup-preview-title" className="font-semibold text-fg">
              Would be removed now ({preview.length})
            </h3>
            <Button
              variant="danger"
              onClick={() => setConfirming(true)}
              disabled={preview.length === 0 || busy !== ""}
              loading={busy === "remove"}
            >
              Remove now
            </Button>
          </div>
          {preview.length === 0 ? (
            <p className="text-xs text-fg-muted">
              No batch has gone {savedDays} days without changes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-line">
                <thead className="bg-subtle">
                  <tr>
                    <th className="text-left px-3 py-2">Batch</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Rows</th>
                    <th className="text-left px-3 py-2">Last changed</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((b) => (
                    <tr key={b.batch_id} className="border-t border-line-subtle">
                      <td className="px-3 py-1.5">{b.source_name || b.batch_id}</td>
                      <td className="px-3 py-1.5">{b.status}</td>
                      <td className="px-3 py-1.5">{b.rows}</td>
                      <td className="px-3 py-1.5">
                        {new Date(b.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`text-xs ${message.type === "error" ? "text-danger" : "text-success"}`}
        >
          {message.text}
        </p>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Remove old batches"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeNow}>
              Remove {preview.length} batch(es)
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-4">
          This permanently deletes {preview.length} batch(es) that were never
          imported, with their staged rows and sync logs. People already in
          the records are not affected.
        </p>
      </Modal>
    </div>
  );
}
