"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FaDatabase,
  FaCloudUploadAlt,
  FaCog,
  FaBoxOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaSyncAlt,
} from "react-icons/fa";
import StatusBadge, {
  BATCH_STATUS_STYLES,
} from "@/app/(pages)/(admin)/components/integration/statuses";

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

const LEVEL_DOT = {
  info: "bg-green-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
};

const SOURCE_TYPE_LABELS = {
  hrmis_api: "HRMIS API",
  manual_upload: "Manual Upload",
};

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IctuDashboard() {
  const [batches, setBatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/integration/batches", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to load batches");
      }
      const list = data.data || [];
      setBatches(list);

      // Recent sync logs from the 3 most recent batches.
      const recent = list.slice(0, 3);
      const logResults = await Promise.all(
        recent.map((b) =>
          fetch(`/api/integration/batches/${b._id}/logs`, {
            credentials: "include",
          })
            .then((r) => (r.ok ? r.json() : { data: [] }))
            .catch(() => ({ data: [] })),
        ),
      );
      const merged = logResults
        .flatMap((r) => r.data || [])
        .sort(
          (a, b) =>
            new Date(b.executed_at || b.createdAt) -
            new Date(a.executed_at || a.createdAt),
        )
        .slice(0, 8);
      setLogs(merged);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const stats = useMemo(() => {
    const byStatus = {
      pending: 0,
      validating: 0,
      ready: 0,
      migrating: 0,
      completed: 0,
      failed: 0,
    };
    let staged = 0;
    let approved = 0;
    let migrated = 0;
    let duplicates = 0;

    for (const b of batches) {
      if (byStatus[b.status] !== undefined) byStatus[b.status] += 1;
      const t = b.totals || {};
      staged += t.fetched || 0;
      approved += t.approved || 0;
      migrated += (t.migrated_created || 0) + (t.migrated_updated || 0);
      duplicates += t.duplicates || 0;
    }
    return { byStatus, staged, approved, migrated, duplicates };
  }, [batches]);

  const recentBatches = useMemo(() => batches.slice(0, 6), [batches]);

  const manualUploads = useMemo(
    () =>
      batches
        .filter((b) => b.source_type === "manual_upload")
        .slice(0, 5),
    [batches],
  );

  const statCards = [
    {
      label: "Total Batches",
      value: batches.length,
      icon: <FaDatabase className="text-blue-600" />,
      color: "bg-blue-50",
    },
    {
      label: "In Progress",
      value: stats.byStatus.pending + stats.byStatus.validating + stats.byStatus.migrating,
      icon: <FaHourglassHalf className="text-amber-600" />,
      color: "bg-amber-50",
    },
    {
      label: "Ready to Migrate",
      value: stats.byStatus.ready,
      icon: <FaBoxOpen className="text-indigo-600" />,
      color: "bg-indigo-50",
    },
    {
      label: "Completed",
      value: stats.byStatus.completed,
      icon: <FaCheckCircle className="text-emerald-600" />,
      color: "bg-emerald-50",
    },
    {
      label: "Failed",
      value: stats.byStatus.failed,
      icon: <FaExclamationTriangle className="text-red-600" />,
      color: "bg-red-50",
    },
  ];

  const recordCards = [
    { label: "Records Staged", value: stats.staged },
    { label: "Records Approved", value: stats.approved },
    { label: "Records Migrated", value: stats.migrated },
    { label: "Duplicates Flagged", value: stats.duplicates },
  ];

  const quickActions = [
    {
      label: "Data Integration",
      desc: "Fetch, validate, and migrate HRMIS data",
      href: "/ictu-director/integration",
      icon: <FaDatabase size={20} />,
      color: "bg-blue-600",
    },
    {
      label: "Manual Upload",
      desc: "Upload CSV/Excel files to staging",
      href: "/ictu-director/manual-upload",
      icon: <FaCloudUploadAlt size={20} />,
      color: "bg-purple-600",
    },
    {
      label: "Admin Settings",
      desc: "Manage active term and security",
      href: "/ictu-director/settings",
      icon: <FaCog size={20} />,
      color: "bg-gray-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Data Operations Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Overview of data integration batches, manual uploads, and sync activity
            </p>
          </div>
          <button
            onClick={loadBatches}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900 text-white text-sm font-medium hover:bg-purple-800 transition-colors disabled:opacity-50"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all"
            >
              <span
                className={`w-11 h-11 rounded-lg flex items-center justify-center text-white ${action.color}`}
              >
                {action.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  {action.label}
                </span>
                <span className="block text-xs text-gray-500">
                  {action.desc}
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* Batch status cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center ${card.color}`}
              >
                {card.icon}
              </span>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {loading ? "…" : card.value}
              </p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Record totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {recordCards.map((card) => (
            <div
              key={card.label}
              className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              <p className="text-xl font-bold text-gray-900">
                {loading ? "…" : card.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent batches */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Batches
              </h2>
              <Link
                href="/ictu-director/integration"
                className="text-xs font-medium text-purple-700 hover:text-purple-900"
              >
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="p-5 text-sm text-gray-500">Loading batches…</div>
            ) : recentBatches.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">
                No integration batches yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentBatches.map((b) => (
                  <li
                    key={b._id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {b.source_name ||
                          SOURCE_TYPE_LABELS[b.source_type] ||
                          b.source_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {SOURCE_TYPE_LABELS[b.source_type] || b.source_type} ·{" "}
                        {formatDateTime(b.started_at || b.createdAt)} · by{" "}
                        {b.created_by_username || "Unknown"}
                      </p>
                    </div>
                    <StatusBadge
                      status={b.status}
                      styles={BATCH_STATUS_STYLES}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent sync logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Sync Activity
              </h2>
            </div>
            {loading ? (
              <div className="p-5 text-sm text-gray-500">Loading activity…</div>
            ) : logs.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">
                No sync activity recorded yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <li key={log._id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          LEVEL_DOT[log.level] || LEVEL_DOT.info
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {ACTION_LABELS[log.action] || log.action}
                        </p>
                        <p className="text-xs text-gray-600">{log.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          By {log.executed_by_username || "Unknown"} ·{" "}
                          {formatDateTime(log.executed_at || log.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Manual upload activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Manual Upload Activity
            </h2>
            <Link
              href="/ictu-director/manual-upload"
              className="text-xs font-medium text-purple-700 hover:text-purple-900"
            >
              New upload →
            </Link>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-gray-500">Loading uploads…</div>
          ) : manualUploads.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">
              No manual uploads recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {manualUploads.map((b) => (
                <li
                  key={b._id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {b.source_name || b.source_file_key || "Untitled upload"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(b.started_at || b.createdAt)} · by{" "}
                      {b.created_by_username || "Unknown"}
                    </p>
                  </div>
                  <StatusBadge
                    status={b.status}
                    styles={BATCH_STATUS_STYLES}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}