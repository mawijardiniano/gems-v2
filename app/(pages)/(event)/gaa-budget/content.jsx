"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

function BudgetModal({ open, onClose, onSave, initial }) {
  const [year, setYear] = useState(initial?.year || new Date().getFullYear());
  const [totalGAA, setTotalGAA] = useState(initial?.totalGAA ?? 0);
  const [gadPercent, setGadPercent] = useState(initial?.gadPercent ?? 5);
  const [gadAnnualBudget, setGadBudget] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("");
      setLoading(false);
    }
  }, [open, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
        <button
          className="absolute top-2 right-4 text-4xl text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">
          {initial ? "Edit" : "Add"} GAA Budget
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2000}
                max={2100}
                required
                disabled={!!initial}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total GAA (₱)
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
                value={totalGAA === 0 ? "" : totalGAA}
                onChange={(e) => setTotalGAA(e.target.value)}
                step="1"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GAD Percent (%)
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
                value={gadPercent}
                onChange={(e) =>
                  setGadPercent(
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                min={0}
                max={100}
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Computed GAD Budget (₱)
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700"
                value={gadAnnualBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                readOnly
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
            disabled={loading}
          >
            {loading ? "Saving..." : initial ? "Update Budget" : "Save Budget"}
          </button>
          {error && (
            <div className="text-red-600 text-center mt-2">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function GAABudgetContent() {
  const userId = useSelector((state) => state.auth.userId);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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

  const handlePrintBudgets = () => {
  const html = `
    <html>
      <head>
        <title>GAA Budget Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: center; }
          th { background: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Annual GAA Budget Report</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Total GAA (₱)</th>
              <th>GAD %</th>
              <th>GAD Budget (₱)</th>
            </tr>
          </thead>
          <tbody>
            ${budgets
              .map((b) => {
                const totalGAA = Number(b.totalGAA || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                });

                const gadBudget = Number(b.gadAnnualBudget || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                });

                return `
                  <tr>
                    <td>${b.year}</td>
                    <td>${totalGAA}</td>
                    <td>${b.gadPercent}%</td>
                    <td>${gadBudget}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
};

  return (
    <div className="p-8">
      <div className="flex justify-between pb-6">
        <h2 className="text-2xl font-bold ">
          Annual GAA Budgets
        </h2>
        <div className="flex gap-4">
<button
  onClick={handlePrintBudgets}
  className="mb-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded transition"
>
  Print GAA Budget
</button>
<button
          className="mb-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded transition"
          onClick={() => {
            setEditBudget(null);
            setModalOpen(true);
          }}
        >
          + Add Budget
        </button>
        </div>
        
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">
          Loading budgets...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Year</th>
                <th className="border px-4 py-2">Total GAA (₱)</th>
                <th className="border px-4 py-2">GAD %</th>
                <th className="border px-4 py-2">GAD Budget (₱)</th>
                <th className="border px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-6">
                    No budgets found
                  </td>
                </tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b._id} className="hover:bg-blue-50">
                    <td className="border px-4 py-2 text-center">{b.year}</td>
                    <td className="border px-4 py-2 text-center">
                      {Number(b.totalGAA).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {b.gadPercent}%
                    </td>
                    <td className="border px-4 py-2 font-semibold text-blue-700 text-center">
                      {Number(b.gadAnnualBudget).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2"
                        onClick={() => handleEdit(b)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <BudgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBudget(null);
        }}
        onSave={handleSave}
        initial={editBudget}
      />
    </div>
  );
}
