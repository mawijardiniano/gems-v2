"use client";

import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";

/* Read-only preview of the Gender Profile Report as an in-browser table.
   Renders whatever buildProfileTable() returns — head/body are plain data, so
   any field combination works without special-casing. The last `statColumns`
   columns are numeric and are right-aligned like they are in the PDF. */

const cellClass = (isStat, isTotal) =>
  [
    "px-3 py-2 align-top whitespace-nowrap",
    isStat ? "text-right tabular-nums" : "text-left",
    isTotal ? "font-semibold text-gray-900" : "text-gray-700",
  ].join(" ");

export default function ReportTablePreview({
  table,
  scope,
  onClose,
  onDownload,
  downloading = false,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!table) return null;

  const { mode, head, body, statColumns, totalRowIndex } = table;
  const statFrom = head.length - statColumns;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="report-preview-title"
              className="text-base font-semibold text-gray-900"
            >
              Gender Profile Report — Preview
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {scope}
              {mode === "masterlist" && (
                <>
                  {" • "}
                  one row per person
                </>
              )}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {body.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500 italic">
              No records match the selected filters.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200">
                  {head.map((label, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 ${
                        i >= statFrom ? "text-right" : "text-left"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, r) => {
                  const isTotal = r === totalRowIndex;
                  return (
                    <tr
                      key={r}
                      className={
                        isTotal
                          ? "border-t-2 border-gray-300 bg-gray-50"
                          : "border-b border-gray-100 hover:bg-secondary-50/40"
                      }
                    >
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className={cellClass(c >= statFrom, isTotal)}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-500">
            Built from the sample dataset — the downloaded PDF is marked “Sample
            data”.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="rounded-lg bg-secondary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
