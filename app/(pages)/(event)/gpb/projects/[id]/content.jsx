"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiTag,
  FiHome,
} from "react-icons/fi";
import { FaBullseye } from "react-icons/fa";
import { indicatorTargets } from "@/lib/performanceTracking";

export default function ProjectContent() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/project/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setProject(data.data);
        } else {
          setError(data.error || "Failed to load project");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchProject();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md w-full">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <FiArrowLeft /> Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md w-full">
          <p className="text-gray-600 font-medium mb-4">Project not found.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <FiArrowLeft /> Back to Projects
          </button>
        </div>
      </div>
    );
  }

  function formatDateRange(event) {
    let start = event.start_date;
    let end = event.end_date;
    if (Array.isArray(event.start_dates) && event.start_dates.length > 0) {
      start = event.start_dates[0];
    }
    if (Array.isArray(event.end_dates) && event.end_dates.length > 0) {
      end = event.end_dates[event.end_dates.length - 1];
    }
    if (!start) return "-";
    const opts = {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    const format = (value) => {
      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? "Invalid date"
        : d.toLocaleString(undefined, opts);
    };
    const startStr = format(start);
    if (!end) return startStr;
    const endStr = format(end);
    return `${startStr} - ${endStr}`;
  }

  const events = Array.isArray(project.events) ? project.events : [];
  const totalActualParticipants = events.reduce(
    (sum, e) =>
      sum + (Array.isArray(e.attended_users) ? e.attended_users.length : 0),
    0,
  );
  const totalRegisteredParticipants = events.reduce(
    (sum, e) =>
      sum + (Array.isArray(e.attended_users) ? e.attended_users.length : 0),
    0,
  );


  const indicatorProgress = indicatorTargets(project, { key: "attended_users" });
  const measurableCount = indicatorProgress.filter(
    (i) => i.hasParticipantTarget,
  ).length;

  const measurable = indicatorProgress.filter((i) => i.hasParticipantTarget);
  const aggregateTarget = measurable.reduce((s, i) => s + i.targetTotal, 0);
  const aggregateActual = measurable.reduce((s, i) => s + i.actualTotal, 0);
  const aggregateRemaining = aggregateTarget - aggregateActual;
  const aggregatePercent =
    aggregateTarget > 0
      ? Math.round((aggregateActual / aggregateTarget) * 100)
      : 0;
  const aggregateExceeded = aggregateRemaining < 0;

  const projectType =
    project.project_type && typeof project.project_type === "object"
      ? project.project_type.value
      : project.project_type || "Uncategorized";

  const getProjectTypeBadge = (type) => {
    if (type === "Client Focused")
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (type === "Organization Focused")
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (type === "Attributed Program")
      return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
      
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
        >
          <FiArrowLeft /> Back to Projects
        </button>

      
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-200 shrink-0">
                {project.project_name?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {project.project_name || "Project"}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getProjectTypeBadge(projectType)}`}
                  >
                    {projectType}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Year {project.year || "-"} • {events.length} event
                  {events.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Project info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                <FiTag className="h-3.5 w-3.5" /> Gender Issue
              </div>
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {project.gender_issue?.value || project.gender_issue || "-"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                <FiHome className="h-3.5 w-3.5" /> Responsible Office
              </div>
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {project.responsible_office?.value ||
                  project.responsible_office ||
                  "-"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                <FiUsers className="h-3.5 w-3.5" /> Actual Participants
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {totalActualParticipants}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                <FiCalendar className="h-3.5 w-3.5" /> GAD Budget
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                ₱{" "}
                {Number(
                  project.gad_budget?.value || project.gad_budget || 0,
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {indicatorProgress.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <FaBullseye className="h-4 w-4 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Performance Targets vs. Actual
                </h2>
              </div>

            {measurableCount > 0 && (
              <div className="px-6 py-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Target
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {aggregateTarget.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">participants</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 mb-1">
                  <span>
                    Actual {aggregateActual.toLocaleString()} of{" "}
                    {aggregateTarget.toLocaleString()}
                  </span>
                  <span className="font-medium">{aggregatePercent}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      aggregateExceeded ? "bg-emerald-500" : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, aggregatePercent),
                      )}%`,
                    }}
                  />
                </div>
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    aggregateExceeded ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {aggregateExceeded ? (
                    <>Exceeded by {Math.abs(aggregateRemaining).toLocaleString()} ✓</>
                  ) : aggregateRemaining > 0 ? (
                    <>Remaining {aggregateRemaining.toLocaleString()} to hit target</>
                  ) : (
                    <>All targets reached ✓</>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Events</h2>
            <span className="text-sm text-gray-500">{events.length} total</span>
          </div>

          {events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-3 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Office/Unit
                    </th>
                    <th className="py-3 px-6 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => (
                    <tr
                      key={event._id || idx}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition"
                    >
                      <td className="py-3 px-6 font-medium text-gray-900">
                        {event.title || event}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        {formatDateRange(event)}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <FiMapPin className="h-3.5 w-3.5 text-gray-400" />
                          {event.venue || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {event.type_of_activity || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        {Array.isArray(event.organizing_office_unit)
                          ? event.organizing_office_unit.join(", ")
                          : event.organizing_office_unit || "-"}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <FiUsers className="h-3.5 w-3.5 text-gray-400" />
                          {Array.isArray(event.attended_users)
                            ? event.attended_users.length
                            : 0}
                        </span>
                        <span className="ml-1 inline-flex items-center text-[11px] text-gray-400" title="Actually attended (check-ins)">
                          attended ·{" "}
                          {Array.isArray(event.registered_users)
                            ? `${event.registered_users.length} registered`
                            : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                <FiCalendar className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No events found</p>
              <p className="text-gray-400 text-sm mt-1">
                This project has no associated events yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
