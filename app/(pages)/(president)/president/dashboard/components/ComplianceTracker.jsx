"use client";

import Link from "next/link";
import { memo } from "react";
import { FaCheckCircle, FaExclamationCircle, FaMinusCircle, FaLock } from "react-icons/fa";

function StatusRow({ ok, warn, label, hint }) {
  const Icon = ok ? FaCheckCircle : warn ? FaExclamationCircle : FaMinusCircle;
  const color = ok
    ? "text-emerald-500"
    : warn
      ? "text-amber-500"
      : "text-gray-300";
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon className={`mt-0.5 shrink-0 ${color}`} size={14} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800">{label}</p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      </div>
    </li>
  );
}

/* Sex-data completeness is computable from the sample snapshot. Budget, GPB
   and project rows have no sample source, so in sample mode they render as
   live-only placeholders instead of misleading zeros. */
function ComplianceTracker({ compliance, useSample }) {
  const c = compliance || {};
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Data Completeness
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {useSample
            ? "Sample profile coverage — budget & approvals are live-only"
            : "What audits check: budget rule, plan approval and report readiness"}
        </p>
      </div>
      <ul className="divide-y divide-gray-50">
        <StatusRow
          ok={(c.sexCompletePct ?? 0) >= 95}
          warn={(c.sexCompletePct ?? 0) >= 70 && (c.sexCompletePct ?? 0) < 95}
          label={`Sex-disaggregated data ${c.sexCompletePct !== null && c.sexCompletePct !== undefined ? `${c.sexCompletePct}%` : "—"}`}
          hint="Profiles with sex at birth recorded."
        />
        {useSample ? (
          <li className="flex items-start gap-2.5 py-3">
            <FaLock className="mt-0.5 shrink-0 text-gray-300" size={14} />
            <div>
              <p className="text-xs font-medium text-gray-500">
                Budget, GPB & project readiness — live data only
              </p>
              <p className="text-[11px] text-gray-400">
                No sample exists for approvals or spending. Toggle to Live data
                to review real compliance.
              </p>
            </div>
          </li>
        ) : (
          <StatusRow
            label="Live compliance rows"
            hint="Budget, GPB and project readiness appear here in live mode."
          />
        )}
      </ul>
      <Link
        href="/president/reports"
        className="mt-4 inline-block text-xs font-medium text-violet-600 hover:underline"
      >
        Open Reports →
      </Link>
    </div>
  );
}

export default memo(ComplianceTracker);

