"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaTimes,
  FaMoneyBillWave,
  FaPercent,
  FaCalendarAlt,
  FaPiggyBank,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import PrintGAABudget from "../components/Print/PrintGAABudget";

// ─── Skeleton Components ───────────────────────────────────────────
function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100 p-6 ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-4 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-6">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-5 w-14 bg-gray-200 rounded" />
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-5 w-24 bg-gray-200 rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 text-center max-w-xs mb-4">
        {description}
      </p>
      {action}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4">
        <div
          className={`h-12 w-12 rounded-xl ${colorMap[color] || colorMap.blue} flex items-center justify-center shrink-0`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function GAABudgetContent() {
  const userId = useSelector((state) => state.auth.userId);
  const role = useSelector((state) => state.auth.role);
  const router = useRouter();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const isCoordinator = role === "gad coordinator";

  // ── Auto-dismiss messages ──────────────────────────────────────
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ── Fetch budgets ──────────────────────────────────────────────
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gaa-budget");
      const data = await res.json();
      if (res.ok && data.success) {
        setBudgets(data.data);
      } else {
        setError(data.error || "Failed to fetch budgets");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // ── Computed stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalGAA = budgets.reduce((s, b) => s + (b.totalGAA || 0), 0);
    const totalGAD = budgets.reduce((s, b) => s + (b.gadAnnualBudget || 0), 0);
    const avgPercent =
      budgets.length > 0
        ? budgets.reduce((s, b) => s + (b.gadPercent || 0), 0) / budgets.length
        : 0;
    return { totalGAA, totalGAD, avgPercent, count: budgets.length };
  }, [budgets]);

  // ── Filtered & sorted budgets ──────────────────────────────────
  const filteredBudgets = useMemo(() => {
    let list = [...budgets];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (b) =>
          String(b.year).includes(q) ||
          String(b.totalGAA).includes(q) ||
          String(b.gadPercent).includes(q),
      );
    }
    list.sort((a, b) => (sortAsc ? a.year - b.year : b.year - a.year));
    return list;
  }, [budgets, searchTerm, sortAsc]);

  // ── Save handler ───────────────────────────────────────────────
  const handleSave = async (budget) => {
    setSuccess("");
    setError("");

    if (!editBudget) {
      const exists = budgets.find((b) => Number(b.year) === Number(budget.year));
      if (exists) {
        setError(`Budget for year ${budget.year} already exists.`);
        return;
      }
    }

    try {
      let res, data;
      const payload = { ...budget, enteredBy: userId };

      if (editBudget) {
        res = await fetch(`/api/gaa-budget/${editBudget._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await res.json();
      } else {
        res = await fetch("/api/gaa-budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await res.json();
      }

      if (res.ok && data.success) {
        setSuccess(editBudget ? "Budget updated successfully!" : "Budget created successfully!");
        setModalOpen(false);
        setEditBudget(null);
        fetchBudgets();
      } else {
        throw new Error(data.error || data.message || "Failed to save budget");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Edit / Delete handlers ─────────────────────────────────────
  const handleEdit = (budget) => {
    setEditBudget(budget);
    setModalOpen(true);
  };

  const handleDeleteClick = (budget) => {
    setBudgetToDelete(budget);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!budgetToDelete?._id) return;
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/gaa-budget/${budgetToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to delete budget");
      }
      setSuccess(`Budget for ${budgetToDelete.year} deleted successfully.`);
      setDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      fetchBudgets();
    } catch (err) {
      setError(err.message || "Failed to delete budget");
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setBudgetToDelete(null);
  };

  // ── Format helpers ─────────────────────────────────────────────
  const fmt = (n) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtCompact = (n) => {
    const v = Number(n);
    if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `₱${(v / 1_000).toFixed(1)}K`;
    return `₱${v.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Annual GAA Budgets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage annual allocation and GAD budget records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PrintGAABudget budgets={budgets} />
          {!isCoordinator && (
            <button
              onClick={() => {
                setEditBudget(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-200"
            >
              <FaPlus className="h-3.5 w-3.5" />
              Add Budget
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
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FaPiggyBank}
            label="Total GAA Budget"
            value={`₱ ${fmt(stats.totalGAA)}`}
            sub={`Across ${stats.count} year${stats.count > 1 ? "s" : ""}`}
            color="blue"
          />
          <StatCard
            icon={FaMoneyBillWave}
            label="Total GAD Budget"
            value={`₱ ${fmt(stats.totalGAD)}`}
            sub={`${((stats.totalGAD / stats.totalGAA) * 100 || 0).toFixed(2)}% of total GAA`}
            color="green"
          />
          <StatCard
            icon={FaPercent}
            label="Average GAD %"
            value={`${stats.avgPercent.toFixed(2)}%`}
            sub="Across all years"
            color="amber"
          />
          <StatCard
            icon={FaCalendarAlt}
            label="Budget Years"
            value={String(stats.count)}
            sub={sortAsc ? "Oldest first" : "Newest first"}
            color="violet"
          />
        </div>
      )}

      {/* ── Main Table Card ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <FaPiggyBank className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Budget Records
              </h2>
              <p className="text-xs text-gray-500">
                {filteredBudgets.length} record{filteredBudgets.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Sort toggle */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              title={sortAsc ? "Sort: oldest first" : "Sort: newest first"}
            >
              {sortAsc ? (
                <FaSortAmountUp className="h-3.5 w-3.5" />
              ) : (
                <FaSortAmountDown className="h-3.5 w-3.5" />
              )}
              Year
            </button>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <SkeletonTable rows={5} />
        ) : filteredBudgets.length === 0 ? (
          <EmptyState
            icon={FaPiggyBank}
            title={
              searchTerm ? "No matching budgets" : "No budget records yet"
            }
            description={
              searchTerm
                ? "Try adjusting your search term."
                : "Add your first GAA budget record to get started."
            }
            action={
              !searchTerm && !isCoordinator ? (
                <button
                  onClick={() => {
                    setEditBudget(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="h-3 w-3" />
                  Add Budget
                </button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total GAA
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    GAD %
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    GAD Budget
                  </th>
                  {!isCoordinator && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBudgets.map((b) => (
                  <tr
                    key={b._id}
                    className="hover:bg-gray-50/80 transition-colors duration-150 group"
                  >
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-gray-900">
                        {b.year}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-medium text-gray-700">
                        ₱ {fmt(b.totalGAA)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {b.gadPercent}%
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-bold text-emerald-600">
                        ₱ {fmt(b.gadAnnualBudget)}
                      </span>
                    </td>
                    {!isCoordinator && (
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleEdit(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                          >
                            <FaEdit className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all"
                          >
                            <FaTrash className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                        {/* Always visible on mobile fallback */}
                        <div className="sm:hidden flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                          >
                            <FaEdit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all"
                          >
                            <FaTrash className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Budget Modal ────────────────────────────────────────── */}
      <BudgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBudget(null);
        }}
        onSave={handleSave}
        initial={editBudget}
        error={error}
        setError={setError}
      />

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <FaExclamationTriangle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-red-900">
                  Confirm Delete
                </h3>
              </div>
              <button
                onClick={cancelDelete}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete the budget for{" "}
                <span className="font-semibold text-gray-900">
                  {budgetToDelete?.year}
                </span>
                ?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This action cannot be undone. The GAA budget of{" "}
                <span className="font-medium">
                  ₱ {fmt(budgetToDelete?.totalGAA || 0)}
                </span>{" "}
                and all associated data will be permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-200"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Budget"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget Modal Component ────────────────────────────────────────
function BudgetModal({ open, onClose, onSave, initial, error, setError }) {
  const [year, setYear] = useState(initial?.year || new Date().getFullYear());
  const [totalGAA, setTotalGAA] = useState(initial?.totalGAA ?? "");
  const [gadPercent, setGadPercent] = useState(initial?.gadPercent ?? 5);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const gadAnnualBudget = useMemo(() => {
    const t = Number(totalGAA) || 0;
    const p = Number(gadPercent) || 0;
    return t * (p / 100);
  }, [totalGAA, gadPercent]);

  useEffect(() => {
    if (open) {
      setYear(initial?.year || new Date().getFullYear());
      setTotalGAA(initial?.totalGAA ?? "");
      setGadPercent(initial?.gadPercent ?? 5);
      setLocalError("");
      setLoading(false);
    }
  }, [open, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!totalGAA || Number(totalGAA) <= 0) {
      setLocalError("Total GAA must be greater than 0.");
      return;
    }
    if (Number(gadPercent) < 0 || Number(gadPercent) > 100) {
      setLocalError("GAD percentage must be between 0 and 100.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        year,
        totalGAA: Number(totalGAA),
        gadPercent: Number(gadPercent),
      });
    } catch (err) {
      setLocalError(err.message || "Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <FaPiggyBank className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {initial ? "Edit Budget" : "Add Budget"}
                </h2>
                <p className="text-xs text-gray-500">
                  {initial
                    ? `Updating budget for ${initial.year}`
                    : "Create a new annual GAA budget record"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {displayError && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <FaExclamationTriangle className="h-4 w-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Year */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Budget Year
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2000}
                  max={2100}
                  required
                  disabled={!!initial}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {/* Total GAA */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Total GAA (₱)
              </label>
              <div className="relative">
                <FaPiggyBank className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="number"
                  value={totalGAA}
                  onChange={(e) => setTotalGAA(e.target.value)}
                  min={0}
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GAD % */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                GAD Percentage (%)
              </label>
              <div className="relative">
                <FaPercent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="number"
                  value={gadPercent}
                  onChange={(e) =>
                    setGadPercent(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  min={0}
                  max={100}
                  step="0.1"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Recommended: 5% of total GAA
              </p>
            </div>

            {/* Computed GAD Budget */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Computed GAD Budget (₱)
              </label>
              <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-emerald-700 font-bold text-base">
                <FaMoneyBillWave className="h-4 w-4 shrink-0" />
                <span>
                  {gadAnnualBudget.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : initial ? (
                "Update Budget"
              ) : (
                "Save Budget"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}