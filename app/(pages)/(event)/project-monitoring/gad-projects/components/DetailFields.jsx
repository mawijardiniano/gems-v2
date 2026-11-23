"use client";

import React from "react";
import { FaExclamationTriangle, FaPaperclip, FaPen } from "react-icons/fa";
import { getEvidenceProxyUrl } from "../../lib/projectView";

/* Small building blocks shared by the GAD page's cards and detail tabs. */

export function StatCard({ icon: Icon, iconClass, label, value, sub, children }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </div>
  );
}

/* A span (not a <p>) so it can also sit inside a <label>. */
export const FieldLabel = ({ children, className = "" }) => (
  <span
    className={`block text-2xs font-semibold uppercase tracking-wider text-gray-500 ${className}`}
  >
    {children}
  </span>
);

export function DetailRow({ label, value }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="text-sm text-gray-800 break-words">{value || "—"}</p>
    </div>
  );
}

/* A numbered list; `descriptions` are optional index-paired notes shown
   under each item (GAD activity descriptions). */
export function DetailList({ label, items, descriptions }) {
  const list = (items || []).filter(Boolean);
  const notes = Array.isArray(descriptions) ? descriptions : [];
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {list.length > 0 ? (
        <ol className="list-decimal list-inside space-y-0.5 text-sm text-gray-800">
          {list.map((it, i) => (
            <li key={i}>
              {it}
              {notes[i] ? <span className="mt-0.5 block">{notes[i]}</span> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-gray-800">—</p>
      )}
    </div>
  );
}

export const StatusPill = ({ meta, className = "text-xs" }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${className} ${meta.classes}`}
  >
    {meta.label}
  </span>
);

export const ErrorNote = ({ children }) => (
  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
    <FaExclamationTriangle className="h-3 w-3 mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

/* The rose "Update"/"Set" button on a detail section. */
export const EditButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 shrink-0"
  >
    <FaPen size={10} />
    {children}
  </button>
);

export const SaveCancel = ({ saving, onSave, onCancel }) => (
  <div className="flex items-center justify-end gap-2">
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? "Saving…" : "Save"}
    </button>
  </div>
);

export const inputClass =
  "w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300";

/* An uploaded file as a chip linking to the file proxy. */
export function FileChip({ file, fallbackName, size = "md" }) {
  const url = getEvidenceProxyUrl(file);
  const name = file?.name || fallbackName;
  const small = size === "sm";
  const base = small
    ? "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-md border"
    : "inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border";
  const icon = <FaPaperclip className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />;
  const label = (
    <span className={small ? "max-w-[120px] truncate" : "max-w-[160px] truncate"}>
      {name}
    </span>
  );
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      className={`${base} text-secondary-700 bg-secondary-50 border-secondary-200 hover:bg-secondary-100 transition`}
    >
      {icon}
      {label}
    </a>
  ) : (
    <span className={`${base} text-gray-600 bg-gray-50 border-gray-200`}>
      {icon}
      {label}
    </span>
  );
}
