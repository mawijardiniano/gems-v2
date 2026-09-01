"use client";

import axios from "axios";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiEdit2, FiTrash2, FiDownload, FiX } from "react-icons/fi";
import {
  FaPlus,
  FaSpinner,
  FaMagic,
  FaQrcode,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaUserCheck,
  FaLayerGroup,
  FaClipboardCheck,
} from "react-icons/fa";
import CheckboxDropdown from "./CheckboxDropdown";

const ELIGIBILITY_OPTIONS = [
  { value: "Scholarship Applicant", label: "Scholarship Applicant" },
  { value: "Solo Parent", label: "Solo Parent" },
  { value: "PWDs", label: "Person with Disability (PWD)" },
  { value: "Indigenous Group", label: "Indigenous Group Member" },
  { value: "LGBTQIA+", label: "LGBTQIA+" },
  { value: "Low Income Student", label: "Low-income Student" },
  { value: "None", label: "None" },
];

const OFFICE_OPTIONS = [
  "Graduate School",
  "College of Agriculture",
  "College of Allied Health Sciences",
  "College of Arts & Social Sciences",
  "College of Business & Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Environmental Studies",
  "College of Fisheries & Aquatic Sciences",
  "College of Governance",
  "College of Industrial Technology",
  "College of Information & Computing Sciences",
  "Offices under the Office of the University President",
  "Offices under the Office of the Vice President for Academic Affairs",
  "Offices under the Office of the Vice President for Administration and Finance",
  "Offices under the Office of the Vice President for Research and Extension",
  "Offices under the Office of the Vice President for Student Affairs and Services",
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
  qrDataUrl,
  handleDownloadQr,
  attendanceQrDataUrl,
  handleDownloadAttendanceQr,
  showQrPrompt,
  setShowQrPrompt,
  handleQrYesAccount,
  handleQrNoAccount,
  formatRange,
  userId,
  showDeleteModal,
  setShowDeleteModal,
  deleteError,
  deleting,
  handleDeleteEvent,
  projects,
  formatForInput,
  formatRangeLines,
}) {
  const pathname = usePathname();
  const isDeanRoute = pathname?.startsWith("/dean");
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateDescription = async () => {
    setGenerating(true);
    try {
      const {
        title,
        venue,
        type_of_activity,
        gad_activity,
        eligibility_criteria,
        target_number_of_participants,
        start_dates,
      } = editData || {};

      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          number_of_days: start_dates?.length || 1,
          type_of_activity,
          gad_activity,
          eligibility_criteria,
          target_number_of_participants,
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
    setEditData({
      type_of_activity:
        isDeanRoute && event.type_of_activity === "GAD"
          ? "Academic"
          : event.type_of_activity,
      project: event.project,
      gad_activity: event.gad_activity,
      title: event.title || "",
      description: event.description || "",
      number_of_days: event.number_of_days || "",
      start_dates: Array.isArray(event.start_dates)
        ? event.start_dates.map(formatForInput)
        : [],
      end_dates: Array.isArray(event.end_dates)
        ? event.end_dates.map(formatForInput)
        : [],
      venue: event.venue || "",
      status: event.status || "active",
      organizing_office_unit: event.organizing_office_unit,
      co_organizing_office_unit: event.co_organizing_office_unit,
      eligibility_criteria: event.eligibility_criteria,
      target_number_of_participants: event.target_number_of_participants,
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

  const metrics = [
    {
      label: "Date Range",
      icon: FaCalendarAlt,
      gradient: "from-blue-600 to-blue-400",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
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
      label: "Number of Days",
      icon: FaLayerGroup,
      gradient: "from-purple-600 to-pink-400",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      value:
        (event.start_dates && event.start_dates.length) ||
        event.number_of_days ||
        1,
    },
    {
      label: "Venue",
      icon: FaMapMarkerAlt,
      gradient: "from-amber-500 to-orange-400",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      value: event.venue || "—",
    },
    {
      label: "Registered",
      icon: FaUsers,
      gradient: "from-emerald-600 to-emerald-400",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      value: (event.registered_users || []).length || "—",
    },
    {
      label: "Attended",
      icon: FaUserCheck,
      gradient: "from-teal-500 to-teal-400",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      value: (
        <div className="flex flex-col">
          <span>{(event.attended_users || []).length || "—"}</span>
          {(event.start_dates || [])[0] &&
            new Date(
              Math.max(
                ...(event.end_dates || []).map((d) => new Date(d).getTime()),
                0,
              ),
            ).getTime() < Date.now() &&
            (event.registered_users || []).length > 0 && (
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">
                {Math.round(
                  ((event.attended_users || []).length /
                    (event.registered_users || []).length) *
                    100,
                )}
                % of registered
              </span>
            )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {isPast && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <FiTrash2 size={18} />
          </div>
          <div className="pt-0.5">
            <p className="text-sm font-semibold text-amber-900">
              This event has ended
            </p>
            <p className="text-sm text-amber-700/80 mt-0.5">
              Thank you for hosting. We hope it was a success!
            </p>
          </div>
        </div>
      )}

      {/* ── Event Details ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm animate-slide-up">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiEdit2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Event Details
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
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
                  <p className="text-sm text-blue-500 mt-2 flex items-center gap-2">
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
                  <option value="Academic">Academic</option>
                  <option value="Administrative">Administrative</option>
                  {!isDeanRoute && <option value="GAD">GAD</option>}
                  <option value="Extension">Extension</option>
                  <option value="Research">Research</option>
                  <option value="Students">Students</option>
                </select>
              </div>

              {editData?.type_of_activity === "GAD" && (
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
                <label className="label">Event Days</label>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Number of Days: {editData?.start_dates?.length || 1}
                  </p>
                  {editData?.start_dates &&
                    editData?.end_dates &&
                    editData.start_dates.map((start, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-slate-50 p-3"
                      >
                        <span className="text-xs font-medium text-gray-500 w-14">
                          Day {idx + 1}
                        </span>
                        <input
                          type="datetime-local"
                          className="input !w-auto !py-1.5"
                          value={start}
                          onChange={(e) => {
                            const newStarts = [...editData.start_dates];
                            newStarts[idx] = e.target.value;
                            handleEditChange("start_dates", newStarts);
                          }}
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="datetime-local"
                          className="input !w-auto !py-1.5"
                          value={editData.end_dates[idx]}
                          onChange={(e) => {
                            const newEnds = [...editData.end_dates];
                            newEnds[idx] = e.target.value;
                            handleEditChange("end_dates", newEnds);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-ghost !py-1.5 !px-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            const newStarts = editData.start_dates.filter(
                              (_, i) => i !== idx,
                            );
                            const newEnds = editData.end_dates.filter(
                              (_, i) => i !== idx,
                            );
                            handleEditChange("start_dates", newStarts);
                            handleEditChange("end_dates", newEnds);
                          }}
                          disabled={editData.start_dates.length <= 1}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  <button
                    type="button"
                    className="btn-secondary !py-2"
                    onClick={() => {
                      handleEditChange("start_dates", [
                        ...(editData.start_dates || []),
                        "",
                      ]);
                      handleEditChange("end_dates", [
                        ...(editData.end_dates || []),
                        "",
                      ]);
                    }}
                  >
                    <FaPlus size={12} />
                    Add Day
                  </button>
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
                    <FaMagic className="text-blue-500" size={12} />
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
                <CheckboxDropdown
                  label="Organizing Office/Unit"
                  options={OFFICE_OPTIONS}
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
                  options={OFFICE_OPTIONS}
                  selected={editData?.co_organizing_office_unit || []}
                  onChange={(vals) =>
                    handleEditChange("co_organizing_office_unit", vals)
                  }
                  required
                />
              </div>
              <div className="md:col-span-2">
                <CheckboxDropdown
                  label="Eligibility Criteria"
                  options={ELIGIBILITY_OPTIONS.map((o) => o.value)}
                  selected={editData?.eligibility_criteria || []}
                  onChange={(vals) =>
                    handleEditChange("eligibility_criteria", vals)
                  }
                  required
                />
              </div>
              <div>
                <label className="label">
                  Target Number of Participants
                </label>
                <input
                  type="text"
                  className="input"
                  value={editData?.target_number_of_participants || ""}
                  onChange={(e) =>
                    handleEditChange(
                      "target_number_of_participants",
                      e.target.value,
                    )
                  }
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

      {/* ── QR Codes ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event QR */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FaQrcode size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Event QR</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Guests scan to open this event page
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="btn-secondary !py-2 !px-4 !rounded-lg !text-xs shrink-0"
            >
              <FiDownload size={13} />
              Download
            </button>
          </div>
          {qrDataUrl ? (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm shrink-0">
                <img
                  src={qrDataUrl}
                  alt="Event QR code"
                  className="w-36 h-36"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                  Scan Destination
                </p>
                <p className="break-all text-xs text-gray-500 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100 font-mono">
                  {`${baseUrl}/events/discover/${eventId}?qr=1`}
                </p>
                <p className="text-xs text-indigo-600 font-medium mt-2">
                  Guests get prompted based on their account status
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <FaSpinner className="animate-spin text-indigo-500" />
              Generating QR...
            </div>
          )}
        </div>

        {/* Attendance QR */}
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
                  Guests scan on the day of the event
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
                  {`${baseUrl}/events/attendance/${eventId}`}
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-2">
                  → Marks user as "attended" immediately
                </p>
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