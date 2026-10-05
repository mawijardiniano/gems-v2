/**
 * GPB status rules.
 *
 * A GPB is draft, approved or disapproved, and an approved plan is final: it may
 * be disapproved, but it is never sent back to draft. Approving is the point the
 * plan stops being a working document, so the Draft option disappears from the
 * status modal and the API refuses it — a stale tab posting the old value cannot
 * undo an approval. A disapproved plan may still return to draft, since its
 * reason usually needs another round.
 *
 * Kept in one place so the workspace UI and the API can never disagree.
 */

export const GPB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "disapproved", label: "Disapproved" },
];

const normalizeGpbStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

/* The options the status modal may offer for a plan currently in `current`.
   An unknown or missing value degrades to every option, so nothing is ever
   locked by accident. */
export const gpbStatusOptions = (current) => {
  if (normalizeGpbStatus(current) === "approved") {
    return GPB_STATUSES.filter((status) => status.value !== "draft");
  }
  return GPB_STATUSES;
};

/* Whether `next` may be applied to a plan currently in `current`. */
export const canSetGpbStatus = (current, next) => {
  const wanted = normalizeGpbStatus(next);
  return gpbStatusOptions(current).some((status) => status.value === wanted);
};