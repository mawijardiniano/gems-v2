"use client";

/* Shown when a page's data request fails. Without it the page kept its
   loading skeleton (dashboards) or showed an empty list, which reads as
   "no data" rather than "could not load". */
export default function LoadError({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger ring-1 ring-red-600/20"
    >
      <span>{message || "Could not load data."}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-white px-3 py-1 text-xs font-medium text-danger ring-1 ring-red-600/30 hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
