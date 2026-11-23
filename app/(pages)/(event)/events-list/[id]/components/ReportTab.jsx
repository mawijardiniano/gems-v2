"use client";

import { useAccomplishmentReport } from "../hooks/useAccomplishmentReport";
import ReportView from "./report/ReportView";
import ReportForm from "./report/ReportForm";

export default function ReportTab({
  event,
  approvedGuestCount = 0,
  attendedCount = 0,
  /* The event's creator or an Admin may file the report (the API's rule);
     the submitter may also edit it. Everyone else who can open the tab only
     reads it. The tab used to offer Submit to people the API refused, after
     they had uploaded every file. */
  canSubmit = false,
  viewerId = null,
}) {
  const report = useAccomplishmentReport({
    event,
    approvedGuestCount,
    attendedCount,
  });
  const {
    reportLoading,
    loadError,
    fetchReport,
    showReport,
    isEditing,
  } = report;

  if (reportLoading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500" role="status">
        Loading report…
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border border-danger-border bg-danger-subtle px-4 py-3 text-sm text-danger"
        role="alert"
      >
        <span>{loadError}</span>
        <button
          type="button"
          onClick={fetchReport}
          className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-danger hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (showReport === null && !canSubmit) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
        No accomplishment report has been submitted for this event yet. Only
        the event&apos;s creator or an Admin can submit it.
      </div>
    );
  }

  if (showReport !== null && !isEditing) {
    return <ReportView report={report} canSubmit={canSubmit} viewerId={viewerId} />;
  }

  return <ReportForm report={report} />;
}
