"use client";

import axios from "axios";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  FaPlus,
  FaTimes,
  FaTrash,
  FaFolderOpen,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCalendarAlt,
  FaPiggyBank,
  FaMoneyBillWave,
  FaProjectDiagram,
  FaArrowRight,
  FaEllipsisV,
  FaChevronLeft,
  FaChevronRight,
  FaPrint,
} from "react-icons/fa";

// ─── Skeleton ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
      </div>
      <div className="h-10 w-24 bg-gray-200 rounded mb-4" />
      <div className="h-px bg-gray-100 my-4" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 col-span-full">
      <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 text-center max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    disapproved: "bg-red-50 text-red-700 border-red-200",
  };
  const s = (status || "draft").toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${styles[s] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {s}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl ${colorMap[color] || colorMap.blue} flex items-center justify-center shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function ProjectContent2({ basePath = "/gpb" }) {
  const role = useSelector((state) => state.auth.role);
  const [gpbList, setGpbList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [availableBudgets, setAvailableBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Auto-dismiss
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 4000); return () => clearTimeout(t); }
  }, [error]);


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Data fetching ──────────────────────────────────────────────
  const loadGPB = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/gpb");
      setGpbList(res.data?.data || []);
    } catch {
      setError("Failed to load GPB records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGPB();
  }, [loadGPB]);

  const loadBudgets = useCallback(async () => {
    try {
      const res = await axios.get("/api/gaa-budget");
      const existingYears = gpbList.map((g) => Number(g.year));
      const filtered = (res.data?.data || []).filter(
        (budget) => !existingYears.includes(Number(budget.year)),
      );
      setAvailableBudgets(filtered);
    } catch {
      // silent
    }
  }, [gpbList]);

  // ── Modal handlers ─────────────────────────────────────────────
  const openModal = async () => {
    await loadBudgets();
    setSelectedYear("");
    setSelectedBudget("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedYear("");
    setSelectedBudget("");
  };

  useEffect(() => {
    if (!selectedYear) {
      setSelectedBudget("");
      return;
    }
    const found = availableBudgets.find((b) => Number(b.year) === Number(selectedYear));
    setSelectedBudget(found?._id || "");
  }, [selectedYear, availableBudgets]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      await axios.post("/api/gpb", {
        year: Number(selectedYear),
        gaaBudgetId: selectedBudget,
      });
      setSuccess(`GPB for ${selectedYear} created successfully!`);
      closeModal();
      await loadGPB();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create GPB");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────
  const handleDelete = async (year) => {
    try {
      setDeleting(true);
      await axios.delete(`/api/gpb/${year}`);
      setSuccess(`GPB for ${year} deleted successfully.`);
      setDeleteConfirmId(null);
      setOpenMenuId(null);
      await loadGPB();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete GPB");
    } finally {
      setDeleting(false);
    }
  };

  // ── Computed values ────────────────────────────────────────────
  const availableYears = useMemo(() => availableBudgets.map((b) => b.year), [availableBudgets]);

  const totalPages = Math.ceil(gpbList.length / itemsPerPage);
  const paginatedGPB = gpbList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const stats = useMemo(() => {
    const total = gpbList.length;
    const approved = gpbList.filter((g) => g.status_of_gpb?.status === "approved").length;
    const draft = gpbList.filter((g) => g.status_of_gpb?.status === "draft" || !g.status_of_gpb?.status).length;
    const totalProjects = gpbList.reduce((s, g) => s + (g.projects?.length || 0), 0);
    return { total, approved, draft, totalProjects };
  }, [gpbList]);

  const canManage = role !== "gad coordinator" && role !== "planning director";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            GPB Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gender and Development Plan and Budget overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-200"
            >
              <FaPlus className="h-3.5 w-3.5" />
              Add GPB
            </button>
          )}
        </div>
      </div>

      {/* ── Success / Error Banners ─────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm animate-slide-up">
          <FaCheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-slide-up">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary Cards ───────────────────────────────────────── */}
      {!loading && gpbList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard icon={FaCalendarAlt} label="Total GPB Records" value={String(stats.total)} color="blue" />
          <StatCard icon={FaCheckCircle} label="Approved" value={String(stats.approved)} color="green" />
          <StatCard icon={FaFolderOpen} label="Draft" value={String(stats.draft)} color="amber" />
    
        </div>
      )}

      {/* ── GPB Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : gpbList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12">
          <EmptyState
            icon={FaFolderOpen}
            title="No GPB records yet"
            description="Create your first GPB record to start managing projects and budgets."
            action={
              canManage ? (
                <button
                  onClick={openModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="h-3 w-3" />
                  Create GPB
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedGPB.map((item) => {
              const gaa = item.gaaBudgetId;
              return (
                <div
                  key={item._id}
                  className="relative group rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  {/* Top accent bar */}
                  <div className={`h-1.5 w-full ${
                    item.status_of_gpb?.status === "approved"
                      ? "bg-emerald-500"
                      : item.status_of_gpb?.status === "disapproved"
                        ? "bg-red-500"
                        : "bg-amber-400"
                  }`} />

                  <div className="p-6">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          GPB
                        </span>
                        <StatusBadge status={item.status_of_gpb?.status} />
                      </div>

                      {/* 3-dot menu */}
                      {canManage && (
                        <div className="relative" ref={menuRef}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === item._id ? null : item._id);
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                          >
                            <FaEllipsisV className="h-4 w-4" />
                          </button>

                          {openMenuId === item._id && (
                            <div className="absolute right-0 top-10 z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1">
                              {deleteConfirmId === item._id ? (
                                <div className="px-3 py-2 space-y-2">
                                  <p className="text-xs text-gray-600">Delete this GPB and all its projects?</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDelete(item.year);
                                      }}
                                      disabled={deleting}
                                      className="flex-1 px-2 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition"
                                    >
                                      {deleting ? "..." : "Yes, Delete"}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDeleteConfirmId(null);
                                      }}
                                      className="flex-1 px-2 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeleteConfirmId(item._id);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                                >
                                  <FaTrash className="h-3.5 w-3.5" />
                                  Delete GPB
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Year */}
                    <Link href={`${basePath}/${item.year}`} className="block">
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.year}
                        </span>
                      </div>

                      <div className="border-t border-gray-100 my-4" />

                      {/* Details */}
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <FaProjectDiagram className="h-3.5 w-3.5" />
                            Projects
                          </span>
                          <span className="font-semibold text-gray-900">
                            {item.projects?.length || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <FaPiggyBank className="h-3.5 w-3.5" />
                            Total GAA
                          </span>
                          <span className="font-semibold text-gray-900">
                            {gaa?.totalGAA
                              ? `₱ ${Number(gaa.totalGAA).toLocaleString()}`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <FaMoneyBillWave className="h-3.5 w-3.5" />
                            GAD Budget
                          </span>
                          <span className="font-semibold text-emerald-600">
                            {gaa?.gadAnnualBudget
                              ? `₱ ${Number(gaa.gadAnnualBudget).toLocaleString()}`
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open year
                        <FaArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ───────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Showing</span>
              <span className="font-medium text-gray-700">
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, gpbList.length)}
              </span>
              <span>of</span>
              <span className="font-medium text-gray-700">{gpbList.length}</span>
              <span>records</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white"
                >
                  {[3, 6, 9, 12, 24].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FaChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`inline-flex items-center justify-center h-9 w-9 rounded-lg text-sm font-medium transition ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FaChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Create GPB Modal ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <FaFolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Create GPB</h2>
                    <p className="text-xs text-gray-500">Link a GAA budget to create a new GPB record</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Year selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Select Year
                </label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white appearance-none"
                  >
                    <option value="">Select a year</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {availableYears.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <FaExclamationTriangle className="h-3 w-3" />
                    No available budgets. Create a GAA budget first.
                  </p>
                )}
              </div>

              {/* Budget preview */}
              {selectedBudget && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Linked Budget</p>
                  {(() => {
                    const budget = availableBudgets.find((b) => b._id === selectedBudget);
                    if (!budget) return null;
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Total GAA</span>
                          <span className="font-semibold text-gray-900">
                            ₱ {Number(budget.totalGAA).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">GAD Budget</span>
                          <span className="font-semibold text-emerald-600">
                            ₱ {Number(budget.gadAnnualBudget).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">GAD %</span>
                          <span className="font-semibold text-blue-600">{budget.gadPercent}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedYear || !selectedBudget || creating}
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create GPB"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}