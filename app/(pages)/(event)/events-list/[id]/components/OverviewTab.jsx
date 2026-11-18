"use client";

import { usePathname } from "next/navigation";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import CheckInStatusBanner from "./overview/CheckInStatusBanner";
import EventDetailsView from "./overview/EventDetailsView";
import EventEditForm from "./overview/EventEditForm";
import AttendanceQrCard from "./overview/AttendanceQrCard";
import EventDangerZone from "./overview/EventDangerZone";

/* The Overview tab: check-in banner, the Event Details card (read-only view or
   edit form), the attendance QR, and the cancel/delete controls. Each section
   lives in ./overview; this component owns only the edit toggle and resetting
   the form, which both the header button and the form's Cancel use. */
export default function OverviewTab({
  isPast,
  event,
  isEditing,
  setIsEditing,
  editData,
  setEditData,
  handleSave,
  saving,
  posterFiles,
  saveError,
  setSaveError,
  buildEditData,
  baseUrl,
  eventId,
  attendanceQrDataUrl,
  handleDownloadAttendanceQr,
  attendedCount,
  pendingGuestCount,
  canEdit = false,
  canDelete = false,
  showDeleteModal,
  setShowDeleteModal,
  deleteError,
  deleting,
  handleDeleteEvent,
  showCancelModal,
  setShowCancelModal,
  cancelReason,
  setCancelReason,
  handleCancelEvent,
  handleReinstateEvent,
  cancelling,
  reinstating,
  cancelError,
  projects,
  formatRangeLines,
}) {
  const pathname = usePathname();
  const isDeanRoute = pathname?.startsWith("/dean");

  /* The exact deep link the QR encodes — guests open it with no login. */
  const attendanceUrl =
    baseUrl && eventId ? `${baseUrl}/attend/${eventId}` : "";

  const resetEditData = () => {
    const base = buildEditData(event);
    setEditData({
      ...base,
      type_of_activity:
        isDeanRoute && event.type_of_activity === "GAD"
          ? "Academic"
          : base.type_of_activity,
    });
    setSaveError("");
  };

  /* Posters uploaded during this edit are deleted (every one, not only
     the last), and an upload still running is dropped when it lands. */
  const handleCancelEdit = async () => {
    await posterFiles?.rollback();
    posterFiles?.resetSession();
    resetEditData();
    setIsEditing(false);
  };

  /* Stay in the form when the save fails, so the edits and the error message
     are not thrown away. */
  const handleSaveClick = async () => {
    if (await handleSave()) setIsEditing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <CheckInStatusBanner event={event} />

      {isPast && (
        <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-5 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-600">
            <FiTrash2 size={18} />
          </div>
          <div className="pt-0.5">
            <p className="text-sm font-semibold text-secondary-900">
              This event has ended
            </p>
            <p className="text-sm text-secondary-700/80 mt-0.5">
              Thank you for hosting. We hope it was a success!
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm animate-slide-up">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
              <FiEdit2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Event Details
                {event.reference_number && (
                  <span className="ml-2 align-middle rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                    {event.reference_number}
                  </span>
                )}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Core information about this event
              </p>
            </div>
          </div>
          {canEdit && (
          <button
            onClick={async () => {
              if (isEditing) {
                await handleCancelEdit();
              } else {
                /* Start from the saved event every time (with the Dean
                   route's GAD → Academic mapping): the first edit used to
                   skip the mapping. */
                resetEditData();
                setIsEditing(true);
              }
            }}
            className={`${isEditing ? "btn-secondary" : "btn-primary"} !py-2 !px-4 !rounded-lg !text-xs shrink-0`}
          >
            <FiEdit2 size={13} aria-hidden="true" />
            {isEditing ? "Cancel" : "Edit"}
          </button>
          )}
        </div>

        {isEditing && canEdit ? (
          <EventEditForm
            editData={editData}
            setEditData={setEditData}
            projects={projects}
            saving={saving}
            saveError={saveError}
            setSaveError={setSaveError}
            onCancel={handleCancelEdit}
            onSave={handleSaveClick}
            posterFiles={posterFiles}
          />
        ) : (
          <EventDetailsView
            event={event}
            attendedCount={attendedCount}
            pendingGuestCount={pendingGuestCount}
            formatRangeLines={formatRangeLines}
          />
        )}
      </div>

      <AttendanceQrCard
        attendanceUrl={attendanceUrl}
        attendanceQrDataUrl={attendanceQrDataUrl}
        onDownload={handleDownloadAttendanceQr}
      />

      <EventDangerZone
        event={event}
        canChangeStatus={canEdit}
        canDelete={canDelete}
        showCancelModal={showCancelModal}
        setShowCancelModal={setShowCancelModal}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelEvent={handleCancelEvent}
        handleReinstateEvent={handleReinstateEvent}
        cancelling={cancelling}
        reinstating={reinstating}
        cancelError={cancelError}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        deleteError={deleteError}
        deleting={deleting}
        handleDeleteEvent={handleDeleteEvent}
      />
    </div>
  );
}
