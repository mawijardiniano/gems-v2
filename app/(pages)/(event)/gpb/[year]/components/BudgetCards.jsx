"use client";

import React from "react";
import { FaPiggyBank, FaClipboardList } from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import { formatAmount } from "@/data/lib/money";
import StatCard from "./StatCard";

/* The three budget cards (total, used, remaining) from the year's budget
   summary — the same figures the API checks a new project against. */
export default function BudgetCards({ budgetSummary, status, year }) {
  if (!budgetSummary) return null;

  const approved = status === "approved";
  const hasBudget = Boolean(budgetSummary.hasBudget);
  const overBudget = hasBudget && Boolean(budgetSummary.overBudget);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        icon={FaPiggyBank}
        color="blue"
        label="Total GAD Budget"
        value={
          hasBudget ? `₱ ${formatAmount(budgetSummary.totalBudget)}` : "To follow"
        }
        sub={`Allocated GAA GAD budget · ${year}`}
      />

      <StatCard
        icon={FaClipboardList}
        color="green"
        label={
          approved
            ? "Total GAD Allocation Used"
            : "Projected GAD Allocation Utilization"
        }
        value={`₱ ${formatAmount(budgetSummary.usedBudget ?? 0)}`}
        badge={
          overBudget && (
            <span className="text-xs font-semibold text-red-700 bg-red-100 border border-red-300 rounded-full px-2 py-0.5 whitespace-nowrap">
              ⚠ Over budget
            </span>
          )
        }
        sub={`Sum of all project GAD budgets · ${year}`}
      />

      <StatCard
        icon={FaScaleBalanced}
        color={overBudget ? "red" : "green"}
        danger={overBudget}
        label={approved ? "Remaining GAD Budget" : "Projected Remaining GAD Budget"}
        value={
          hasBudget
            ? `₱ ${formatAmount(budgetSummary.remainingBudget)}`
            : "To follow"
        }
        sub={
          !hasBudget ? (
            "Budget allocation pending"
          ) : overBudget ? (
            <span className="font-semibold text-red-600">
              Over budget by ₱{formatAmount(budgetSummary.overBy)}
            </span>
          ) : (
            `${approved ? "Remaining" : "Projected"} GAD budget for ${year}`
          )
        }
      />
    </div>
  );
}
