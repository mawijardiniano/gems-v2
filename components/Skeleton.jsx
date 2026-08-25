"use client";

const Skeleton = ({ className = "rounded-md", style }) => (
  <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
);

export function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5">
      <div className="skeleton absolute inset-x-0 top-0 h-1" />
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2.5 h-6 w-14" />
        </div>
      </div>
    </div>
  );
}

export function PanelHeaderSkeleton({ className = "" }) {
  return (
    <div className={`mb-6 ${className}`}>
      <Skeleton className="h-5 w-56" />
      <Skeleton className="mt-2 h-3.5 w-80 max-w-full" />
    </div>
  );
}

export function DonutChartSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 w-full shadow-sm">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-2 h-3 w-20" />
      <div className="relative mx-auto mt-4 h-[240px] w-[240px]">
        <Skeleton className="h-full w-full rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[100px] w-[100px] rounded-full bg-white" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChartSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 w-full shadow-sm">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-2 h-3 w-24" />
      <div className="mt-6 flex h-[260px] items-end gap-3 px-2">
        {[45, 70, 55, 85, 40, 65].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function PanelCardSkeleton({ children }) {
  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <PanelHeaderSkeleton />
      {children}
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-4">
      <PanelCardSkeleton>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </PanelCardSkeleton>

      <PanelCardSkeleton>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <DonutChartSkeleton />
          <DonutChartSkeleton />
        </div>
      </PanelCardSkeleton>

      <PanelCardSkeleton>
        <BarChartSkeleton />
      </PanelCardSkeleton>
    </div>
  );
}

export function EventCardSkeletonList({ count = 4 }) {
  return (
    <div aria-busy="true" aria-label="Loading events" className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-100 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
