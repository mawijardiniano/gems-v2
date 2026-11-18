"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Inbox, Layers } from "lucide-react";
import { EmptyState, StatusBadge } from "./DashboardUi";

/* Projects per GPB year. */
export default function GpbOverviewCard({ dashboard }) {
  const router = useRouter();
  const {
    gpbLoading,
    GPB,
  } = dashboard;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary-50 flex items-center justify-center">
              <Layers className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                GPB Overview
              </h2>
              <p className="text-xs text-gray-500">Projects per year</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {gpbLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between"
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : GPB.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No GPB records"
            description="GPB records will appear here once created."
            action={
              <button
                onClick={() => router.push("/gpb")}
                className="text-xs font-medium text-secondary-600 hover:text-secondary-700 transition-colors"
              >
                Create GPB
              </button>
            }
          />
        ) : (
          <div className="space-y-1">
            {GPB.slice(0, 4).map((gpb, idx) => {
              const projectCount = Array.isArray(gpb.projects)
                ? gpb.projects.length
                : 0;
              return (
                <div
                  key={gpb._id || idx}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/gpb/${gpb.year}`)}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-secondary-600 transition-colors">
                      GPB {gpb.year}
                    </p>
                    <p className="text-xs text-gray-500">
                      {projectCount} project
                      {projectCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={gpb?.status_of_gpb?.status} />
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-secondary-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {GPB.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={() => router.push("/gpb")}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-secondary-600 hover:text-secondary-700 py-2 rounded-lg hover:bg-secondary-50 transition-all duration-200"
            >
              View All GPB
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
