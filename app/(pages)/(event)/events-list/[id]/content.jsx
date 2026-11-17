"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import { canManageEvent } from "@/data/lib/eventAccess";
import OverviewTab from "./components/OverviewTab";
import AttendanceTab from "./components/AttendanceTab";
import InsightTab from "./components/InsightTab";
import ReportTab from "./components/ReportTab";
import {
  buildGuestRows,
  handlePrintGuests,
  handleDownloadGuestsPdf,
  handleDownloadBlankGuestsPdf,
} from "./components/PrintUtils";
import { buildEditData, formatRangeLines } from "./lib/eventEditData";
import { capitalizeName, extractGuestDetails } from "./lib/guestDetails";
import { useEventRecord } from "./hooks/useEventRecord";
import { useEventEditor } from "./hooks/useEventEditor";
import { useEventLifecycle } from "./hooks/useEventLifecycle";
import { useEventGuests } from "./hooks/useEventGuests";
import { useEventAttendance } from "./hooks/useEventAttendance";
import { useAttendanceQr } from "./hooks/useAttendanceQr";
import { useMyProjects } from "./hooks/useMyProjects";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "attendance", label: "Attendance" },
  { key: "insights", label: "Insights" },
  { key: "reports", label: "Post-Activity Report" },
];

/* Tabs that read the guest sheet: Overview (pending badge), Attendance, and
   Insights (approved guests join every headcount). */
const GUEST_TABS = ["overview", "attendance", "insights"];

const buildRows = (list) =>
  buildGuestRows(list, extractGuestDetails, capitalizeName);

/* The event manage page. Data and actions live in ./hooks; this component
   wires them to the tabs. */
export default function EventManageContent({ backPath = "/events-list" }) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params?.id;

  const [activeTab, setActiveTab] = useState("overview");
  const [guestTypeFilter, setGuestTypeFilter] = useState("all");
  const [guestSexFilter, setGuestSexFilter] = useState("all");
  const [guestSearch, setGuestSearch] = useState("");
  const [guestValidationFilter, setGuestValidationFilter] = useState("all");

  const record = useEventRecord(eventId);
  const { event, userId, userRole, loading, error } = record;

  const editor = useEventEditor({
    event,
    setEvent: record.setEvent,
    userId,
  });
  const lifecycle = useEventLifecycle({
    eventId,
    reload: record.reload,
    onDeleted: () => router.push(backPath),
  });
  const guestSheet = useEventGuests(eventId, {
    active: GUEST_TABS.includes(activeTab),
  });
  const attendance = useEventAttendance(event, guestSheet.guests);
  const qr = useAttendanceQr(eventId);
  const projects = useMyProjects(userId);

  /* Deep links such as the Overview's "Review" button
     (?tab=attendance&validation=pending) open the right tab and filter. */
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (TABS.some((t) => t.key === tab)) setActiveTab(tab);
    const validation = searchParams?.get("validation");
    if (["all", "pending", "approved", "rejected"].includes(validation))
      setGuestValidationFilter(validation);
  }, [searchParams]);

  const isPast = useMemo(() => {
    if (!event) return false;
    let end = event.end_date || event.start_date || event.date;
    if (Array.isArray(event.end_dates) && event.end_dates.length > 0) {
      end = event.end_dates[event.end_dates.length - 1];
    }
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  }, [event]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <FaSpinner className="animate-spin text-secondary-500" size={20} />
          <span>Loading event...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-error mb-4">{error}</div>
        <button onClick={() => router.push(backPath)} className="btn-secondary">
          <FiArrowLeft aria-hidden="true" /> Back to Events
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-container text-center text-gray-500 py-16">
        Event not found.
      </div>
    );
  }

  const { insights } = attendance;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <button
        onClick={() => router.push(backPath)}
        className="btn-ghost !px-3 !py-2 !rounded-lg"
        aria-label="Back to events"
      >
        <FiArrowLeft aria-hidden="true" /> Back to Events
      </button>

      <div className="card p-6 !rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary-700 to-secondary-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-secondary-200 shrink-0">
              {event.title?.[0]?.toUpperCase() || "E"}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {event.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {event.reference_number && (
                  <span className="mr-2 align-middle rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                    {event.reference_number}
                  </span>
                )}
                {event.type_of_activity || "Event"} •{" "}
                {event.venue || "Venue TBD"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto"
        role="tablist"
        aria-label="Event sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "border-secondary-600 text-secondary-700"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          isPast={isPast}
          event={event}
          isEditing={editor.isEditing}
          setIsEditing={editor.setIsEditing}
          editData={editor.editData}
          setEditData={editor.setEditData}
          handleSave={editor.handleSave}
          saving={editor.saving}
          saveError={editor.saveError}
          setSaveError={editor.setSaveError}
          buildEditData={buildEditData}
          baseUrl={qr.baseUrl}
          eventId={eventId}
          attendanceQrDataUrl={qr.qrDataUrl}
          handleDownloadAttendanceQr={() => qr.download(event.title)}
          attendedCount={insights.attendedCount}
          pendingGuestCount={attendance.pendingGuestCount}
          /* Mirrors the DELETE route: creator or Admin only. */
          canDelete={canManageEvent({ _id: userId, role: userRole }, event)}
          showDeleteModal={lifecycle.showDeleteModal}
          setShowDeleteModal={lifecycle.setShowDeleteModal}
          deleteError={lifecycle.deleteError}
          deleting={lifecycle.deleting}
          handleDeleteEvent={lifecycle.handleDeleteEvent}
          showCancelModal={lifecycle.showCancelModal}
          setShowCancelModal={lifecycle.setShowCancelModal}
          cancelReason={lifecycle.cancelReason}
          setCancelReason={lifecycle.setCancelReason}
          handleCancelEvent={lifecycle.handleCancelEvent}
          handleReinstateEvent={lifecycle.handleReinstateEvent}
          cancelling={lifecycle.cancelling}
          reinstating={lifecycle.reinstating}
          cancelError={lifecycle.cancelError}
          projects={projects}
          formatRangeLines={formatRangeLines}
        />
      )}

      {activeTab === "attendance" && (
        <AttendanceTab
          event={event}
          guests={attendance.attendanceGuests}
          guestsLoading={guestSheet.loading}
          counts={guestSheet.counts}
          validationFilter={guestValidationFilter}
          setValidationFilter={setGuestValidationFilter}
          onValidate={guestSheet.validate}
          handleDownloadGuestsPdf={(list) =>
            handleDownloadGuestsPdf(list, event, buildRows)
          }
          handleDownloadBlankGuestsPdf={() =>
            handleDownloadBlankGuestsPdf(event)
          }
          handlePrintGuests={(list) =>
            handlePrintGuests(list, event, buildRows)
          }
          guestTypeFilter={guestTypeFilter}
          setGuestTypeFilter={setGuestTypeFilter}
          guestSexFilter={guestSexFilter}
          setGuestSexFilter={setGuestSexFilter}
          guestSearch={guestSearch}
          setGuestSearch={setGuestSearch}
          existingGuests={attendance.attendanceGuests}
          /* A manual encode changes both stores, so both are refreshed. */
          onEncoded={() => {
            guestSheet.reload();
            record.reload();
          }}
        />
      )}

      {activeTab === "insights" && (
        <InsightTab
          attendedCount={insights.attendedCount}
          maleCount={insights.maleCount}
          femaleCount={insights.femaleCount}
          avgAge={insights.avgAge}
          ageSampleSize={insights.ageSampleSize}
          hasData={attendance.hasInsightData}
          roleCounts={insights.roleCounts}
          statusCounts={attendance.statusCounts}
          genderDataChart={insights.genderData}
          affiliationData={attendance.statusCounts}
          ageData={insights.ageData}
          collegeData={insights.collegeData}
          perYearData={insights.perYearData}
        />
      )}

      {activeTab === "reports" && (
        <ReportTab
          event={event}
          approvedGuestCount={attendance.approvedGuestCount}
          attendedCount={insights.attendedCount}
        />
      )}
    </div>
  );
}
