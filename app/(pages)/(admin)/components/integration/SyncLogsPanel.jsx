"use client";

import { useState } from "react";

const ACTION_LABELS = {
  validate: "Validation",
  approve: "Records approved",
  reject: "Records rejected",
  migrate: "Migration",
  create: "Profile created",
  update: "Profile updated",
  skip: "Record skipped",
  fail: "Action failed",
  sync: "HRMIS data sync",
};

const LEVEL_STYLES = {
  info: { dot: "bg-green-500", title: "text-green-700" },
  warn: { dot: "bg-amber-500", title: "text-amber-700" },
  error: { dot: "bg-red-500", title: "text-red-700" },
};

const GENERIC_KEY_SKIP = new Set(["dedupe_key", "staging_record_id"]);
const HANDLED_KEYS = new Set([
  "errors",
  "school_year",
  "semester",
  "account_action",
  "account_username",
  "fetched",
  "staged",
  "duplicates_flagged",
  "error",
]);

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function humanizeField(field) {
  const leaf = String(field).split(".").pop();
  return humanizeKey(leaf);
}

function FriendlyDetails({ details }) {
  if (!details || typeof details !== "object") return null;
  const lines = [];

  if (Array.isArray(details.errors) && details.errors.length > 0) {
    for (const err of details.errors) {
      const label = err.field ? `${humanizeField(err.field)}: ` : "";
      lines.push(`• ${label}${err.message || err.code || "Validation issue"}`);
    }
  }

  if (details.school_year || details.semester) {
    lines.push(
      `• Term: ${details.school_year || "?"} · ${details.semester || "?"}`,
    );
  }

  if (details.account_username) {
    const verb =
      details.account_action === "created"
        ? "Account created for this person: "
        : details.account_action === "exists"
          ? "Account already exists: "
          : "Account: ";
    lines.push(`• ${verb}${details.account_username}`);
  }

  if (typeof details.fetched === "number") {
    lines.push(
      `• Fetched: ${details.fetched} rows · Staged: ${
        details.staged ?? "?"
      } · Duplicates flagged: ${details.duplicates_flagged ?? 0}`,
    );
  }

  if (details.error) {
    lines.push(`• Reason: ${details.error}`);
  }

  for (const [key, value] of Object.entries(details)) {
    if (
      HANDLED_KEYS.has(key) ||
      GENERIC_KEY_SKIP.has(key) ||
      typeof value === "object"
    ) {
      continue;
    }
    lines.push(`• ${humanizeKey(key)}: ${String(value)}`);
  }

  if (lines.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5 text-xs text-gray-600">
      {lines.map((line, idx) => (
        <div key={idx}>{line}</div>
      ))}
    </div>
  );
}

function TechnicalDetails({ details }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-[11px] text-gray-400 underline hover:text-gray-600"
      >
        {open ? "Hide technical details" : "Technical details"}
      </button>
      {open && (
        <pre className="mt-1 rounded bg-gray-50 border border-gray-200 p-1.5 text-[10px] text-gray-600 whitespace-pre-wrap">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function SyncLogsPanel({ logs, loading, records = [] }) {
  const recordById = new Map(
    records.map((r) => [String(r._id), r]),
  );

  return (
    <div className="max-h-80 overflow-auto border border-gray-200 rounded p-2 space-y-2">
      {logs.map((log) => {
        const level = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
        const rawId = log.staging_record_id;
        const recordId =
          rawId && typeof rawId === "object" && rawId._id
            ? String(rawId._id)
            : rawId
              ? String(rawId)
              : null;
        const rec = recordId ? recordById.get(recordId) : null;
        const personName = rec
          ? [
              rec.mapped_payload?.personal?.last_name,
              rec.mapped_payload?.personal?.first_name,
            ]
              .filter(Boolean)
              .join(", ")
          : "";
        const rowContext = rec
          ? `Row ${rec.row_number}${personName ? ` — ${personName}` : ""}`
          : null;

        return (
          <div key={log._id} className="border border-gray-100 rounded p-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${level.dot}`}
                title={log.level}
              />
              <span
                className={`text-xs font-semibold ${level.title}`}
              >
                {ACTION_LABELS[log.action] || log.action}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{log.message}</div>
            {rowContext && (
              <div className="text-xs text-gray-600 mt-0.5">{rowContext}</div>
            )}
            <FriendlyDetails details={log.details} />
            <div className="text-[11px] text-gray-500 mt-1">
              By {log.executed_by_username || "Unknown"} ·{" "}
              {new Date(log.executed_at || log.createdAt).toLocaleString()}
            </div>
            {log.details && Object.keys(log.details).length > 0 && (
              <TechnicalDetails details={log.details} />
            )}
          </div>
        );
      })}
      {logs.length === 0 && (
        <p className="text-xs text-gray-500">
          {loading ? "Loading..." : "No logs yet"}
        </p>
      )}
    </div>
  );
}
