"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
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
  FiX,
  FiUserCheck,
} from "react-icons/fi";
import { FaFileAlt, FaUserCheck, FaSpinner } from "react-icons/fa";

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
  handleManualAddUsers,
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

  // ─── Manual Add state ──────────────────────────────────────────
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualResults, setManualResults] = useState([]);
  const [manualSelected, setManualSelected] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const searchTimeoutRef = useRef(null);

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (showManualAdd) {
      setManualSearch("");
      setManualResults([]);
      setManualSelected([]);
      setManualError("");
      setManualSuccess("");
    }
  }, [showManualAdd]);

  // Manual add debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const q = manualSearch.trim();
    if (!showManualAdd) return;

    if (!q) {
      setManualResults([]);
      setManualSearching(false);
      return;
    }

    setManualSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await axios.get("/api/profile/search", {
          params: { q, limit: 50 },
        });
        const data = res.data?.data || [];

        // Filter out users already registered (already going)
        const registeredIds = new Set(
          (event.registered_users || []).map((u) =>
            (u?._id || u)?.toString?.() || u?.toString?.() || u,
          ),
        );

        const filtered = data.filter((user) => {
          const uid = (user?._id || user)?.toString?.();
          return !registeredIds.has(uid);
        });

        setManualResults(filtered);
      } catch (err) {
        console.error("Manual add search error:", err);
        setManualResults([]);
      } finally {
        setManualSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [manualSearch, showManualAdd, event.registered_users]);

  const handleToggleManualSelect = (userId) => {
    setManualSelected((prev) => {
      const idStr = userId?.toString?.();
      if (prev.some((id) => id?.toString?.() === idStr)) {
        return prev.filter((id) => id?.toString?.() !== idStr);
      }
      return [...prev, userId];
    });
  };

  const handleManualSelectAll = (e) => {
    if (e.target.checked) {
      setManualSelected(manualResults.map((u) => u._id));
    } else {
      setManualSelected([]);
    }
  };

  const handleManualAddSubmit = async () => {
    if (manualSelected.length === 0 || !handleManualAddUsers) return;
    setManualSubmitting(true);
    setManualError("");
    setManualSuccess("");

    try {
      const result = await handleManualAddUsers(manualSelected);
      if (result?.success) {
        setManualSuccess(
          `Successfully added ${manualSelected.length} user${manualSelected.length !== 1 ? "s" : ""} to the Going list.`,
        );
        setManualSelected([]);
        setManualResults([]);
        setManualSearch("");
        setTimeout(() => {
          setShowManualAdd(false);
          setManualSuccess("");
        }, 1200);
      } else {
        setManualError(
          result?.message || "Failed to add users. Please try again.",
        );
      }
    } catch (err) {
      setManualError(err?.response?.data?.message || "Failed to add users.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const isUserAlreadyGoing = (userId) => {
    const idStr = userId?.toString?.();
    return (event.registered_users || []).some((u) => {
      const uid = (u?._id || u)?.toString?.();
      return uid === idStr;
    });
  };

  const manualResultsFiltered = manualResults.filter(
    (u) => !isUserAlreadyGoing(u._id),
  );

  const allManualVisibleSelected =
    manualResultsFiltered.length > 0 &&
    manualResultsFiltered.every((u) =>
      manualSelected.some((id) => id?.toString?.() === u._id?.toString?.()),
    );

  const formatUserName = (user) => {
    const personal = user?.personal_info_id?.personal || {};
    const first = personal.first_name || personal.firstName || "";
    const last = personal.last_name || personal.lastName || "";
    const name = `${first} ${last}`.trim();
    return name || user?.username || "Unknown";
  };

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
      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FiUserPlus size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Manual Add Attendee</h2>
                  <p className="text-xs text-gray-500">Search and select users to add to the Going list</p>
                </div>
              </div>
              <button onClick={() => setShowManualAdd(false)} className="btn-ghost !p-2 !rounded-lg" aria-label="Close">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="input !pl-9 !py-2.5 !rounded-xl"
                  autoFocus
                />
              </div>

              {manualSearching && (
                <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                  <FaSpinner className="animate-spin text-blue-500 mr-2" size={14} />
                  Searching...
                </div>
              )}

              {!manualSearching && manualSearch.trim() && (
                <>
                  {manualResultsFiltered.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allManualVisibleSelected}
                          onChange={handleManualSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Select all ({manualResultsFiltered.length})
                      </label>
                      <span className="text-xs text-gray-400">{manualSelected.length} selected</span>
                    </div>
                  )}

                  <div className="mt-3 max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
                    {manualResultsFiltered.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-400 font-medium">No users found.</p>
                      </div>
                    ) : (
                      manualResultsFiltered.map((user) => (
                        <label
                          key={user._id?.toString?.() || user.username}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={manualSelected.some(
                              (id) => id?.toString?.() === user._id?.toString?.(),
                            )}
                            onChange={() => handleToggleManualSelect(user._id)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{formatUserName(user)}</p>
                          </div>
                          <span className="ml-auto shrink-0">
                            <span className="badge bg-slate-100 text-gray-500">
                              {user?.personal_info_id?.personal?.currentStatus || "—"}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </>
              )}

              {!manualSearch.trim() && !manualSearching && (
                <div className="py-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-3">
                    <FiUserPlus className="text-blue-500" size={20} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Search for users to add</p>
                  <p className="text-xs text-gray-400 mt-1">Find users by their full name or username</p>
                </div>
              )}

              {manualError && <div className="mt-4 alert-error">{manualError}</div>}
              {manualSuccess && <div className="mt-4 alert-success">{manualSuccess}</div>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowManualAdd(false)} className="btn-secondary !rounded-lg" disabled={manualSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleManualAddSubmit}
                className="btn-primary !rounded-lg"
                disabled={manualSelected.length === 0 || manualSubmitting}
              >
                {manualSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Adding...
                  </>
                ) : (
                  <>
                    <FiUserCheck size={14} />
                    Add Selected ({manualSelected.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
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
  <div className="flex items-center">
    <button
      onClick={() => setShowManualAdd(true)}
      className="bg-blue-600 py-2 px-4 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
    >
      + Add Attendee
    </button>
  </div>
)}
      </div>

      {guestTab === "going" && (
        <div className="space-y-5">
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
                            <td className="text-center">
                              {details.sex || "—"}
                            </td>
                            <td className="text-center">
                              {details.genderPreference || "—"}
                            </td>
                            <td className="text-center">
                              {details.age ?? "—"}
                            </td>
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
                        <th key={header} className="!text-xs">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = event.interested_users.filter(
                        (guest) => {
                          const details = extractGuestDetails(guest);
                          if (!interestedSearch) return true;
                          return details.name
                            ?.toLowerCase()
                            .includes(interestedSearch.toLowerCase());
                        },
                      );
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
                            <td className="text-center">
                              {details.sex || "—"}
                            </td>
                            <td className="text-center">
                              {details.genderPreference || "—"}
                            </td>
                            <td className="text-center">
                              {details.age ?? "—"}
                            </td>
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
