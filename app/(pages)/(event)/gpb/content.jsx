"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";

export default function ProjectContent2() {
  const [gpbList, setGpbList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [availableBudgets, setAvailableBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState("");
  const [creating, setCreating] = useState(false);
  const role = useSelector((state) => state.auth.role);

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(6);

  const totalPages = Math.ceil(gpbList.length / itemsPerPage);

  const paginatedGPB = gpbList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const loadGPB = async () => {
    setLoading(true);

    try {
      const res = await axios.get("/api/gpb");
      setGpbList(res.data?.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGPB();
  }, []);

  const loadBudgets = async () => {
    try {
      const res = await axios.get("/api/gaa-budget");

      const existingYears = gpbList.map((g) => Number(g.year));

      const filtered = (res.data?.data || []).filter(
        (budget) => !existingYears.includes(Number(budget.year)),
      );

      setAvailableBudgets(filtered);
    } catch (err) {
      console.log(err);
    }
  };

  const openModal = async () => {
    await loadBudgets();
    setShowModal(true);
  };

  useEffect(() => {
    if (!selectedYear) {
      setSelectedBudget("");
      return;
    }

    const found = availableBudgets.find(
      (b) => Number(b.year) === Number(selectedYear),
    );

    if (found) {
      setSelectedBudget(found._id);
    } else {
      setSelectedBudget("");
    }
  }, [selectedYear, availableBudgets]);

  const handleCreate = async () => {
    try {
      setCreating(true);

      await axios.post("/api/gpb", {
        year: Number(selectedYear),
        gaaBudgetId: selectedBudget,
      });

      setShowModal(false);
      setSelectedYear("");
      setSelectedBudget("");

      await loadGPB();
    } catch (err) {
      console.log(err);
      alert(err?.response?.data?.message || "Failed to create GPB");
    } finally {
      setCreating(false);
    }
  };

  const availableYears = useMemo(() => {
    return availableBudgets.map((b) => b.year);
  }, [availableBudgets]);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 animate-pulse h-screen">Loading GPB...</div>
    );
  }

  return (
    <div className="p-6 mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GPB Dashboard</h1>

          <p className="text-sm text-gray-500">
            Select a year to view budget allocation and project breakdown
          </p>
        </div>

        {role !== "gad coordinator" && role !== "planning director" && (
          <button
            onClick={openModal}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition font-medium text-sm"
          >
            + Add GPB
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedGPB.map((item) => {
          const gaa = item.gaaBudgetId;

          return (
            <Link
              key={item._id}
              href={`/gpb/${item.year}`}
              className="group p-6 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                  GPB YEAR
                </span>

                <span
                  className={`text-xs px-2 py-1 rounded-full capitalize ${
                    item.status_of_gpb?.status === "draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : item.status_of_gpb?.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item.status_of_gpb?.status}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                {item.year}
              </h2>

              <div className="my-4 border-t border-gray-100" />

              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex justify-between">
                  <span className="text-gray-500">Projects</span>

                  <span className="font-medium text-gray-900">
                    {item.projects?.length || 0}
                  </span>
                </p>

                <p className="flex justify-between">
                  <span className="text-gray-500">Total GAA</span>

                  <span className="font-medium text-gray-900">
                    ₱{" "}
                    {gaa?.totalGAA
                      ? Number(gaa.totalGAA).toLocaleString()
                      : "-"}
                  </span>
                </p>

                <p className="flex justify-between">
                  <span className="text-gray-500">GAD Budget</span>

                  <span className="font-medium text-green-600">
                    ₱{" "}
                    {gaa?.gadAnnualBudget
                      ? Number(gaa.gadAnnualBudget).toLocaleString()
                      : "-"}
                  </span>
                </p>
              </div>

              <div className="mt-5 text-sm text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition">
                Open year →
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-end items-center gap-2 mt-8">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50"
        >
          Previous
        </button>

       <div className="flex items-center gap-2">
  <label className="text-sm text-gray-600">
    Items per page:
  </label>

 <input
            type="number"
            min={1}
            max={100}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(e.target.value)}
            onBlur={() => {
              let val = parseInt(itemsPerPage, 10);
              if (isNaN(val) || val < 1) val = 1;
              if (val > 100) val = 100;
              setPageSize(val);
              setPage(1);
              setItemsPerPage(String(val));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.target.blur();
              }
            }}
            className="w-16 border rounded px-2 py-1"
          />
</div>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">
                Create GPB
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-black-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700">
                Select Year
              </label>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Year</option>

                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {selectedBudget && (
              <div className="p-4 rounded-xl bg-gray-50 border mb-5">
                {(() => {
                  const budget = availableBudgets.find(
                    (b) => b._id === selectedBudget,
                  );

                  if (!budget) return null;

                  return (
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span>Total GAA</span>

                        <span className="font-semibold">
                          ₱ {Number(budget.totalGAA).toLocaleString()}
                        </span>
                      </p>

                      <p className="flex justify-between">
                        <span>GAD Budget</span>

                        <span className="font-semibold text-green-600">
                          ₱ {Number(budget.gadAnnualBudget).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                disabled={!selectedYear || !selectedBudget || creating}
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create GPB"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
