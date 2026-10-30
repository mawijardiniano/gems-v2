"use client";

import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";
import {
  SECTION,
  sectionRowCount,
} from "../gender-statistics/components/reportSections.js";

/* Read-only preview of a quick report, drawn from the same section list the PDF
   generator renders (see reportSections.js). Because both renderers walk one
   list, the preview cannot drift from the downloaded PDF: headings,
   paragraphs, findings and tables all come from the same source of truth. */

const NUMERIC = /^-?[\d,]+(\.\d+)?%?$|^[-+]?[\d,]+ pp$/;

/* Mirrors the PDF's alignment rule: the first column is the row label, and the
   remaining columns are statistics when their cells look numeric. */
function isNumericColumn(body) {
  const sample = body.filter((row) => row[0] != null).slice(0, 6);
  if (!sample.length) return false;
  return sample.every((row) => {
    const cell = row[1];
    return cell == null || cell === "" || NUMERIC.test(String(cell).trim());
  });
}

const isSummaryRow = (row) => /^(total|average)/i.test(String(row?.[0] ?? ""));

function TableSection({ item }) {
  const { head = [], body = [], emptyLabel } = item;
  const statFrom = head.length && isNumericColumn(body) ? 1 : head.length;

  if (!sectionRowCount(item)) {
    return (
      <p className="py-2 text-sm italic text-gray-500">
        {emptyLabel || "No data available."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            {head.map((label, i) => (
              <th
                key={i}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 ${
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
            const isTotal = isSummaryRow(row);
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
                    className={[
                      "px-3 py-2 align-top",
                      c >= statFrom
                        ? "whitespace-nowrap text-right tabular-nums"
                        : "text-left",
                      isTotal ? "font-semibold text-gray-900" : "text-gray-700",
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function Section({ item }) {
  if (!item) return null;

  if (item.type === SECTION.HEADING) {
    return (
      <h3 className="mt-5 mb-2 text-sm font-bold text-gray-900">
        {item.text}
      </h3>
    );
  }

  if (item.type === SECTION.PARAGRAPH) {
    return (
      <p className="mb-3 text-sm leading-relaxed text-gray-700">{item.text}</p>
    );
  }

  if (item.type === SECTION.BULLETS) {
    if (!item.items?.length) return null;
    return (
      <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
        {item.items.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    );
  }

  if (item.type !== SECTION.TABLE) return null;

  return (
    <div className="mb-4">
      {item.title ? (
        <h3 className="mt-5 mb-2 text-sm font-bold text-gray-900">
          {item.title}
        </h3>
      ) : null}
      <TableSection item={item} />
    </div>
  );
}

export default function ReportSectionsPreview({
  title,
  sections,
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

  if (!Array.isArray(sections)) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-report-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="quick-report-preview-title"
              className="text-base font-semibold text-gray-900"
            >
              {title} — Preview
            </h2>
            {scope ? (
              <p className="mt-0.5 text-xs text-gray-500">{scope}</p>
            ) : null}
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
          {sections.length === 0 ? (
            <p className="py-10 text-center text-sm italic text-gray-500">
              No records match the selected filters.
            </p>
          ) : (
            sections.map((item, i) => <Section key={i} item={item} />)
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-500">
            Preview of the PDF — the download contains the same sections.
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
