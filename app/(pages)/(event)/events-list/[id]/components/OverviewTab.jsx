"use client";

import axios from "axios";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiEdit2, FiTrash2, FiDownload, FiX } from "react-icons/fi";
import { FiCopy, FiCheck, FiExternalLink } from "react-icons/fi";
import {
  FaSpinner,
  FaMagic,
  FaQrcode,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaUserCheck,
  FaClipboardCheck,
} from "react-icons/fa";
import CheckboxDropdown from "./CheckboxDropdown";
import { officeOptionList } from "@/lib/colleges";
import { effectiveStatus, attendanceWindow, canTransition } from "@/lib/eventStatus";
import CancelEventModal from "./CancelEventModal";

/* Local to this card: the Overview only ever prints whole days, and the range
   formatter in the parent returns React nodes rather than a string. */
const formatDateOnly = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "an unknown date"
    : date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
};

const EVENT_SOURCES = [
  {
    value: "project",
    label: "Project-based (GPB)",
    description: "Linked to a GPB project + GAD activity",
  },
  {
    value: "independent",
    label: "Independent",
    description: "Not based on any project. Standalone event.",
  },
];

export default function OverviewTab({
  isPast,
  event,
  isEditing,
  setIsEditing,
  editData,
  setEditData,
  handleEditChange,
  handleSave,
  saving,
  error,
  baseUrl,
  eventId,
  attendanceQrDataUrl,
  handleDownloadAttendanceQr,
  attendedCount,
  pendingGuestCount,
  userId,
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
  formatForInput,
  formatRangeLines,
}) {
  const pathname = usePathname();
  const isDeanRoute = pathname?.startsWith("/dean");
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  /* The exact deep link the QR encodes — guests open it with no login. */
  const attendanceUrl =
    baseUrl && eventId ? `${baseUrl}/attend/${eventId}` : "";

  const handleCopyAttendanceLink = async () => {
    if (!attendanceUrl) return;
    try {
      await navigator.clipboard.writeText(attendanceUrl);
    } catch (err) {
      /* LAN IP over plain http is not a secure context, so the async
         Clipboard API is unavailable — fall back to the legacy copy. */
      const textarea = document.createElement("textarea");
      textarea.value = attendanceUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (fallbackErr) {
        console.error("Copy failed:", fallbackErr);
      }
      document.body.removeChild(textarea);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const generateDescription = async () => {
    setGenerating(true);
    try {
      const {
        title,
        venue,
        type_of_activity,
        gad_activity,
        date,
        start_time,
      } = editData || {};

      /* Time source of truth is the saved event: editData only carries a
         date-only string (the date input), but event.start_date/end_date
         hold the real datetimes the AI prompt should describe. */
      const startDate =
        editData?.start_date ||
        event?.start_date ||
        (date && start_time ? `${date}T${start_time}` : undefined);
      const endDate = editData?.end_date || event?.end_date || undefined;

      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          start_date: startDate,
          end_date: endDate,
          type_of_activity,
          gad_activity,
        }),
      });

      const data = await response.json();

      if (data.description) {
        handleEditChange("description", data.description);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate description.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePosterUpload = async (file) => {
    if (!file) return;
    setPosterUploading(true);
    setPosterError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "events/posters");

      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      handleEditChange("event_poster", {
        url: res.data.url,
        key: res.data.key,
      });
    } catch (err) {
      setPosterError("Failed to upload image. Please try again.");
    } finally {
      setPosterUploading(false);
    }
  };

  const resetEditData = () => {
    const startValue =
      event.start_date ||
      (Array.isArray(event.start_dates) ? event.start_dates[0] : null) ||
      event.date;
    const endValue =
      event.end_date ||
      (Array.isArray(event.end_dates)
        ? event.end_dates[event.end_dates.length - 1]
        : null) ||
      startValue;
    const startInput = formatForInput(startValue);
    const endInput = formatForInput(endValue);
    setEditData({
      event_source: event.project ? "project" : "independent",
      type_of_activity:
        isDeanRoute && event.type_of_activity === "GAD"
          ? "Academic"
          : event.type_of_activity,
      project: event.project,
      gad_activity: event.gad_activity,
      title: event.title || "",
      description: event.description || "",
      date: startInput ? startInput.slice(0, 10) : "",
      start_time: startInput ? startInput.slice(11, 16) : "",
      end_time: endInput ? endInput.slice(11, 16) : "",
      venue: event.venue || "",
      status: event.status || "active",
      organizing_office_unit: event.organizing_office_unit,
      co_organizing_office_unit: event.co_organizing_office_unit,
      event_poster: event.event_poster || null,
    });
  };

  const handleCancelEdit = async () => {
    if (
      editData?.event_poster?.key &&
      editData.event_poster?.key !== event.event_poster?.key
    ) {
      try {
        await axios.delete("/api/upload", {
          data: { key: editData.event_poster.key },
        });
      } catch (err) {
        console.error("Failed to delete orphan poster:", err);
      }
    }
    resetEditData();
    setIsEditing(false);
  };

  /* Plain-language state of the QR window, from the same helper the attendance
     APIs use — so what this banner says is exactly what a scanning guest gets. */

  /* The danger-zone buttons are gated by the transition matrix, not by role or
     by a hardcoded status comparison, so they appear exactly when the API would
     accept the change.

     `canTransition(s, s)` is true by design (re-applying the current value is a
     harmless no-op), so asking the matrix "can this be cancelled?" answers true
     for an already-cancelled event as well. That made `canCancel` win the
     ternary below for every status and left the Reinstate button permanently
     unreachable — an organiser saw "Cancel Event" on an event they had already
     cancelled, with no way back. The stored phase decides *which* button to
     show; the matrix only decides whether that button is legal. */
  const isCancelled = effectiveStatus(event) === "cancelled";
  const canCancel = !isCancelled && canTransition(event.status, "cancelled");
  const canReinstate = canTransition(event.status, "active");

  const checkInStatus = (() => {
    const phase = effectiveStatus(event);
    if (phase === "cancelled") {
      return {
        tone: "danger",
        title: "Event cancelled",
        detail: "Check-in is closed. No further attendance can be recorded.",
        classes: "border-red-200 bg-red-50 text-red-700",
      };
    }
    if (phase === "completed") {
      return {
        tone: "neutral",
        title: "Event has ended",
        detail: "The QR code has expired. Organisers can still add attendees manually.",
        classes: "border-gray-200 bg-gray-50 text-gray-700",
      };
    }

    const { earliestStart, latestEnd } = attendanceWindow(event);
    const now = Date.now();

    if (earliestStart !== null && now < earliestStart) {
      return {
        tone: "pending",
        title: "Check-in not open yet",
        detail: `Opens ${formatDateOnly(new Date(earliestStart))}. The QR code will not accept guests until then.`,
        classes: "border-secondary-200 bg-secondary-50 text-secondary-700",
      };
    }
    if (latestEnd !== null && now > latestEnd) {
      return {
        tone: "neutral",
        title: "Check-in closed",
        detail: `Closed ${formatDateOnly(new Date(latestEnd))}. Organisers can still add attendees manually.`,
        classes: "border-gray-200 bg-gray-50 text-gray-700",
      };
    }
    return {
      tone: "open",
      title: "Check-in is open",
      detail:
        latestEnd === null
          ? "Guests can scan the QR code now."
          : `Guests can scan the QR code until ${formatDateOnly(new Date(latestEnd))}.`,
      classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  })();

  const metrics = [
    {
      label: "Date Range",
      icon: FaCalendarAlt,
      gradient: "from-secondary-600 to-secondary-400",
      iconBg: "bg-secondary-100",
      iconColor: "text-secondary-600",
      value: (
        <div className="flex flex-col gap-1">
          {formatRangeLines(
            event.start_date || event.date,
            event.end_date,
            event,
          ).map((line, idx) => (
            <span key={idx} className="text-sm font-semibold text-gray-900">
              {line}
            </span>
          ))}
        </div>
      ),
    },
    {
      label: "Venue",
      icon: FaMapMarkerAlt,
      gradient: "from-secondary-500 to-secondary-400",
      iconBg: "bg-secondary-100",
      iconColor: "text-secondary-600",
      value: event.venue || "—",
    },
    {
      label: "Attended",
      icon: FaUsers,
      gradient: "from-emerald-600 to-emerald-400",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      /* Same number the Insights tab shows: profiles + approved guests. */
      value: attendedCount || "\u2014",
    },
    {
      label: "Pending Validation",
      icon: FaClipboardCheck,
      gradient: "from-secondary-600 to-secondary-400",
      iconBg: "bg-secondary-100",
      iconColor: "text-secondary-600",
      /* QR check-ins waiting for organizer approval. This used to be a dead
         number — the organiser could see 12 pending and had no way to reach
         them from here. */
      value: pendingGuestCount || "\u2014",
      action:
        pendingGuestCount > 0
          ? {
              href: `/events-list/${eventId}?tab=attendance&validation=pending`,
              label: "Review",
            }
          : null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Whether the QR code actually works right now. The window was already
          enforced in two API routes but never shown here, so an organiser could
          not tell if check-in was open until a guest failed. */}
      {checkInStatus && checkInStatus.tone !== "neutral" && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${checkInStatus.classes}`}
        >
          <FaQrcode className="mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-sm font-semibold">{checkInStatus.title}</p>
            <p className="mt-0.5 text-sm opacity-80">{checkInStatus.detail}</p>
          </div>
        </div>
      )}

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
          <button
            onClick={async () => {
              if (isEditing) {
                await handleCancelEdit();
              } else {
                setIsEditing(true);
              }
            }}
            className={`${isEditing ? "btn-secondary" : "btn-primary"} !py-2 !px-4 !rounded-lg !text-xs shrink-0`}
          >
            <FiEdit2 size={13} aria-hidden="true" />
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>

        {!isEditing ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                  Event Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {event.description || "No description provided."}
                </p>
              </div>
              {event.type_of_activity === "GAD" && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                    GAD Activity
                  </p>
                  <p className="text-sm text-gray-700">{event.gad_activity}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.gradient}`}
                    />
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${m.iconBg} ${m.iconColor} transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon className="text-lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          {m.label}
                        </p>
                        <div className="mt-2 text-2xl font-bold text-gray-900 leading-tight">
                          {m.value}
                        </div>
                        {m.action && (
                          <a
                            href={m.action.href}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 hover:text-secondary-700"
                          >
                            {m.action.label}
                            <FiExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">
                  Event Source <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EVENT_SOURCES.map((source) => {
                    const active =
                      (editData?.event_source ||
                        (event?.project ? "project" : "independent")) ===
                      source.value;
                    return (
                      <button
                        type="button"
                        key={source.value}
                        onClick={() => {
                          if (source.value === "independent") {
                            handleEditChange("event_source", "independent");
                            if (editData?.type_of_activity === "GAD") {
                              handleEditChange("type_of_activity", "Academic");
                            }
                            handleEditChange("project", "");
                            handleEditChange("gad_activity", "");
                          } else {
                            handleEditChange("event_source", "project");
                            handleEditChange("type_of_activity", "GAD");
                          }
                        }}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          active
                            ? "border-secondary-500 bg-secondary-50 ring-2 ring-secondary-500/20 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-sm font-semibold text-gray-900">
                          {source.label}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {source.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label">Event Poster</label>
                {editData?.event_poster && (
                  <div className="mb-3">
                    <div className="relative inline-block">
                      <img
                        src={editData.event_poster.url}
                        alt="Event poster"
                        className="w-40 h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                        onClick={() => handleEditChange("event_poster", "")}
                        aria-label="Remove poster"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="file-input">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePosterUpload(file);
                    }}
                  />
                </div>

                {posterUploading && (
                  <p className="text-sm text-secondary-500 mt-2 flex items-center gap-2">
                    <FaSpinner className="animate-spin" /> Uploading...
                  </p>
                )}
                {posterError && (
                  <p className="alert-error mt-2 !p-2">{posterError}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Type of Activity <span className="text-red-500">*</span>
                </label>
                {(editData?.event_source ||
                  (event?.project ? "project" : "independent")) ===
                "project" ? (
                  <input
                    value="GAD"
                    disabled
                    className="input bg-gray-50"
                    aria-label="Type of Activity"
                  />
                ) : (
                  <select
                    value={editData?.type_of_activity}
                    onChange={(e) => {
                      handleEditChange("type_of_activity", e.target.value);
                      if (e.target.value !== "GAD") {
                        handleEditChange("project", "");
                        handleEditChange("gad_activity", "");
                      }
                    }}
                    className="input"
                    required
                  >
                    <option value="">Select activity type</option>
                    <option value="Academic">Academic</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Extension">Extension</option>
                    <option value="Research">Research</option>
                    <option value="Students">Students</option>
                  </select>
                )}
              </div>

              {(editData?.event_source ||
                (event?.project ? "project" : "independent")) === "project" && (
                <div>
                  <label className="label">
                    GAD Activity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      editData?.project && editData?.gad_activity
                        ? `${editData.project}||||${editData.gad_activity}`
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        handleEditChange("project", "");
                        handleEditChange("gad_activity", "");
                        return;
                      }
                      const [project, gad_activity] = val.split("||||");
                      handleEditChange("project", project);
                      handleEditChange("gad_activity", gad_activity);
                    }}
                    className="input"
                    required
                  >
                    <option value="">Select a GAD activity...</option>
                    {projects.flatMap((proj) =>
                      (Array.isArray(proj.gad_activity)
                        ? proj.gad_activity
                        : [proj.gad_activity]
                      )
                        .filter(Boolean)
                        .map((activity, idx) => {
                          const label =
                            typeof activity === "object"
                              ? activity.value
                              : activity;

                          return (
                            <option
                              key={proj._id + "-" + idx}
                              value={proj._id + "||||" + label}
                            >
                              {label}
                            </option>
                          );
                        }),
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input"
                  value={editData?.title || ""}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                />
              </div>

              <div>
                <label className="label">Venue</label>
                <input
                  type="text"
                  className="input"
                  value={editData?.venue || ""}
                  onChange={(e) => handleEditChange("venue", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Event Schedule</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={editData?.date || ""}
                      onChange={(e) =>
                        handleEditChange("date", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="input"
                      value={editData?.start_time || ""}
                      onChange={(e) =>
                        handleEditChange("start_time", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      End Time
                    </label>
                    <input
                      type="time"
                      className="input"
                      value={editData?.end_time || ""}
                      onChange={(e) =>
                        handleEditChange("end_time", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="label !mb-0">Description</label>
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={generating}
                    className="btn-secondary !py-1.5 !px-3 !text-xs"
                  >
                    <FaMagic className="text-secondary-500" size={12} />
                    {generating ? "Generating..." : "Auto-Generate"}
                  </button>
                </div>
                <textarea
                  rows={4}
                  className="input resize-y"
                  value={editData?.description || ""}
                  onChange={(e) =>
                    handleEditChange("description", e.target.value)
                  }
                />
              </div>

              <div className="md:col-span-2">
                {/* Saved offices that are not on the canonical list — a freely
                    typed one, or a legacy "&" college — are offered too, so
                    they stay visible and can be unticked. */}
                <CheckboxDropdown
                  label="Organizing Office/Unit"
                  options={officeOptionList(editData?.organizing_office_unit)}
                  selected={editData?.organizing_office_unit || []}
                  onChange={(vals) =>
                    handleEditChange("organizing_office_unit", vals)
                  }
                  required
                />
              </div>
              <div className="md:col-span-2">
                <CheckboxDropdown
                  label="Co Organizing Office/Unit"
                  options={officeOptionList(editData?.co_organizing_office_unit)}
                  selected={editData?.co_organizing_office_unit || []}
                  onChange={(vals) =>
                    handleEditChange("co_organizing_office_unit", vals)
                  }
                  required
                  allowCustom
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t border-gray-100 mt-8">
              <button onClick={handleCancelEdit} className="btn-secondary !rounded-lg">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setIsEditing(false);
                }}
                disabled={saving}
                className="btn-primary !rounded-lg"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── QR Code ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6">
        {/* Attendance QR — single QR: scan → no-login form → recorded */}
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FaClipboardCheck size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance QR
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Guests scan, fill the form, recorded as pending — validate to include in attendance
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadAttendanceQr}
              disabled={!attendanceQrDataUrl}
              className="btn-success !py-2 !px-4 !rounded-lg !text-xs shrink-0"
            >
              <FiDownload size={13} />
              Download
            </button>
          </div>
          {attendanceQrDataUrl ? (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="border border-emerald-100 rounded-xl p-3 bg-white shadow-sm shrink-0">
                <img
                  src={attendanceQrDataUrl}
                  alt="Attendance QR code"
                  className="w-36 h-36"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                  Scan Destination
                </p>
                <p className="break-all text-xs text-gray-500 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100 font-mono">
                  {attendanceUrl}
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-2">
                  → Opens the attendance form — no login needed
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAttendanceLink}
                    disabled={!attendanceUrl}
                    className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg"
                  >
                    {linkCopied ? (
                      <>
                        <FiCheck size={13} className="text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <FiCopy size={13} />
                        Copy Link
                      </>
                    )}
                  </button>
                  <a
                    href={attendanceUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!attendanceUrl}
                    className={`btn-secondary !py-2 !px-3 !text-xs !rounded-lg ${
                      attendanceUrl ? "" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <FiExternalLink size={13} />
                    Open Link
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <FaSpinner className="animate-spin text-emerald-500" />
              Generating QR...
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel / Reinstate ────────────────────────────────────── */}
      {/* Driven by the lifecycle module rather than a role check, so the button
          appears exactly when the API would accept the move. Before this there
          was no way to cancel an event through any screen at all — the endpoint
          existed and nothing called it. */}
      {(canCancel || canReinstate) && (
        <div className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <FiX size={18} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {isCancelled ? "Reinstate this event" : "Cancel this event"}
                </p>
                <p className="text-sm text-gray-500">
                  {isCancelled
                    ? "Reinstating puts the event back to active and reopens check-in."
                    : "Cancelling stops check-in and hides the event from Discover. It can be reinstated later."}
                </p>
                {event.cancel_reason && (
                  <p className="mt-1 text-xs text-gray-400">
                    Cancelled because: {event.cancel_reason}
                  </p>
                )}
              </div>
            </div>

            {canCancel ? (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 shrink-0"
                onClick={() => setShowCancelModal(true)}
              >
                <FiX size={13} />
                Cancel Event
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 shrink-0 disabled:opacity-50"
                onClick={handleReinstateEvent}
                disabled={reinstating}
              >
                <FiCheck size={13} />
                {reinstating ? "Reinstating…" : "Reinstate"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Event ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
              <FiTrash2 size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Delete this event</p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All event data will be permanently removed.
              </p>
            </div>
          </div>
          <button
            className="btn-danger !py-2 !px-4 !rounded-lg !text-xs shrink-0"
            onClick={() => setShowDeleteModal(true)}
          >
            <FiTrash2 size={13} />
            Delete Event
          </button>
        </div>
      </div>

      {/* ── Cancel Confirmation Modal ─────────────────────────────── */}
      <CancelEventModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelEvent}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        loading={cancelling}
        error={cancelError}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-gray-900">Delete Event</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-ghost !p-2"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <FiTrash2 className="text-red-500" size={20} />
                </div>
                <div>
                  <p className="text-md font-medium text-gray-900">
                    Are you sure you want to delete this event?
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    This action cannot be undone. All event data will be
                    permanently removed.
                  </p>
                  {deleteError && (
                    <p className="alert-error mt-3 !p-2">{deleteError}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? (
                  <>
                    <FaSpinner className="animate-spin" /> Deleting...
                  </>
                ) : (
                  "Yes, delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}