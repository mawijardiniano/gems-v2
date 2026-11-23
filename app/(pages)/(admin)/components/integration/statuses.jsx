"use client";

export const RECORD_STATUS_STYLES = {
  pending: "bg-muted text-fg-3",
  valid: "bg-green-100 text-success",
  invalid: "bg-red-100 text-danger",
  approved: "bg-secondary-100 text-secondary-700",
  rejected: "bg-orange-100 text-orange-700",
  duplicate: "bg-yellow-100 text-warning",
  migrated: "bg-emerald-100 text-success",
  failed: "bg-red-100 text-danger",
};

export const BATCH_STATUS_STYLES = {
  pending: "bg-muted text-fg-3",
  validating: "bg-secondary-100 text-secondary-700",
  ready: "bg-secondary-100 text-secondary-700",
  migrating: "bg-secondary-100 text-secondary-700",
  completed: "bg-emerald-100 text-success",
  failed: "bg-red-100 text-danger",
};

export default function StatusBadge({ status, styles = RECORD_STATUS_STYLES }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded inline-block ${
        styles[status] || "bg-muted text-fg-3"
      }`}
    >
      {status || "-"}
    </span>
  );
}

export function MessageBanner({ message }) {
  if (!message) return null;
  const style =
    message.type === "error"
      ? "bg-danger-subtle border-red-300 text-danger"
      : message.type === "success"
        ? "bg-success-subtle border-green-300 text-success"
        : "bg-slate-100 border-slate-300 text-slate-700";
  return (
    <div className={`border rounded px-4 py-3 text-sm ${style}`}>
      {message.text}
    </div>
  );
}