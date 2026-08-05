"use client";

import { useEffect, useState } from "react";
import {
  FiDownload,
  FiPrinter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiCheckSquare,
  FiUsers,
  FiUserPlus,
  FiFilter,
} from "react-icons/fi";
import { FaFileAlt, FaUserCheck } from "react-icons/fa";

export default function GuestTab({
  guestTab,
  setGuestTab,
  event,
  interestedSearch,
  setInterestedSearch,
  interestedSelectAll,
  handleInterestedSelectAll,
  interestedSelected,
  setInterestedSelected,
  handleAssignGoing,
  extractGuestDetails,
  buildGuestRows,
  handleDownloadGuestsPdf,
  handleDownloadBlankGuestsPdf,
  handlePrintGuests,
  guestTypeFilter,
  setGuestTypeFilter,
  guestCollegeFilter,
  setGuestCollegeFilter,
  guestCourseFilter,
  setGuestCourseFilter,
  guestYearFilter,
  setGuestYearFilter,
  guestSearch,
  setGuestSearch,
  COLLEGE_TO_PROGRAMS,
  YEAR_LEVELS,
  getFilteredGuests,
}) {
  const [goingPage, setGoingPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");
  const filteredGoingGuests = getFilteredGuests(event.registered_users);
  const totalGoingPages = Math.ceil(filteredGoingGuests.length / pageSize) || 1;
  const paginatedGoingGuests = filteredGoingGuests.slice(
    (goingPage - 1) * pageSize,
    goingPage * pageSize,
  );

  useEffect(() => {
    setGoingPage(1);
  }, [
    guestTypeFilter,
    guestCollegeFilter,
    guestCourseFilter,
    guestYearFilter,
    guestSearch,
    event.registered_users,
    guestTab,
    pageSize,
  ]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const tableHeaders = [
    "No.",
    "Full Name",
    "Sex",
    "Gender Identity",
    "Age",
    "Participant Type",
    "Department/Office",
    "Position/Designation",
    "Program/Year/Section",
    "Contact No.",
    "Email Address",
  ];

  const hasActiveFilters =
    guestCollegeFilter ||
    guestCourseFilter ||
    guestYearFilter ||
    guestSearch ||
    guestTypeFilter !== "all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Sub-tabs ─────────────────────────────────────────────── */}
      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {[
          {
            key: "going",
            label: `Going (${filteredGoingGuests.length})`,
            icon: FaUserCheck,
          },
          {
            key: "interested",
            label: `Interested (${event.interested_users?.length || 0})`,
            icon: FiUserPlus,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setGuestTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                guestTab === tab.key
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {guestTab === "going" && (
        <div className="space-y-5">
          {/* ── Filters & Actions ────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FiFilter size={14} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Filter Guests
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="input !w-auto !py-2 !rounded-lg"
                value={guestTypeFilter}
                onChange={(e) => setGuestTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="student">Students Only</option>
                <option value="employee">Employees Only</option>
              </select>

              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="input !pl-9 !py-2 !rounded-lg"
                />
              </div>

              <select
                className="input !w-auto !py-2 !rounded-lg"
                value={guestCollegeFilter}
                onChange={(e) => {
                  setGuestCollegeFilter(e.target.value);
                  setGuestCourseFilter("");
                }}
              >
                <option value="">All Colleges</option>
                {Object.keys(COLLEGE_TO_PROGRAMS || {}).map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>

              <select
                className="input !w-auto !py-2 !rounded-lg"
                value={guestCourseFilter}
                onChange={(e) => setGuestCourseFilter(e.target.value)}
                disabled={!guestCollegeFilter}
              >
                <option value="">All Courses</option>
                {(COLLEGE_TO_PROGRAMS?.[guestCollegeFilter] || []).map(
                  (course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ),
                )}
              </select>

              <select
                className="input !w-auto !py-2 !rounded-lg"
                value={guestYearFilter}
                onChange={(e) => setGuestYearFilter(e.target.value)}
              >
                <option value="">All Years</option>
                {(YEAR_LEVELS || []).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setGuestTypeFilter("all");
                    setGuestCollegeFilter("");
                    setGuestCourseFilter("");
                    setGuestYearFilter("");
                    setGuestSearch("");
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => handleDownloadGuestsPdf(filteredGoingGuests)}
                className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg"
              >
                <FiDownload size={12} />
                Download PDF
              </button>
              <button
                onClick={() => handleDownloadBlankGuestsPdf()}
                className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg"
              >
                <FaFileAlt size={12} />
                Blank Attendance Print
              </button>
              <button
                onClick={() => handlePrintGuests(filteredGoingGuests)}
                className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg"
              >
                <FiPrinter size={12} />
                Print
              </button>
              <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-500">
                <FiUsers size={14} className="text-gray-400" />
                {filteredGoingGuests.length} guest
                {filteredGoingGuests.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── Table ────────────────────────────────────────────── */}
          {filteredGoingGuests.length > 0 ? (
            <div className="table-container">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {tableHeaders.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGoingGuests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No matching guests found.
                        </td>
                      </tr>
                    ) : (
                      paginatedGoingGuests.map((guest, idx) => {
                        const details = extractGuestDetails(guest);
                        return (
                          <tr key={guest?._id?.toString?.() || guest}>
                            <td className="text-gray-500">
                              {(goingPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="font-medium text-gray-900">
                              {details.name}
                            </td>
                            <td className="text-center">{details.sex || "—"}</td>
                            <td className="text-center">
                              {details.genderPreference || "—"}
                            </td>
                            <td className="text-center">{details.age ?? "—"}</td>
                            <td className="text-center">
                              <span className="badge bg-slate-100 text-gray-600">
                                {details.status || "—"}
                              </span>
                            </td>
                            <td className="text-center">
                              {details.department || "—"}
                            </td>
                            <td className="text-center">
                              {details.positionDesignation || "—"}
                            </td>
                            <td className="text-center">
                              {details.programYearSection || "—"}
                            </td>
                            <td className="text-center">
                              {details.contact || "—"}
                            </td>
                            <td className="max-w-40 truncate">
                              {details.email || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-3 border-t border-gray-100">
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  Rows per page:
                  <input
                    type="number"
                    min={1}
                    className="input !w-16 !py-1 !px-2 !text-sm !rounded-lg"
                    value={pageSizeInput}
                    onChange={(e) => {
                      setPageSizeInput(e.target.value);
                      const val = Number(e.target.value);
                      if (e.target.value === "" || isNaN(val)) return;
                      if (val > 0) setPageSize(val);
                    }}
                    onBlur={(e) => {
                      if (
                        !pageSizeInput ||
                        isNaN(Number(pageSizeInput)) ||
                        Number(pageSizeInput) < 1
                      ) {
                        setPageSizeInput(String(pageSize));
                      }
                    }}
                  />
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary !py-1.5 !px-2.5 !rounded-lg disabled:opacity-50"
                    onClick={() => setGoingPage((p) => Math.max(1, p - 1))}
                    disabled={goingPage === 1}
                  >
                    <FiChevronLeft size={14} />
                  </button>
                  <span className="px-2 text-sm text-gray-500">
                    Page {goingPage} of {totalGoingPages}
                  </span>
                  <button
                    className="btn-secondary !py-1.5 !px-2.5 !rounded-lg disabled:opacity-50"
                    onClick={() =>
                      setGoingPage((p) => Math.min(totalGoingPages, p + 1))
                    }
                    disabled={goingPage === totalGoingPages}
                  >
                    <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
                <FiUsers className="text-blue-500" size={24} />
              </div>
              <p className="text-gray-500 font-medium">
                No guests registered yet.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Share the event QR code to invite guests.
              </p>
            </div>
          )}
        </div>
      )}

      {guestTab === "interested" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                className="input !pl-9 !rounded-lg"
                type="text"
                placeholder="Search interested guests by name..."
                value={interestedSearch}
                onChange={(e) => setInterestedSearch(e.target.value)}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={interestedSelectAll}
                onChange={handleInterestedSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <FiCheckSquare className="text-gray-400" size={14} />
              Select All
            </label>
          </div>

          {Array.isArray(event.interested_users) &&
          event.interested_users.length > 0 ? (
            <div className="table-container">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="!w-12"></th>
                      {tableHeaders.slice(1).map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = event.interested_users.filter((guest) => {
                        const details = extractGuestDetails(guest);
                        if (!interestedSearch) return true;
                        return details.name
                          ?.toLowerCase()
                          .includes(interestedSearch.toLowerCase());
                      });
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={11}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No matching guests found.
                            </td>
                          </tr>
                        );
                      }
                      return filtered.map((guest, idx) => {
                        const details = extractGuestDetails(guest);
                        return (
                          <tr key={guest?._id?.toString?.() || guest}>
                            <td>
                              <input
                                type="checkbox"
                                checked={interestedSelected.includes(guest._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setInterestedSelected((prev) => [
                                      ...prev,
                                      guest._id,
                                    ]);
                                  } else {
                                    setInterestedSelected((prev) =>
                                      prev.filter((id) => id !== guest._id),
                                    );
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="font-medium text-gray-900">
                              {details.name}
                            </td>
                            <td className="text-center">{details.sex || "—"}</td>
                            <td className="text-center">
                              {details.genderPreference || "—"}
                            </td>
                            <td className="text-center">{details.age ?? "—"}</td>
                            <td className="text-center">
                              <span className="badge bg-slate-100 text-gray-600">
                                {details.status || "—"}
                              </span>
                            </td>
                            <td className="text-center">
                              {details.department || "—"}
                            </td>
                            <td className="text-center">
                              {details.positionDesignation || "—"}
                            </td>
                            <td className="text-center">
                              {details.programYearSection || "—"}
                            </td>
                            <td className="text-center">
                              {details.contact || "—"}
                            </td>
                            <td className="text-center max-w-40 truncate">
                              {details.email || "—"}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-50 mb-4">
                <FiUserPlus className="text-violet-500" size={24} />
              </div>
              <p className="text-gray-500 font-medium">
                No interested guests yet.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Guests who show interest in this event will appear here.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-gray-500">
              {interestedSelected.length} selected
            </span>
            <button
              className="btn-primary !rounded-lg"
              disabled={interestedSelected.length === 0}
              onClick={handleAssignGoing}
            >
              <FiCheckSquare size={14} />
              Assign Going ({interestedSelected.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}