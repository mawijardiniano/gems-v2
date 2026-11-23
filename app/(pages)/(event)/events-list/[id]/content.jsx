"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import { canManageEvent, isEventOrganizer } from "@/data/lib/eventAccess";
import { effectiveStatus } from "@/data/lib/eventStatus";
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
import Button from "@/components/ui/Button";
import ActionToast, { useActionToast } from "@/components/ActionToast";

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
  const { toast, show: showToast, hide: hideToast } = useActionToast();

  const record = useEventRecord(eventId);
  const { event, userId, userRole, loading, error } = record;

  /* The same rules the API applies. Organizers (the creator, or an oversight
     role) get the attendance tabs; Deans and GAD Coordinators only for their
     own events. Managers (creator or Admin) may edit, cancel and delete. */
  const viewer = { _id: userId, role: userRole };
  const canOrganize = Boolean(event) && isEventOrganizer(viewer, event);
  const canManage = Boolean(event) && canManageEvent(viewer, event);
  const visibleTabs = canOrganize
    ? TABS
    : TABS.filter((t) => t.key === "overview");
  const currentTab = visibleTabs.some((t) => t.key === activeTab)
    ? activeTab
    : "overview";

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
    active: canOrganize && GUEST_TABS.includes(currentTab),
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

  /* Ended = derived "completed" (the shared rule in data/lib/eventStatus).
     The page had its own date check that also called a cancelled event
     "ended … we hope it was a success". */
  const isPast = useMemo(
    () => Boolean(event) && effectiveStatus(event) === "completed",
    [event],
  );

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
        <Button onClick={() => router.push(backPath)} variant="secondary">
          <FiArrowLeft aria-hidden="true" /> Back to Events
        </Button>
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
      <Button
        onClick={() => router.push(backPath)}
        variant="ghost"
        className="!px-3 !py-2 !rounded-lg"
        aria-label="Back to events"
      >
        <FiArrowLeft aria-hidden="true" /> Back to Events
      </Button>

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
                  <span className="mr-2 align-middle rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-2xs font-medium text-gray-500">
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
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={currentTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition duration-200 ${
              currentTab === tab.key
                ? "border-secondary-600 text-secondary-700"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!canOrganize && (
        <div
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600"
          role="status"
        >
          You are viewing an event organized by someone else. Attendance,
          insights and the post-activity report are available to its creator
          and to GAD Focal Persons.
        </div>
      )}

      {guestSheet.error && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border border-danger-border bg-danger-subtle px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <span>
            {guestSheet.error} Attendance counts below may be incomplete.
          </span>
          <button
            type="button"
            onClick={guestSheet.reload}
            className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-danger hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {currentTab === "overview" && (
        <OverviewTab
          isPast={isPast}
          event={event}
          isEditing={editor.isEditing}
          setIsEditing={editor.setIsEditing}
          editData={editor.editData}
          setEditData={editor.setEditData}
          handleSave={editor.handleSave}
          saving={editor.saving}
          posterFiles={editor.posterFiles}
          saveError={editor.saveError}
          setSaveError={editor.setSaveError}
          buildEditData={buildEditData}
          baseUrl={qr.baseUrl}
          eventId={eventId}
          attendanceQrDataUrl={qr.qrDataUrl}
          handleDownloadAttendanceQr={() => qr.download(event.title)}
          attendedCount={insights.attendedCount}
          pendingGuestCount={attendance.pendingGuestCount}
          /* Mirror the API: creator or Admin may edit, cancel and delete. */
          canEdit={canManage}
          canDelete={canManage}
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

      {currentTab === "attendance" && (
        <AttendanceTab
          event={event}
          guests={attendance.attendanceGuests}
          guestsLoading={guestSheet.loading}
          validationFilter={guestValidationFilter}
          setValidationFilter={setGuestValidationFilter}
          onValidate={guestSheet.validate}
          handleDownloadGuestsPdf={(list) =>
            handleDownloadGuestsPdf(list, event, buildRows, (msg) =>
              showToast(msg, "error"),
            )
          }
          handleDownloadBlankGuestsPdf={() =>
            handleDownloadBlankGuestsPdf(event, (msg) => showToast(msg, "error"))
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
          /* A manual encode changes both stores, so both are refreshed. */
          onEncoded={() => {
            guestSheet.reload();
            record.reload();
          }}
        />
      )}

      {currentTab === "insights" && (
        <InsightTab
          attendedCount={insights.attendedCount}
          maleCount={insights.maleCount}
          femaleCount={insights.femaleCount}
          avgAge={insights.avgAge}
          ageSampleSize={insights.ageSampleSize}
          hasData={attendance.hasInsightData}
          roleCounts={insights.roleCounts}
          genderDataChart={insights.genderData}
          affiliationData={attendance.statusCounts}
          ageData={insights.ageData}
          collegeData={insights.collegeData}
          perYearData={insights.perYearData}
        />
      )}

      {currentTab === "reports" && (
        <ReportTab
          event={event}
          approvedGuestCount={attendance.approvedGuestCount}
          attendedCount={insights.attendedCount}
          canSubmit={canManage}
          viewerId={userId}
        />
      )}
      <ActionToast toast={toast} onClose={hideToast} />
    </div>
  );
}
