"use client";

import React from "react";
import { FiArrowLeft, FiEye, FiInfo } from "react-icons/fi";
import PrintGPB from "../../../components/Print/PrintGPB";

const BADGE_STYLES = {
  approved: {
    badge: "bg-success-subtle text-success border border-success-border",
    dot: "bg-emerald-500",
  },
  disapproved: {
    badge: "bg-danger-subtle text-danger border border-danger-border",
    dot: "bg-red-500",
  },
  default: {
    badge: "bg-secondary-50 text-secondary-700 border border-secondary-200",
    dot: "bg-secondary-500",
  },
};

/* Title, status badge, status reason, scanned-copy link and print button of
   the GPB year page. */
export default function GpbHeader({
  year,
  status,
  gpbStatus,
  projects,
  totalGAA,
  totalGadBudget,
  onBack,
  onViewScannedCopy,
}) {
  const style = BADGE_STYLES[status] || BADGE_STYLES.default;

  return (
    <>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary-600 hover:text-secondary-700 hover:underline mb-4 transition-colors"
      >
        <FiArrowLeft className="h-4 w-4" /> Back to GPB List
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              GPB Year {year}
            </h2>
            {gpbStatus?.scanned_copy?.url && (
              <button
                onClick={onViewScannedCopy}
                title="Preview the scanned copy attached to this status"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary-600 bg-secondary-50 border border-secondary-200 px-2.5 py-1 rounded-full hover:bg-secondary-100 transition-colors"
              >
                <FiEye className="h-3 w-3" />
                View scanned copy
              </button>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full capitalize ${style.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {status || "draft"}
            </span>
          </div>

          {gpbStatus?.reason && (
            <p className="flex items-start gap-1.5 text-sm text-gray-500 mt-2">
              <FiInfo className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" />
              <span>
                <span className="font-medium text-gray-600">Reason:</span>{" "}
                {gpbStatus.reason}
              </span>
            </p>
          )}
        </div>

        <PrintGPB
          totalGAA={totalGAA}
          totalGadBudget={totalGadBudget}
          budgetYear={year}
          projects={projects}
          /* The signatory block is keyed by the GPB's academic year. Without
             this the component derived `""` and always printed the underscore
             rule, which is why saved signatories never appeared on the GPB. */
          year={year}
        />
      </div>
    </>
  );
}
