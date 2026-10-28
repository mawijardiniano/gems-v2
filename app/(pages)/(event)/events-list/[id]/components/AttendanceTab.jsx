"use client";

import { useState } from "react";
import {
  FiDownload,
  FiPrinter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiCheck,
  FiX,
  FiClock,
  FiLoader,
  FiUserPlus,
} from "react-icons/fi";
import { FaUserCheck } from "react-icons/fa";
import ManualEncodeModal from "./ManualEncodeModal";

const STATUS_META = {
  pending: {
    label: "Pending",
    pill: "bg-secondary-50 text-secondary-700 ring-secondary-600/20",
    icon: FiClock,
  },
  approved: {
    label: "Approved",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: FiCheck,
  },
  rejected: {
    label: "Not approved",
    pill: "bg-rose-50 text-rose-700 ring-rose-600/20",
    icon: FiX,
  },
};

/* Rows created before manual validation have no status — treat as approved. */
const statusOf = (g) => g?.validation_status || "approved";

/* Rows that exist only because somebody with an account scanned the QR: they
   live in the event's own check-in list, not in EventGuest. Their id carries a
   `checkin:` prefix and they have no guest record to validate, so the
   approve/reject actions are hidden for them. */
const isGuestRecord = (g) => !String(g?._id || "").startsWith("checkin:");

export default function AttendanceTab(props) {
  const list = Array.isArray(props.guests) ? props.guests : [];
  const guestsLoading = props.guestsLoading;
  const guestSearch = props.guestSearch || "";
  const setGuestSearch = props.setGuestSearch;
  const guestTypeFilter = props.guestTypeFilter || "all";
  const setGuestTypeFilter = props.setGuestTypeFilter;
  const guestSexFilter = props.guestSexFilter || "all";
  const setGuestSexFilter = props.setGuestSexFilter;
  const validationFilter = props.validationFilter || "all";
  const setValidationFilter = props.setValidationFilter;
  const onValidate = props.onValidate;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  const [actionError, setActionError] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showManualEncode, setShowManualEncode] = useState(false);
  const q = String(guestSearch || "").toLowerCase();

  /* The parent always fetches every validation status, so the queue filter is
     applied here. Legacy rows without a status count as approved — the same
     rule the Insights numbers use, which keeps both tabs in agreement. */
  const matchesValidation = (g) => {
    if (validationFilter === "all") return true;
    const status = statusOf(g);
    if (validationFilter === "approved") return status === "approved";
    return status === validationFilter;
  };

  const statusList = list.filter(matchesValidation);

  /* Role tabs count every record in the active queue so the numbers stay
     stable while the sex / search filters narrow the table underneath. */
  const roleCounts = {
    all: statusList.length,
    student: statusList.filter((g) => g.participant_type === "Student").length,
    employee: statusList.filter((g) => g.participant_type === "Employee").length,
    stakeholder: statusList.filter((g) => g.participant_type === "Stakeholder")
      .length,
  };

  const matchesRole = (g) => {
    if (guestTypeFilter === "student") return g.participant_type === "Student";
    if (guestTypeFilter === "employee") return g.participant_type === "Employee";
    if (guestTypeFilter === "stakeholder")
      return g.participant_type === "Stakeholder";
    return true;
  };

  const filtered = statusList.filter((g) => {
    if (!matchesRole(g)) return false;
    if (guestSexFilter !== "all" && (g.sex || "").toLowerCase() !== guestSexFilter)
      return false;
    if (q) {
      const hay = `${g.full_name || ""} ${g.department_office_org || ""} ${
        g.program_year_section || ""
      } ${g.position_designation || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const ROLES = [
    { key: "all", label: "All" },
    { key: "student", label: "Student" },
    { key: "employee", label: "Employee" },
    { key: "stakeholder", label: "Stakeholder" },
  ];
  const activeRoleLabel =
    ROLES.find((r) => r.key === guestTypeFilter)?.label || "All";
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const fmtTime = (t) => {
    if (!t) return "-";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };
  const pageIds = rows.map((g) => g._id).filter(Boolean);
  /* Only real guest rows can be approved / rejected / reset. */
  const pageGuestIds = rows.filter(isGuestRecord).map((g) => g._id);
  const allOnPageSelected =
    pageGuestIds.length > 0 && pageGuestIds.every((id) => selected.includes(id));
  /* Queue badges mirror the rows the table would show for each queue, so the
     numbers can never disagree with the list underneath them. */
  const queueCounts = {
    pending: list.filter((g) => isGuestRecord(g) && statusOf(g) === "pending").length,
    approved: list.filter((g) => statusOf(g) === "approved").length,
    rejected: list.filter((g) => isGuestRecord(g) && statusOf(g) === "rejected")
      .length,
  };
  const pendingCount = queueCounts.pending;

  const runValidate = async (ids, action, note) => {
    if (!onValidate) return;
    setActionError("");
    try {
      await onValidate(ids, action, note);
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err) {
      setActionError(
        err?.response?.data?.message || "Unable to update the guest record.",
      );
    }
  };

  const handleSingle = async (id, action) => {
    setBusyId(id);
    await runValidate([id], action);
    setBusyId(null);
  };

  const handleBulk = async (action, note) => {
    if (selected.length === 0) return;
    setBulkBusy(true);
    await runValidate(selected, action, note);
    setBulkBusy(false);
  };

  return (
    <div className="space-y-5">
      {/* Manual encoding banner: organizers use this for attendees who cannot
          or did not scan the QR, so it sits above every filter as a primary
          action rather than among the small export buttons. */}
      <div className="flex flex-col gap-3 rounded-xl border border-secondary-200 bg-secondary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-600 text-white">
            <FiUserPlus size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-secondary-900">
              Manual Attendance Encoding
            </p>
            <p className="text-xs text-secondary-700">
              No QR? Search a student or employee record and record their
              attendance instantly.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowManualEncode(true)}
          className="btn-primary !py-2.5 !px-5 !text-sm !rounded-lg shrink-0 inline-flex items-center justify-center gap-2"
        >
          <FiUserPlus size={15} /> Encode Attendance
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            className="input !pl-9 !rounded-lg"
            type="text"
            placeholder="Search by name, department or program..."
            value={guestSearch}
            onChange={(e) => { setGuestSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by sex"
            className="input !w-auto !py-2 !rounded-lg !text-sm"
            value={guestSexFilter}
            onChange={(e) => { setGuestSexFilter?.(e.target.value); setPage(1); }}
          >
            <option value="all">Sex: All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select
            aria-label="Filter by validation status"
            className="input !w-auto !py-2 !rounded-lg !text-sm"
            value={validationFilter}
            onChange={(e) => { setValidationFilter?.(e.target.value); setPage(1); setSelected([]); }}
          >
            <option value="all">Validation: All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Not approved</option>
          </select>
          <button onClick={() => props.handleDownloadGuestsPdf(rows)} className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg">
            <FiDownload size={14} /> Download
          </button>
          <button onClick={() => props.handleDownloadBlankGuestsPdf()} className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg">
            Blank Sheet
          </button>
          <button onClick={() => props.handlePrintGuests(rows)} className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg">
            <FiPrinter size={14} /> Print
          </button>
        </div>
      </div>
      {/* Role sub-tabs: Student / Employee / Stakeholder */}
      <div className="flex flex-wrap items-center gap-2">
        {ROLES.map((role) => (
          <button
            key={role.key}
            onClick={() => { setGuestTypeFilter?.(role.key); setPage(1); setSelected([]); }}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              guestTypeFilter === role.key
                ? "border-secondary-600 bg-secondary-50 text-secondary-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {role.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              guestTypeFilter === role.key ? "bg-secondary-600 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {roleCounts[role.key] || 0}
            </span>
          </button>
        ))}
      </div>
      {/* Validation queue tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "pending", label: "Pending", count: pendingCount },
          { key: "approved", label: "Approved", count: queueCounts.approved },
          { key: "rejected", label: "Not approved", count: queueCounts.rejected },
          { key: "all", label: "All", count: list.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setValidationFilter?.(tab.key); setPage(1); setSelected([]); }}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              validationFilter === tab.key
                ? "border-secondary-600 bg-secondary-50 text-secondary-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              validationFilter === tab.key ? "bg-secondary-600 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {pendingCount > 0 && validationFilter === "pending" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary-200 bg-secondary-50 px-4 py-3">
          <p className="text-sm text-secondary-800">
            <span className="font-semibold">{pendingCount}</span> check-in{pendingCount === 1 ? "" : "s"} awaiting validation. Approved guests count toward attendance and reports.
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={bulkBusy || selected.length === 0}
              onClick={() => handleBulk("approve")}
              className="btn-primary !py-2 !px-3 !text-xs !rounded-lg"
            >
              {bulkBusy ? <FiLoader className="animate-spin" size={13} /> : <FiCheck size={13} />}
              Approve selected ({selected.length})
            </button>
            <button
              disabled={bulkBusy || selected.length === 0}
              onClick={() => { setRejectTarget(selected); setRejectNote(""); }}
              className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg !text-rose-600"
            >
              <FiX size={13} /> Reject selected
            </button>
          </div>
        </div>
      )}

      {actionError && <div className="alert-error text-sm">{actionError}</div>}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <FiUsers size={16} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {validationFilter === "all" ? "Attendance" : STATUS_META[validationFilter]?.label} — {activeRoleLabel} ({filtered.length})
            </p>
            <p className="text-xs text-gray-400">
              {validationFilter === "pending"
                ? "Check-ins waiting for organizer validation."
                : "Only approved guests are counted in attendance and reports."}
            </p>
          </div>
        </div>
        {guestsLoading ? (
          <p className="p-8 text-center text-sm text-gray-400">Loading attendance...</p>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="!w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      checked={allOnPageSelected}
                      onChange={(e) =>
                        setSelected((prev) => {
                          if (e.target.checked) {
                            return [...new Set([...prev, ...pageGuestIds])];
                          }
                          return prev.filter((id) => !pageGuestIds.includes(id));
                        })
                      }
                    />
                  </th>
                  <th>#</th>
                  <th>Full Name</th>
                  <th className="!text-center">Sex</th>
                  <th className="!text-center">Age</th>
                  <th className="!text-center">Type</th>
                  <th className="!text-center">Dept / Office / Org</th>
                  <th className="!text-center">PYS / Position</th>
                  <th className="!text-center">Status</th>
                  <th className="!text-center">Time In</th>
                  <th className="!text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g, idx) => {
                  const st = statusOf(g);
                  const meta = STATUS_META[st];
                  const StatusIcon = meta.icon;
                  const editable = isGuestRecord(g);
                  return (
                    <tr key={g._id || idx}>
                      <td>
                        {editable ? (
                          <input
                            type="checkbox"
                            aria-label={`Select ${g.full_name}`}
                            checked={selected.includes(g._id)}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked
                                  ? [...new Set([...prev, g._id])]
                                  : prev.filter((id) => id !== g._id),
                              )
                            }
                          />
                        ) : null}
                      </td>
                      <td className="text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="font-medium text-gray-900">
                        {g.full_name}
                        {g.source === "manual-encode" && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-secondary-50 px-2 py-0.5 align-middle text-[10px] font-medium text-secondary-700 ring-1 ring-inset ring-secondary-600/20">
                            Manual
                          </span>
                        )}
                        {!editable && (
                          <span
                            className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20"
                            title="Signed-in QR check-in — counted, with no guest record to validate"
                          >
                            QR / Account
                          </span>
                        )}
                      </td>
                      <td className="text-center">{g.sex || "-"}</td>
                      <td className="text-center">{g.age ?? "-"}</td>
                      <td className="text-center">{g.participant_type || "-"}</td>
                      <td className="text-center">{g.department_office_org || "-"}</td>
                      <td className="text-center">{g.program_year_section || g.position_designation || "-"}</td>
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${meta.pill}`}>
                          <StatusIcon size={11} />
                          {meta.label}
                        </span>
                        {st !== "pending" && g.validation_note && (
                          <p className="mt-1 text-[10px] text-gray-400 max-w-[140px] truncate mx-auto" title={g.validation_note}>
                            {g.validation_note}
                          </p>
                        )}
                      </td>
                      <td className="text-center text-emerald-700 font-medium">{fmtTime(g.attended_at)}</td>
                      <td className="text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {!editable ? (
                            <span className="text-[11px] text-gray-400">—</span>
                          ) : busyId === g._id ? (
                            <FiLoader className="animate-spin text-gray-400" size={14} />
                          ) : (
                            <>
                              {st !== "approved" && (
                                <button
                                  title="Approve"
                                  aria-label={`Approve ${g.full_name}`}
                                  onClick={() => handleSingle(g._id, "approve")}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                >
                                  <FiCheck size={13} />
                                </button>
                              )}
                              {st !== "rejected" && (
                                <button
                                  title="Reject"
                                  aria-label={`Reject ${g.full_name}`}
                                  onClick={() => { setRejectTarget([g._id]); setRejectNote(""); }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                >
                                  <FiX size={13} />
                                </button>
                              )}
                              {st !== "pending" && (
                                <button
                                  title="Return to pending"
                                  aria-label={`Return ${g.full_name} to pending`}
                                  onClick={() => handleSingle(g._id, "reset")}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                                >
                                  <FiClock size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
              <FaUserCheck className="text-emerald-500" size={24} />
            </div>
            <p className="text-gray-500 font-medium">
              {validationFilter === "pending"
                ? "No check-ins awaiting validation."
                : validationFilter === "rejected"
                  ? "No rejected check-ins."
                  : guestTypeFilter === "stakeholder"
                    ? "No stakeholder attendance yet."
                    : guestTypeFilter === "student"
                      ? "No student attendance yet."
                      : guestTypeFilter === "employee"
                        ? "No employee attendance yet."
                        : "No attendance recorded yet."}
            </p>
            <p className="text-gray-400 text-sm mt-1">Check-ins appear here as guests scan the QR.</p>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary !py-1.5 !px-2.5 !rounded-lg" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <FiChevronLeft size={14} />
            </button>
            <button className="btn-secondary !py-1.5 !px-2.5 !rounded-lg" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Reject reason dialog (single or bulk) */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Not approve {rejectTarget.length === 1 ? "this check-in" : `${rejectTarget.length} check-ins`}?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              The guest may submit the form again. Your reason is kept for the audit trail.
            </p>
            <textarea
              className="input mt-4 !rounded-lg w-full"
              rows={3}
              placeholder="Reason (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="btn-secondary !rounded-lg"
                onClick={() => { setRejectTarget(null); setRejectNote(""); }}
              >
                Cancel
              </button>
              <button
                className="btn-primary !rounded-lg !bg-rose-600"
                onClick={async () => {
                  const ids = rejectTarget;
                  const note = rejectNote;
                  setRejectTarget(null);
                  setBusyId(ids.length === 1 ? ids[0] : null);
                  setBulkBusy(ids.length > 1);
                  await runValidate(ids, "reject", note);
                  setBusyId(null);
                  setBulkBusy(false);
                  setRejectNote("");
                }}
              >
                <FiX size={13} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <ManualEncodeModal
        open={showManualEncode}
        onClose={() => setShowManualEncode(false)}
        eventId={props.event?._id}
        eventTitle={props.event?.title}
        existingGuests={list}
        onEncoded={() => {
          /* A recorded guest lands as approved. Show the whole sheet rather
             than guessing a queue, and drop every table filter that could
             mask the new row. The row sorts first, so return to page one. */
          setValidationFilter?.("all");
          setGuestTypeFilter?.("all");
          setGuestSexFilter?.("all");
          setGuestSearch?.("");
          setPage(1);
          setSelected([]);
          props.onEncoded?.();
        }}
      />
    </div>
  );
}