"use client";

import { useEffect, useState, useCallback } from "react";
import { FaHistory, FaSearch, FaDownload, FaTrash, FaTimes } from "react-icons/fa";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const intervals = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "min", secs: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) return `${count} ${i.label}${count > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

const ACTION_COLORS = {
  LOGIN: "text-green-600 bg-green-50",
  LOGOUT: "text-gray-600 bg-gray-50",
  LOGIN_FAILED: "text-red-600 bg-red-50",
  CREATE: "text-blue-600 bg-blue-50",
  UPDATE: "text-yellow-600 bg-yellow-50",
  DELETE: "text-red-600 bg-red-50",
  PROFILE_UPDATE: "text-blue-600 bg-blue-50",
  EVENT_CREATE: "text-purple-600 bg-purple-50",
  EVENT_UPDATE: "text-yellow-600 bg-yellow-50",
  EVENT_DELETE: "text-red-600 bg-red-50",
  EVENT_CANCEL: "text-red-600 bg-red-50",
  EVENT_REGISTER: "text-indigo-600 bg-indigo-50",
  CHANGE_PASSWORD: "text-orange-600 bg-orange-50",
  RESET_PASSWORD: "text-red-600 bg-red-50",
  PROFILE_UPDATE: "text-blue-600 bg-blue-50",
  LOGIN_FAILED: "text-red-600 bg-red-50",
  REGISTER: "text-green-600 bg-green-50",
  LOGOUT: "text-gray-600 bg-gray-50",
  ROLE_CHANGE: "text-purple-600 bg-purple-50",
  USER_DELETE: "text-red-700 bg-red-100",
  STATUS_CHANGE: "text-orange-600 bg-orange-50",
  PROFILE_CREATE: "text-blue-600 bg-blue-50",
  PROFILE_BULK_DELETE: "text-red-700 bg-red-100",

  GFP_CREATE: "text-cyan-600 bg-cyan-50",
  GFP_UPDATE: "text-cyan-600 bg-cyan-50",
  GFP_MEMBER_ADD: "text-cyan-600 bg-cyan-50",
  GFP_MEMBER_REMOVE: "text-cyan-600 bg-cyan-50",
  GPB_CREATE: "text-green-600 bg-green-50",
  GPB_UPDATE: "text-green-600 bg-green-50",
  GPB_DELETE: "text-red-700 bg-red-100",
  GPB_STATUS: "text-green-600 bg-green-50",
  GPB_COMMENT: "text-gray-600 bg-gray-50",
  GPB_COMMENT_DELETE: "text-red-600 bg-red-50",
  GAA_BUDGET_CREATE: "text-yellow-600 bg-yellow-50",
  GAA_BUDGET_UPDATE: "text-yellow-600 bg-yellow-50",
  GAA_BUDGET_DELETE: "text-red-700 bg-red-100",
  OFFICIAL_CREATE: "text-orange-600 bg-orange-50",
  OFFICIAL_UPDATE: "text-orange-600 bg-orange-50",
  OFFICIAL_DELETE: "text-red-700 bg-red-100",
  PROJECT_CREATE: "text-teal-600 bg-teal-50",
  PROJECT_UPDATE: "text-yellow-600 bg-yellow-50",
  PROJECT_DELETE: "text-red-700 bg-red-100",
  PROJECT_BULK_DELETE: "text-red-700 bg-red-100",
  PROJECT_COMMENT: "text-gray-600 bg-gray-50",
  PROJECT_COMMENT_DELETE: "text-red-600 bg-red-50",
  EVENT_PARTICIPATE: "text-indigo-600 bg-indigo-50",
  ACCOMPLISHMENT_CREATE: "text-pink-600 bg-pink-50",
  ACCOMPLISHMENT_UPDATE: "text-pink-600 bg-pink-50",
  ROLE_CHANGE: "text-purple-600 bg-purple-50",
  STATUS_CHANGE: "text-orange-600 bg-orange-50",
  PROJECT_CREATE: "text-teal-600 bg-teal-50",
  PROJECT_UPDATE: "text-yellow-600 bg-yellow-50",
  PROJECT_COMMENT: "text-gray-600 bg-gray-50",
  APPROVE: "text-green-600 bg-green-50",
  REJECT: "text-red-600 bg-red-50",
  EXPORT: "text-indigo-600 bg-indigo-50",
  IMPORT: "text-purple-600 bg-purple-50",
  INTEGRATION_SYNC: "text-cyan-600 bg-cyan-50",
  NOTIFICATION_READ: "text-gray-600 bg-gray-50",
  OTHER: "text-gray-500 bg-gray-100",
};

const SEVERITY_COLORS = {
  info: "text-blue-600 bg-blue-50",
  warning: "text-yellow-600 bg-yellow-50",
  error: "text-red-600 bg-red-50",
  critical: "text-red-700 bg-red-100",
};

const RESOURCE_COLORS = {
  user: "text-purple-600 bg-purple-50",
  profile: "text-blue-600 bg-blue-50",
  event: "text-indigo-600 bg-indigo-50",
  project: "text-teal-600 bg-teal-50",
  gpb: "text-green-600 bg-green-50",
  gfps: "text-cyan-600 bg-cyan-50",
  gaa_budget: "text-yellow-600 bg-yellow-50",
  university_official: "text-orange-600 bg-orange-50",
  notification: "text-gray-600 bg-gray-50",
  integration: "text-pink-600 bg-pink-50",
  system: "text-gray-500 bg-gray-100",
};

function getSeverityBadge(severity) {
  const colors = SEVERITY_COLORS[severity] || "text-gray-600 bg-gray-100";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${colors}`}>
      {severity || "info"}
    </span>
  );
}

function getResourceBadge(resourceType) {
  if (!resourceType || resourceType === "system") return null;
  const colors = RESOURCE_COLORS[resourceType] || "text-gray-600 bg-gray-100";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colors}`}>
      {resourceType}
    </span>
  );
}

function getActionBadge(action) {
  const colors = ACTION_COLORS[action] || "text-gray-600 bg-gray-100";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {action}
    </span>
  );
}

export default function ActivityLogsContent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchUserId, setSearchUserId] = useState("");
  const [searchAction, setSearchAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (searchUserId) params.set("user_id", searchUserId);
      if (searchAction) params.set("action", searchAction);
      if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("to", new Date(dateTo).toISOString());

      const res = await fetch(`/api/activity?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 403) throw new Error("Forbidden: Admin access required");
        throw new Error("Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.activities || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchUserId, searchAction, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activity?id=${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      setDeleteId(null);
      fetchLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    const headers = ["Timestamp", "User ID", "Action", "Severity", "Resource", "Description", "IP Address", "User Agent"];
    const rows = logs.map((l) => [
      formatDate(l.createdAt),
      l.user_id,
      l.action,
      l.severity || "info",
      l.resource_type || "",
      l.description || "",
      l.ip_address || "",
      l.user_agent || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearchUserId("");
    setSearchAction("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = searchUserId || searchAction || dateFrom || dateTo;

  return (
    <div className="mt-20 px-4 md:px-8 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaHistory className="text-2xl text-blue-600" />
          <h1 className="text-2xl font-bold">Activity Logs</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{total} total entries</span>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User ID</label>
            <input
              type="text"
              value={searchUserId}
              onChange={(e) => { setSearchUserId(e.target.value); setPage(1); }}
              placeholder="Filter by user ID..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={searchAction}
              onChange={(e) => { setSearchAction(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="REGISTER">REGISTER</option>
              <option value="ROLE_CHANGE">ROLE_CHANGE</option>
              <option value="USER_DELETE">USER_DELETE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="RESET_PASSWORD">RESET_PASSWORD</option>
              <option value="CHANGE_PASSWORD">CHANGE_PASSWORD</option>
              <option value="PROFILE_CREATE">PROFILE_CREATE</option>
              <option value="PROFILE_UPDATE">PROFILE_UPDATE</option>
              <option value="PROFILE_BULK_DELETE">PROFILE_BULK_DELETE</option>
              <option value="GFP_CREATE">GFP_CREATE</option>
              <option value="GFP_UPDATE">GFP_UPDATE</option>
              <option value="GFP_MEMBER_ADD">GFP_MEMBER_ADD</option>
              <option value="GFP_MEMBER_REMOVE">GFP_MEMBER_REMOVE</option>
              <option value="GPB_CREATE">GPB_CREATE</option>
              <option value="GPB_UPDATE">GPB_UPDATE</option>
              <option value="GPB_DELETE">GPB_DELETE</option>
              <option value="GPB_STATUS">GPB_STATUS</option>
              <option value="GPB_COMMENT">GPB_COMMENT</option>
              <option value="GPB_COMMENT_DELETE">GPB_COMMENT_DELETE</option>
              <option value="GAA_BUDGET_CREATE">GAA_BUDGET_CREATE</option>
              <option value="GAA_BUDGET_UPDATE">GAA_BUDGET_UPDATE</option>
              <option value="GAA_BUDGET_DELETE">GAA_BUDGET_DELETE</option>
              <option value="OFFICIAL_CREATE">OFFICIAL_CREATE</option>
              <option value="OFFICIAL_UPDATE">OFFICIAL_UPDATE</option>
              <option value="OFFICIAL_DELETE">OFFICIAL_DELETE</option>
              <option value="PROJECT_CREATE">PROJECT_CREATE</option>
              <option value="PROJECT_UPDATE">PROJECT_UPDATE</option>
              <option value="PROJECT_DELETE">PROJECT_DELETE</option>
              <option value="PROJECT_COMMENT">PROJECT_COMMENT</option>
              <option value="PROJECT_COMMENT_DELETE">PROJECT_COMMENT_DELETE</option>
              <option value="EVENT_CREATE">EVENT_CREATE</option>
              <option value="EVENT_UPDATE">EVENT_UPDATE</option>
              <option value="EVENT_CANCEL">EVENT_CANCEL</option>
              <option value="EVENT_DELETE">EVENT_DELETE</option>
              <option value="EVENT_PARTICIPATE">EVENT_PARTICIPATE</option>
              <option value="ACCOMPLISHMENT_CREATE">ACCOMPLISHMENT_CREATE</option>
              <option value="ACCOMPLISHMENT_UPDATE">ACCOMPLISHMENT_UPDATE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={handleResetFilters}
            className="mt-3 flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          >
            <FaTimes /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading activity logs...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No activity logs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap" title={formatDate(log.createdAt)}>
                    <span className="text-xs text-gray-500">{timeAgo(log.createdAt)}</span>
                    <br />
                    <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-600">{log.user_id}</span>
                  </td>
                  <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3">{getSeverityBadge(log.severity)}</td>
                  <td className="px-4 py-3">{getResourceBadge(log.resource_type)}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={log.description}>
                    {log.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.ip_address || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setDeleteId(log._id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete log"
                    >
                      <FaTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} entries)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-medium mb-2">Delete Activity Log</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this log entry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}