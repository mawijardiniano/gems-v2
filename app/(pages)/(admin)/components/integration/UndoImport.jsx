"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

/* Same texts as KEEP_REASON_TEXT in importUndo.js (a server file). */
const KEEP_REASON_TEXT = {
  changed_since: "changed after the import",
  other_terms: "has another term (a later import or an edit)",
  account_not_from_import: "login account not created by this import",
  signed_in: "has signed in or changed their password",
  in_use: "linked to an event, a project or an official",
  already_removed: "already removed",
};

/* "Undo import" for a migrated batch: loads what would be removed and
   kept, and asks for confirmation before anything is deleted. */
export default function UndoImport({ batch, busy, onUndo }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function openPreview() {
    setOpen(true);
    setPlan(null);
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/integration/batches/${batch._id}/undo`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Could not load the preview");
      setPlan(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setOpen(false);
    await onUndo();
  }

  const reasons = {};
  for (const row of plan?.keep_rows || []) {
    reasons[row.reason] = (reasons[row.reason] || []).concat(row.row_number);
  }
  const nothingToDo = plan && plan.remove === 0 && plan.terms === 0;

  return (
    <>
      <Button variant="danger" onClick={openPreview} disabled={busy}>
        Undo Import
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Undo this import"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirm}
              disabled={!plan || nothingToDo}
            >
              Remove {plan?.remove ?? 0} person(s)
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-fg-4">
          {loading && <p>Checking what this import added…</p>}
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          {plan && (
            <>
              <p>
                <strong>{plan.remove}</strong> person(s) this batch created will
                be deleted with their login account, terms and encrypted
                details. This cannot be reversed.
              </p>
              {plan.terms > 0 && (
                <p>
                  {plan.terms} term(s) this batch added to existing people will
                  be removed.
                </p>
              )}
              {plan.keep > 0 && (
                <div>
                  <p>
                    {plan.keep} person(s) created by this batch will be kept:
                  </p>
                  <ul className="list-disc pl-5 text-xs">
                    {Object.entries(reasons).map(([reason, rows]) => (
                      <li key={reason}>
                        {KEEP_REASON_TEXT[reason] || reason} — row(s){" "}
                        {rows.slice(0, 20).join(", ")}
                        {rows.length > 20 ? ` and ${rows.length - 20} more` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.updated > 0 && (
                <p className="text-xs">
                  {plan.updated} row(s) updated people who were already in the
                  records. Their earlier details were not stored, so those
                  changes are not reverted; check them by hand if needed (rows{" "}
                  {plan.updated_rows.slice(0, 20).join(", ")}
                  {plan.updated_rows.length > 20 ? " …" : ""}).
                </p>
              )}
              {nothingToDo && (
                <p className="text-xs">Nothing from this import can be removed.</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
