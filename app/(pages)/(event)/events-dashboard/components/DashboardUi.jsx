"use client";

/* Small presentational pieces shared by the dashboard's cards: skeletons,
   badges, stat cards, card shells and the chart tooltip. */

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { formatAmount } from "@/data/lib/money";

// ─── Skeleton Loader ───────────────────────────────────────────────
export function SkeletonCard({ className = "" }) {
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

export function SkeletonTable({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="animate-pulse h-72 flex items-end gap-3 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded-t-lg"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}





export function StatusBadge({ status }) {
  const styles = {
    draft: "bg-secondary-50 text-secondary-700 border-secondary-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    disapproved: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-secondary-50 text-secondary-700 border-secondary-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  const icons = {
    draft: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
    disapproved: XCircle,
    completed: CheckCircle2,
    active: CheckCircle2,
    cancelled: XCircle,
  };

  const s = (status || "draft").toLowerCase();
  const Icon = icons[s] || Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
        styles[s] || "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {s}
    </span>
  );
}

// ─── Empty State ───────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
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

export function SourceTag({ sample }) {
  return (
    <span
      className={`ml-1.5 inline-flex items-center align-middle px-1.5 py-0.5 rounded text-2xs font-semibold uppercase tracking-wide ${
        sample
          ? "bg-secondary-50 text-secondary-700 border border-secondary-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      {sample ? "Sample" : "Live"}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  hint,
  barPercent,
  barClass,
  source,
  onClick,
}) {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white border border-gray-100 shadow-sm p-5 ${
        clickable
          ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">
            {label}
            {source ? <SourceTag sample={source === "sample"} /> : null}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-gray-500 truncate">{hint}</p>
          ) : null}
          {typeof barPercent === "number" ? (
            <div className="mt-2">
              <MiniBar percent={barPercent} barClass={barClass} />
            </div>
          ) : null}
        </div>
        <div
          className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function MiniBar({ percent, barClass = "bg-secondary-500" }) {
  const safe = Math.max(0, Math.min(Number(percent) || 0, 100));
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export function SnapshotRow({ icon: Icon, label, value, percent, barClass }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-gray-600 min-w-0">
          {Icon ? <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" /> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="font-semibold text-gray-900 shrink-0">{value}</span>
      </div>
      {typeof percent === "number" && (
        <MiniBar percent={percent} barClass={barClass} />
      )}
    </div>
  );
}

export function SnapshotSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-10 bg-gray-200 rounded" />
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardShell({ icon: Icon, iconClass, title, subtitle, action, children }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${iconClass}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {title}
              </h2>
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            </div>
          </div>
          {action}
        </div>
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

export function ReadinessItem({ count, label, hint, clearLabel, linkLabel, onOpen }) {
  const clear = !count;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex items-start gap-2 min-w-0">
        {clear ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 text-secondary-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className={`text-sm ${clear ? "text-gray-500" : "text-gray-800"}`}>
            {clear ? clearLabel : `${count} ${label}`}
          </p>
          {!clear && hint ? (
            <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
          ) : null}
          {!clear && onOpen ? (
            <button
              onClick={onOpen}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-secondary-600 hover:text-secondary-700 transition-colors"
            >
              {linkLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {entry.value == null ? "To follow" : `₱ ${formatAmount(entry.value)}`}
          </span>
        </div>
      ))}
    </div>
  );
}
