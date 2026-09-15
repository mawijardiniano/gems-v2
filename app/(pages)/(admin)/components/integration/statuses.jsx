"use client";

export const RECORD_STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700",
  valid: "bg-green-100 text-green-700",
  invalid: "bg-red-100 text-red-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-orange-100 text-orange-700",
  duplicate: "bg-yellow-100 text-yellow-700",
  migrated: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export const BATCH_STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700",
  validating: "bg-amber-100 text-amber-700",
  ready: "bg-blue-100 text-blue-700",
  migrating: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status, styles = RECORD_STATUS_STYLES }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded inline-block ${
        styles[status] || "bg-gray-100 text-gray-700"
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
      ? "bg-red-50 border-red-300 text-red-700"
      : message.type === "success"
        ? "bg-green-50 border-green-300 text-green-700"
        : "bg-slate-100 border-slate-300 text-slate-700";
  return (
    <div className={`border rounded px-4 py-3 text-sm ${style}`}>
      {message.text}
    </div>
  );
}