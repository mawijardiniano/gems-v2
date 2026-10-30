"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { FaHistory, FaSearch, FaDownload, FaTimes, FaShieldAlt, FaChevronRight } from "react-icons/fa";

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
  CREATE: "text-secondary-600 bg-secondary-50",
  UPDATE: "text-yellow-600 bg-yellow-50",
  DELETE: "text-red-600 bg-red-50",
  PROFILE_UPDATE: "text-secondary-600 bg-secondary-50",
  EVENT_CREATE: "text-secondary-600 bg-secondary-50",
  EVENT_UPDATE: "text-yellow-600 bg-yellow-50",
  EVENT_DELETE: "text-red-600 bg-red-50",
  EVENT_CANCEL: "text-red-600 bg-red-50",
  EVENT_REGISTER: "text-secondary-600 bg-secondary-50",
  CHANGE_PASSWORD: "text-orange-600 bg-orange-50",
  RESET_PASSWORD: "text-red-600 bg-red-50",
  REGISTER: "text-green-600 bg-green-50",
  ROLE_CHANGE: "text-secondary-600 bg-secondary-50",
  USER_DELETE: "text-red-700 bg-red-100",
  STATUS_CHANGE: "text-orange-600 bg-orange-50",
  PROFILE_CREATE: "text-secondary-600 bg-secondary-50",
  PROFILE_BULK_DELETE: "text-red-700 bg-red-100",

  GFP_CREATE: "text-cyan-600 bg-cyan-50",
  GFP_UPDATE: "text-cyan-600 bg-cyan-50",
  GFP_MEMBER_ADD: "text-cyan-600 bg-cyan-50",
  GFP_MEMBER_REMOVE: "text-cyan-600 bg-cyan-50",
  GFP_COPY_FORWARD: "text-cyan-600 bg-cyan-50",
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
  OFFICIAL_ASSIGN: "text-orange-600 bg-orange-50",
  OFFICIAL_VACATE: "text-red-700 bg-red-100",
  OFFICIAL_COPY_FORWARD: "text-orange-600 bg-orange-50",
  OFFICIAL_ASSIGN_LEGACY: "text-orange-600 bg-orange-50",
  PROJECT_CREATE: "text-teal-600 bg-teal-50",
  PROJECT_UPDATE: "text-yellow-600 bg-yellow-50",
  PROJECT_DELETE: "text-red-700 bg-red-100",
  PROJECT_BULK_DELETE: "text-red-700 bg-red-100",
  PROJECT_COMMENT: "text-gray-600 bg-gray-50",
  PROJECT_COMMENT_DELETE: "text-red-600 bg-red-50",
  EVENT_PARTICIPATE: "text-secondary-600 bg-secondary-50",
  ACCOMPLISHMENT_CREATE: "text-pink-600 bg-pink-50",
  ACCOMPLISHMENT_UPDATE: "text-pink-600 bg-pink-50",
  APPROVE: "text-green-600 bg-green-50",
  REJECT: "text-red-600 bg-red-50",
  EXPORT: "text-secondary-600 bg-secondary-50",
  IMPORT: "text-secondary-600 bg-secondary-50",
  INTEGRATION_SYNC: "text-cyan-600 bg-cyan-50",
  NOTIFICATION_READ: "text-gray-600 bg-gray-50",
  PII_ACCESS: "text-orange-700 bg-orange-100",
  AUDIT_REDACT: "text-red-700 bg-red-100",
  IMPORT_BATCH_FETCH: "text-pink-600 bg-pink-50",
  IMPORT_BATCH_FETCH_FAILED: "text-red-600 bg-red-50",
  IMPORT_BATCH_VALIDATE: "text-pink-600 bg-pink-50",
  IMPORT_BATCH_APPROVE: "text-pink-600 bg-pink-50",
  IMPORT_BATCH_REJECT: "text-red-600 bg-red-50",
  IMPORT_BATCH_DELETE: "text-red-700 bg-red-100",
  OTHER: "text-gray-500 bg-gray-100",
};

const SEVERITY_COLORS = {
  info: "text-secondary-600 bg-secondary-50",
  warning: "text-yellow-600 bg-yellow-50",
  error: "text-red-600 bg-red-50",
  critical: "text-red-700 bg-red-100",
};

const RESOURCE_COLORS = {
  user: "text-secondary-600 bg-secondary-50",
  profile: "text-secondary-600 bg-secondary-50",
  event: "text-secondary-600 bg-secondary-50",
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

/* How an actor is identified in the table.
 *
 * The Mongo ObjectId is deliberately NOT the headline. It is the least
 * meaningful part of "who did this" for a human auditor, and it used to be the
 * large text with the readable identity underneath — backwards for the only
 * question this column exists to answer.
 *
 * `Admin · Admin` was also happening: the old code joined username and role
 * unconditionally, so when a user's username is the same word as their role the
 * column repeated itself. Duplicates are dropped here.
 */
function describeActor(log) {
  const username = log.actor?.username || null;
  const role = log.actor?.role || null;
  const name = log.actor?.name || null;

  const primary = name || username || role || null;

  /* Secondary facts, de-duplicated case-insensitively and never repeating the
     primary line. */
  const seen = new Set(primary ? [primary.toLowerCase()] : []);
  const secondary = [];
  for (const value of [username, role]) {
    if (!value) continue;
    const key = String(value).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    secondary.push(value);
  }

  return { primary, secondary, id: log.user_id ? String(log.user_id) : null };
}

/* ── Change history ─────────────────────────────────────────────────────────
 *
 * "PROFILE_UPDATE" tells an auditor that something happened; the field diff
 * tells them what. Without it the log records intent but not effect, and a
 * reviewer cannot answer the only question that matters after a disputed edit:
 * what did the value used to be?
 *
 * Vaulted PII arrives already withheld as "[vaulted]" — the server decides that,
 * not this component. A value of null is rendered as an explicit marker rather
 * than blank, because "cleared" and "never set" read very differently in a
 * dispute and a blank cell conflates them. */
function formatChangeValue(value, redacted) {
  if (redacted) return <span className="italic text-gray-400">[vaulted]</span>;
  if (value === null || value === undefined || value === "") {
    return <span className="italic text-gray-400">(empty)</span>;
  }
  if (typeof value === "object") return <span className="font-mono">{JSON.stringify(value)}</span>;
  return <span className="font-mono">{String(value)}</span>;
}

function ChangeList({ changes }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {changes.map((c, i) => (
        <li key={`${c.field}-${i}`} className="text-xs text-gray-600">
          <span className="font-medium text-gray-700">{c.field}</span>
          {": "}
          <span className="text-red-700 line-through decoration-red-300">
            {formatChangeValue(c.before, c.redacted)}
          </span>
          <span className="mx-1 text-gray-400">→</span>
          <span className="text-green-700">
            {formatChangeValue(c.after, c.redacted)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* One detail row, so the expanded view reads as facts rather than prose. */
function DetailItem({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-xs text-gray-700 break-words">{children}</dd>
    </div>
  );
}

/* The audit substance that does not belong in a table column.
 *
 * The chain hashes are shown here rather than as columns because nobody scans
 * them, but an auditor investigating a single disputed record needs to see that
 * it *is* chained and what its link covers — otherwise the page claims the trail
 * is intact while giving no way to inspect any individual record's part in it.
 */
function LogDetail({ log }) {
  const actor = describeActor(log);
  return (
    <div className="bg-gray-50 border-t px-4 py-3">
      <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2">
        <DetailItem label="Outcome">
          {log.outcome?.result
            ? `${log.outcome.result}${
                log.outcome.status_code ? ` (HTTP ${log.outcome.status_code})` : ""
              }`
            : null}
        </DetailItem>
        <DetailItem label="Module">{log.module}</DetailItem>
        <DetailItem label="Route">{log.route}</DetailItem>
        <DetailItem label="Request ID">{log.request_id}</DetailItem>
        <DetailItem label="Session ID">{log.session_id}</DetailItem>
        <DetailItem label="User agent">{log.user_agent}</DetailItem>

        {/* The chain. A missing hash is not an error to hide here: it is what
            the integrity report counts as unlinked, and a row the writer could
            not link should look different from one it could. */}
        <DetailItem label="Hash (self)">
          {log.hash_self ? (
            <span className="font-mono text-[10px]">{log.hash_self}</span>
          ) : (
            <span className="italic text-amber-700">not linked</span>
          )}
        </DetailItem>
        <DetailItem label="Hash (previous)">
          {log.hash_prev ? (
            <span className="font-mono text-[10px]">{log.hash_prev}</span>
          ) : (
            <span className="italic text-gray-400">none (chain start)</span>
          )}
        </DetailItem>
        <DetailItem label="Record ID">
          {log._id ? <span className="font-mono text-[10px]">{String(log._id)}</span> : null}
        </DetailItem>
      </dl>

      {log.changes?.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Changes</div>
          <ChangeList changes={log.changes} />
        </div>
      )}

      {log.redacted && (
        <div className="mt-3 text-xs">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            Redaction
          </span>
          <div className="text-red-700">
            Redacted{log.redacted_at ? ` ${formatDate(log.redacted_at)}` : ""}
            {log.redacted_by ? ` by user ${log.redacted_by}` : ""}
          </div>
          {/* The reason is not a separate field: redactActivityLog() writes it
              into `description` as "[redacted] <reason>". Showing the description
              here is what makes the required justification readable to the next
              auditor rather than collected and then hidden. */}
          {log.description && (
            <div className="text-gray-700 mt-0.5">{log.description}</div>
          )}
        </div>
      )}

      <div className="mt-3 text-[10px] text-gray-400">
        Actor snapshot: {[actor.primary, ...actor.secondary].filter(Boolean).join(" · ") || "unknown"}
        {actor.id ? ` · user ${actor.id}` : ""}
      </div>
    </div>
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

  /* Which records are expanded. A Set rather than a single id: an auditor
     comparing two rows should not have one collapse when the other opens. */
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleExpanded = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Integrity (chain verification) — separate from the log listing so a slow
  // verification never delays or blocks the table.
  const [integrity, setIntegrity] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityError, setIntegrityError] = useState(null);

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

  /* Verification is deliberately manual. Running it on every page load would
   * hash the whole trail each time an admin glances at the table; running it
   * when asked makes it an act of checking, which is what an auditor wants. */
  const verifyChain = useCallback(async () => {
    setIntegrityLoading(true);
    setIntegrityError(null);
    try {
      const res = await fetch("/api/activity/verify", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 403) throw new Error("Forbidden: Admin access required");
        throw new Error("Failed to verify the audit chain");
      }
      setIntegrity(await res.json());
    } catch (err) {
      setIntegrity(null);
      setIntegrityError(err.message);
    } finally {
      setIntegrityLoading(false);
    }
  }, []);

  /* Redaction, not deletion.
   *
   * The action is offered because a lawful erasure request has to be
   * actionable, but it no longer destroys the record — it blanks the free-text
   * detail and keeps the actor, timestamp and hash link. A reason is required
   * by the caller (not just the server): "why is this row no longer readable"
   * is the question the next auditor asks, and only the person doing it knows
   * the answer. */
  const handleDelete = async () => {
    if (!deleteId) return;
    const reason = window.prompt(
      "Reason for redacting this entry (required, kept in the audit record):",
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert("A reason is required to redact an audit record.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/activity?id=${deleteId}&reason=${encodeURIComponent(reason.trim())}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Redaction failed");
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
    /* Exported by the same identity rule the table displays, so the file and the
       screen agree. The ObjectId is kept as its own column: a CSV is read by
       tools as well as people, and joining back to a user record needs it. */
    const headers = [
      "Timestamp",
      "User",
      "User ID",
      "Role",
      "Action",
      "Severity",
      "Resource",
      "Description",
      "Outcome",
      "IP Address",
      "User Agent",
      "Hash",
    ];
    const rows = logs.map((l) => {
      const actor = describeActor(l);
      return [
        formatDate(l.createdAt),
        actor.primary || "",
        actor.id || "",
        l.actor?.role || "",
        l.action,
        l.severity || "info",
        l.resource_type || "",
        l.description || "",
        l.outcome?.result || "",
        l.ip_address || "",
        l.user_agent || "",
        l.hash_self || "",
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
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

  /* `archived` is shown next to `checked` rather than hidden, because a break in
   * the chain that retention caused is still a fact the auditor needs: it says
   * where the older records now live (S3), not that nothing happened there. */
  const integritySummary = (() => {
    if (!integrity) return null;
    if (integrity.status === "intact") {
      return integrity.archived > 0
        ? `Chain intact across ${integrity.checked} records, with ${integrity.archived} retention boundary`
        : `Chain intact across ${integrity.checked} records`;
    }
    return `${integrity.problems.length} problem${integrity.problems.length === 1 ? "" : "s"} found across ${integrity.checked} records`;
  })();

  return (
    <div className="mt-20 px-4 md:px-8 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaHistory className="text-2xl text-secondary-600" />
          <h1 className="text-2xl font-bold">Audit Trail</h1>
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
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={searchAction}
              onChange={(e) => { setSearchAction(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary-500"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="PII_ACCESS">PII_ACCESS</option>
              <option value="AUDIT_REDACT">AUDIT_REDACT</option>
              <option value="IMPORT_BATCH_UPLOAD">IMPORT_BATCH_UPLOAD</option>
              <option value="IMPORT_BATCH_FETCH">IMPORT_BATCH_FETCH</option>
              <option value="IMPORT_BATCH_FETCH_FAILED">IMPORT_BATCH_FETCH_FAILED</option>
              <option value="IMPORT_BATCH_VALIDATE">IMPORT_BATCH_VALIDATE</option>
              <option value="IMPORT_BATCH_APPROVE">IMPORT_BATCH_APPROVE</option>
              <option value="IMPORT_BATCH_REJECT">IMPORT_BATCH_REJECT</option>
              <option value="IMPORT_BATCH_DELETE">IMPORT_BATCH_DELETE</option>
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
              <option value="GFP_COPY_FORWARD">GFP_COPY_FORWARD</option>
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
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary-500"
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

      {/* Integrity — NIST AU-9(2): the trail must be checkable, and the check
          has to be visible to an administrator rather than only to a script. */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FaShieldAlt
              className={
                !integrity
                  ? "text-lg text-gray-400"
                  : integrity.status === "intact"
                    ? "text-lg text-green-600"
                    : "text-lg text-red-600"
              }
            />
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Chain integrity
              </h2>
              <p className="text-xs text-gray-500">
                {integrityLoading
                  ? "Verifying every record’s hash and link…"
                  : integrityError
                    ? integrityError
                    : integritySummary || "Not yet verified in this session."}
              </p>
            </div>
          </div>
          <button
            onClick={verifyChain}
            disabled={integrityLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary-600 text-white rounded hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <FaShieldAlt />
            {integrity ? "Re-verify" : "Verify integrity"}
          </button>
        </div>

        {integrity && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Status</div>
              <div
                className={
                  integrity.status === "intact"
                    ? "font-semibold text-green-700"
                    : "font-semibold text-red-700"
                }
              >
                {integrity.status}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Records checked</div>
              <div className="font-semibold">{integrity.checked}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Retention boundaries</div>
              <div className="font-semibold">{integrity.archived}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-500">Unlinked (legacy)</div>
              <div className="font-semibold">{integrity.unlinked_legacy}</div>
            </div>
          </div>
        )}

        {integrity?.unlinked_degraded > 0 && (
          <p className="mt-3 text-xs text-red-700">
            {integrity.unlinked_degraded} record
            {integrity.unlinked_degraded === 1 ? "" : "s"} could not be linked
            when written, so the audit writer was not working correctly at that
            moment. These are listed above as <span className="font-mono">writer_degraded</span>.
          </p>
        )}

        {/* Only the problems the API returned, in its order, so this panel
            never reinterprets a finding. */}
        {integrity?.problems?.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {integrity.problems.map((p) => (
              <li key={`${p.type}-${p.id}`} className="text-red-700">
                <span className="font-mono">{p.type}</span> — record{" "}
                <span className="font-mono">{p.id}</span>
                {p.createdAt ? ` (${formatDate(p.createdAt)})` : ""}
              </li>
            ))}
          </ul>
        )}

        {integrity?.truncated && (
          <p className="mt-3 text-xs text-amber-700">
            Only the most recent records were verified. Earlier records exist
            and were not checked, so this result does not cover the whole
            trail.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading audit records...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit records found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-8 px-2 py-3" />
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const actor = describeActor(log);
                const isOpen = expanded.has(log._id);
                return (
                  <Fragment key={log._id}>
                    <tr className={isOpen ? "bg-gray-50" : "hover:bg-gray-50"}>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleExpanded(log._id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide details" : "Show details"}
                          title={isOpen ? "Hide details" : "Show details"}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <FaChevronRight
                            className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {/* Absolute time only. It used to show "Just now" above
                            the real timestamp, which duplicated the same fact
                            twice in one cell; a relative age is a tooltip now. */}
                        <span className="text-xs text-gray-600" title={timeAgo(log.createdAt)}>
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Identity first; the ObjectId is the least useful part
                            of "who", so it moves to the tooltip and the detail
                            panel rather than being the headline. */}
                        <span
                          className="text-xs font-medium text-gray-700"
                          title={actor.id ? `User ID: ${actor.id}` : undefined}
                        >
                          {actor.primary || "—"}
                        </span>
                        {actor.secondary.length > 0 && (
                          <span className="block text-[10px] text-gray-400">
                            {actor.secondary.join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                      <td className="px-4 py-3">{getSeverityBadge(log.severity)}</td>
                      <td className="px-4 py-3">{getResourceBadge(log.resource_type)}</td>
                      <td className="px-4 py-3 max-w-md">
                        <span
                          className={`block ${isOpen ? "" : "truncate"} ${
                            log.redacted ? "italic text-gray-400" : ""
                          }`}
                          title={log.description}
                        >
                          {log.description || "—"}
                        </span>
                        {/* Changes are shown inline only for a single field; a
                            long diff belongs in the expansion, not pushing every
                            other row down. */}
                        {!isOpen && log.changes?.length === 1 && (
                          <ChangeList changes={log.changes} />
                        )}
                        {!isOpen && log.changes?.length > 1 && (
                          <span className="block text-[10px] text-gray-500">
                            {log.changes.length} fields changed — expand to view
                          </span>
                        )}
                        {log.redacted && !isOpen && (
                          <span className="block text-[10px] text-red-400">
                            redacted{log.redacted_at ? ` ${formatDate(log.redacted_at)}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {/* Not a trash icon: nothing is deleted. The label says what
                            actually happens, so the control cannot be mistaken for
                            the removal it deliberately is not. */}
                        {log.redacted ? (
                          <span className="text-[10px] text-gray-400">—</span>
                        ) : (
                          <button
                            onClick={() => setDeleteId(log._id)}
                            className="text-xs text-gray-500 hover:text-red-700 underline"
                            title="Redact: blanks the detail, keeps the record"
                          >
                            Redact
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <LogDetail log={log} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

      {/* Redaction Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-medium mb-2">Redact Audit Record</h2>
            <p className="text-gray-600 mb-6">
              This entry will remain in the audit trail — who acted, when, and
              the action itself are preserved — but its description and details
              will be blanked. The redaction is recorded against your account.
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
                {deleting ? "Redacting..." : "Redact entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}