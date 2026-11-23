"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Inbox, PiggyBank } from "lucide-react";
import { EmptyState, SkeletonTable } from "./DashboardUi";
import { formatAmount } from "@/data/lib/money";

/* The budget attached to each GPB, as a table. */
export default function GaaBudgetTable({ dashboard }) {
  const router = useRouter();
  const {
    gpbLoading,
    planBudgets,
  } = dashboard;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary-50 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                GAA Budget
              </h2>
              <p className="text-xs text-gray-500">Attached to each GPB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {gpbLoading ? (
          <SkeletonTable rows={4} />
        ) : planBudgets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No budget data"
            description="Budgets appear here once a GPB has one attached."
          />
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total GAA
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    GAD %
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    GAD Budget
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {planBudgets.map(({ _id, year, budget }) => (
                  <tr
                    key={_id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="py-3 pr-4 text-sm font-semibold text-gray-900">
                      {year}
                    </td>
                    {budget ? (
                      <>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">
                          ₱ {formatAmount(budget.totalGAA, "—")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-50 text-secondary-700">
                            {budget.gadPercent}%
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right text-sm font-semibold text-success">
                          ₱ {formatAmount(budget.gadAnnualBudget, "—")}
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={3}
                        className="py-3 pl-4 text-right text-sm italic text-gray-500"
                      >
                        To follow
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {planBudgets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={() => router.push("/gaa-budget")}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-secondary-600 hover:text-secondary-700 py-2 rounded-lg hover:bg-secondary-50 transition duration-200"
            >
              View All Budgets
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
