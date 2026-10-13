"use client";

import { useState } from "react";
import {
  FiDownload,
  FiPrinter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiFilter,
} from "react-icons/fi";
import { FaUserCheck } from "react-icons/fa";

export default function GuestTab(props) {
  const list = Array.isArray(props.guests) ? props.guests : [];
  const guestsLoading = props.guestsLoading;
  const guestSearch = props.guestSearch || "";
  const setGuestSearch = props.setGuestSearch;
  const guestTypeFilter = props.guestTypeFilter || "all";
  const setGuestTypeFilter = props.setGuestTypeFilter;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const q = String(guestSearch || "").toLowerCase();
  const filtered = list.filter((g) => {
    if (guestTypeFilter === "student" && g.participant_type !== "Student") return false;
    if (guestTypeFilter === "employee" && g.participant_type !== "Employee") return false;
    if (q) {
      const hay = `${g.full_name || ""} ${g.department_office_org || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const fmtTime = (t) => {
    if (!t) return "-";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            className="input !pl-9 !rounded-lg"
            type="text"
            placeholder="Search guests by name..."
            value={guestSearch}
            onChange={(e) => { setGuestSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <FiFilter className="text-gray-400" size={14} />
            <select value={guestTypeFilter} onChange={(e) => { setGuestTypeFilter(e.target.value); setPage(1); }} className="bg-transparent outline-none text-sm">
              <option value="all">All</option>
              <option value="student">Students</option>
              <option value="employee">Employees</option>
            </select>
          </span>
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
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <FiUsers size={16} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Attended ({filtered.length})</p>
            <p className="text-xs text-gray-400">Guests who scanned the QR and submitted the form.</p>
          </div>
        </div>
        {guestsLoading ? (
          <p className="p-8 text-center text-sm text-gray-400">Loading guests...</p>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th className="!text-center">Sex</th>
                  <th className="!text-center">Age</th>
                  <th className="!text-center">Type</th>
                  <th className="!text-center">Dept / Office / Org</th>
                  <th className="!text-center">PYS / Position</th>
                  <th className="!text-center">Time In</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g, idx) => (
                  <tr key={g._id || idx}>
                    <td className="text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="font-medium text-gray-900">{g.full_name}</td>
                    <td className="text-center">{g.sex || "-"}</td>
                    <td className="text-center">{g.age ?? "-"}</td>
                    <td className="text-center">{g.participant_type || "-"}</td>
                    <td className="text-center">{g.department_office_org || "-"}</td>
                    <td className="text-center">{g.program_year_section || g.position_designation || "-"}</td>
                    <td className="text-center text-emerald-700 font-medium">{fmtTime(g.attended_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
              <FaUserCheck className="text-emerald-500" size={24} />
            </div>
            <p className="text-gray-500 font-medium">No attendance recorded yet.</p>
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
    </div>
  );
}