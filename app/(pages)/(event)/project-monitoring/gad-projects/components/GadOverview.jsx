"use client";

import React from "react";
import {
  FaCheckCircle,
  FaChartLine,
  FaClipboardList,
  FaClock,
  FaFileAlt,
  FaRegCalendarAlt,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaWallet,
} from "react-icons/fa";
import { formatPeso } from "@/data/lib/money";
import { BUDGET_VIEW } from "@/data/lib/budgetVisibility";
import { ayLabel } from "../../lib/projectView";
import { PROJECT_STATUSES, PROJECT_STATUS_META } from "../lib/gadProjects";
import { StatCard } from "./DetailFields";

const percentOf = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/* Project counts by status and, for roles that may see it, budget use. */
export function GadStatCards({ totals, yearFilter, budgetView, budgetSummary }) {
  const showBudget = budgetView !== BUDGET_VIEW.NONE;
  const overBudget = budgetSummary.utilization > 100;
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
        showBudget ? "xl:grid-cols-4" : "xl:grid-cols-3"
      }`}
    >
      <StatCard
        icon={FaClipboardList}
        iconClass="bg-secondary-50 text-secondary-600"
        label="Total GAD Projects/Activities"
        value={totals.listed}
        sub={yearFilter ? ayLabel(yearFilter) : "—"}
      />
      <StatCard
        icon={FaCheckCircle}
        iconClass="bg-emerald-50 text-emerald-600"
        label="Completed"
        value={totals.completed}
        sub={`${percentOf(totals.completed, totals.listed)}% of listed projects`}
      />
      <StatCard
        icon={FaClock}
        iconClass="bg-secondary-50 text-secondary-600"
        label="Ongoing"
        value={totals.ongoing}
        sub={`${percentOf(totals.ongoing, totals.listed)}% of listed projects · ${
          totals.forReview
        } for review`}
      />
      {showBudget && (
        <StatCard
          icon={FaWallet}
          iconClass="bg-rose-50 text-rose-600"
          label="Budget Utilization"
          value={`${Math.round(budgetSummary.utilization)}%`}
          sub={`${formatPeso(budgetSummary.totalExpenditures)} of ${formatPeso(
            budgetSummary.totalBudget,
          )}`}
        >
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overBudget ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.min(Math.max(budgetSummary.utilization, 0), 100)}%`,
              }}
            />
          </div>
        </StatCard>
      )}
    </div>
  );
}

const selectClass =
  "text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300";

/* Academic year, office, status and search filters. */
export function GadFilterBar({ list }) {
  const { filters, years, officeOptions } = list;
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="flex items-center gap-2 lg:w-44">
        <FaRegCalendarAlt className="text-gray-400 shrink-0" />
        <select
          value={filters.yearFilter}
          onChange={(e) => list.setYearFilter(e.target.value)}
          aria-label="Academic year"
          className={`w-full ${selectClass}`}
        >
          <option value="">Loading...</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {ayLabel(y)}
            </option>
          ))}
        </select>
      </div>

      <select
        value={filters.officeFilter}
        onChange={(e) => list.setOfficeFilter(e.target.value)}
        aria-label="College or office"
        className={`${selectClass} lg:w-72`}
      >
        <option value="all">All Colleges/Offices</option>
        {officeOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <select
        value={filters.statusFilter}
        onChange={(e) => list.setStatusFilter(e.target.value)}
        aria-label="Status"
        className={`${selectClass} lg:w-44`}
      >
        <option value="all">All Statuses</option>
        {PROJECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PROJECT_STATUS_META[s]?.label || s}
          </option>
        ))}
      </select>

      <div className="relative flex-1">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => list.setSearch(e.target.value)}
          placeholder="Search GAD activity, mandate, office..."
          className="w-full text-sm rounded-lg border border-gray-200 bg-white pl-9 pr-8 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => list.setSearch("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={list.resetFilters}
        className="self-start lg:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
      >
        Reset
      </button>
    </div>
  );
}

const REPORTS = [
  {
    mode: "overall",
    label: "Progress (Year)",
    title: "Download the per-year milestone progress summary (PDF)",
    icon: FaChartLine,
  },
  {
    mode: "project",
    label: "Progress (Per Project)",
    title: "Download the per-project milestone progress report (PDF)",
    icon: FaClipboardList,
  },
];

/* The milestone progress PDF downloads for the selected year. */
export function QuickReports({ yearFilter, report }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <FaFileAlt className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Quick Reports</p>
          <p className="text-xs text-gray-500 truncate">
            {yearFilter
              ? `Milestone progress for ${ayLabel(Number(yearFilter))}`
              : "Select an academic year first"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {REPORTS.map(({ mode, label, title, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => report.download(mode)}
            disabled={!yearFilter || report.generating !== null}
            title={title}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {report.generating === mode ? (
              <FaSpinner className="animate-spin h-3.5 w-3.5" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
