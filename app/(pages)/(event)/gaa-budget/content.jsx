"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaPrint,
  FaTimes,
  FaMoneyBillWave,
} from "react-icons/fa";
import PrintGAABudget from "../components/Print/PrintGAABudget";


export default function GAABudgetContent() {
  const userId = useSelector((state) => state.auth.userId);

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const role = useSelector((state) => state.auth.role);

  useEffect(() => {
  if (error) {
    const timer = setTimeout(() => {
      setError("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [error]);

  useEffect(() => {
  if (success) {
    const timer = setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [success]);

  const fetchBudgets = async () => {
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
    } catch (err) {
      setError("Network error");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSave = async (budget) => {
    setSuccess("");
    setError("");

     if (!editBudget) {
    const existingBudget = budgets.find(
      (b) => Number(b.year) === Number(budget.year)
    );

    if (existingBudget) {
      setError(`Budget for year ${budget.year} already exists.`);
      return;
    }
  }

    try {
      let res, data;

      const payload = {
        ...budget,
        enteredBy: userId,
      };

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
        setSuccess(editBudget ? "Budget updated!" : "Budget saved!");
        setModalOpen(false);
        setEditBudget(null);
        fetchBudgets();
      } else {
        throw new Error(data.error || "Failed to save budget");
      }
    } catch (err) {
      setError(err.message);
    }
  };

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
        throw new Error(
          data.error || data.message || "Failed to delete budget",
        );
      }

      setSuccess("Budget deleted successfully.");
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

  return (
    <div className="min-h-screen md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Annual GAA Budgets
          </h1>

          <p className="text-gray-500 mt-2">
            Manage annual allocation and GAD budget records
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <PrintGAABudget budgets={budgets} />

          {role !== "gad coordinator" && (
            <button
              onClick={() => {
                setEditBudget(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-lg shadow-blue-200"
            >
              <FaPlus />
              Add Budget
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-2xl bg-green-50 border border-green-200 px-5 py-4 text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Budget Records
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500 h-screen">
            Loading budgets...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr className="text-sm text-gray-700">
                  <th className="px-6 py-4 text-left font-semibold">Year</th>
                  <th className="px-6 py-4 text-left font-semibold">
                    Total GAA
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">GAD %</th>
                  <th className="px-6 py-4 text-left font-semibold">
                    GAD Budget
                  </th>
                  {role !== "gad coordinator" && (
                    <th className="px-6 py-4 text-right font-semibold">
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-400">
                      No budgets found
                    </td>
                  </tr>
                ) : (
                  budgets.map((b) => (
                    <tr
                      key={b._id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-5 font-semibold text-gray-900">
                        {b.year}
                      </td>

                      <td className="px-6 py-5 text-gray-700">
                        ₱{" "}
                        {Number(b.totalGAA).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                          {b.gadPercent}%
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="font-bold text-green-700">
                          ₱{" "}
                          {Number(b.gadAnnualBudget).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </td>

                      {role !== "gad coordinator" && (
                        <td className="px-6 py-5 gap-2 flex items-center justify-center">
                          <button
                            onClick={() => handleEdit(b)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition"
                          >
                            <FaEdit />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(b)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition"
                          >
                            <FaTrash />
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BudgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBudget(null);
        }}
        onSave={handleSave}
        initial={editBudget}
        error={error}
      />

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-red-50 border-b border-red-200">
              <h3 className="text-lg font-semibold text-red-900">
                Confirm Delete
              </h3>
              <button
                onClick={cancelDelete}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-gray-700 mb-2">
                Delete budget for{" "}
                <span className="font-semibold">{budgetToDelete?.year}</span>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All associated data will be
                permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
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
function BudgetModal({ open, onClose, onSave, initial,error }) {
  const [year, setYear] = useState(initial?.year || new Date().getFullYear());
  const [totalGAA, setTotalGAA] = useState(initial?.totalGAA ?? 0);
  const [gadPercent, setGadPercent] = useState(initial?.gadPercent ?? 5);
  const [gadAnnualBudget, setGadBudget] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = Number(totalGAA) || 0;
    const p = Number(gadPercent) || 0;
    setGadBudget(t * (p / 100));
  }, [totalGAA, gadPercent]);

  useEffect(() => {
    if (open) {
      setYear(initial?.year || new Date().getFullYear());
      setTotalGAA(initial?.totalGAA ?? 0);
      setGadPercent(initial?.gadPercent ?? 5);

      setLoading(false);
    }
  }, [open, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);


    try {
      await onSave({
        year,
        totalGAA: Number(totalGAA),
        gadPercent: Number(gadPercent),
      });
    } catch (err) {
      setError(err.message || "Failed to save budget");
    }

    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {initial ? "Edit Budget" : "Add Budget"}
            </h2>

            <p className="text-blue-100 text-sm mt-1">
              Manage annual GAA and GAD allocation
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition"
          >
            <FaTimes size={20} />
          </button>
        </div>



        <form onSubmit={handleSubmit} className="p-8 space-y-6">
         {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
            {/* YEAR */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Budget Year
              </label>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2000}
                max={2100}
                required
                disabled={!!initial}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total GAA (₱)
              </label>

              <input
                type="number"
                value={totalGAA === 0 ? "" : totalGAA}
                onChange={(e) => setTotalGAA(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                GAD Percentage (%)
              </label>

              <input
                type="number"
                value={gadPercent}
                onChange={(e) =>
                  setGadPercent(
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                min={0}
                max={100}
                step="1"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Computed GAD Budget (₱)
              </label>

              <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-700 font-bold text-lg">
                <FaMoneyBillWave />₱{" "}
                {gadAnnualBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

         
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-lg shadow-blue-200"
            >
              {loading
                ? "Saving..."
                : initial
                  ? "Update Budget"
                  : "Save Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
