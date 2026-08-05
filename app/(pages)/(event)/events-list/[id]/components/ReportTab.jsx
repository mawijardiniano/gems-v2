"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import {
  FiEdit2,
  FiUpload,
  FiX,
  FiPaperclip,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiEye,
} from "react-icons/fi";
import { FaMagic } from "react-icons/fa";

export default function ReportTab({ event }) {
  const [form, setForm] = useState({ narrative: "" });
  const [files, setFiles] = useState({
    office_memorandum: null,
    activity_design: null,
    attendance_sheet: null,
    photos: [],
    other_attachments: [],
  });
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [deletedPhotoKeys, setDeletedPhotoKeys] = useState([]);
  const [deletedAttachmentKeys, setDeletedAttachmentKeys] = useState([]);

  const generateNarrative = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/events/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          venue: event.venue,
          number_of_days: event.number_of_days ?? event.start_dates?.length ?? 1,
          type_of_activity: event.type_of_activity,
          gad_activity: event.gad_activity,
          eligibility_criteria: event.eligibility_criteria,
          target_number_of_participants: event.target_number_of_participants,
          registered_count: event.registered_users?.length,
          organizing_office_unit: event.organizing_office_unit,
          start_dates: event.start_dates,
        }),
      });

      const data = await response.json();
      setForm((prev) => ({ ...prev, narrative: data.description }));
    } catch (err) {
      setError("Failed to generate narrative.");
    } finally {
      setGenerating(false);
    }
  };

  const deleteFileByKey = async (key) => {
    if (!key) return;
    try {
      await axios.delete("/api/upload", { data: { key } });
    } catch (err) {
      console.log("Failed to delete old file:", err);
    }
  };

  const handleEdit = () => {
    setForm({ narrative: showReport?.narrative || "" });
    setFiles({
      office_memorandum: showReport?.office_memorandum || null,
      activity_design: showReport?.activity_design || null,
      attendance_sheet: showReport?.attendance_sheet || null,
      photos: showReport?.photos || [],
      other_attachments: showReport?.other_attachments || [],
    });
    setIsEditing(true);
  };

  const handleSingleFileUpload = async (file, field, folder) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles((prev) => {
        const oldFile = prev[field];
        if (oldFile?.key) deleteFileByKey(oldFile.key);
        return { ...prev, [field]: { url: res.data.url, key: res.data.key } };
      });
    } catch {
      setError(`Failed to upload ${field}`);
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handlePhotosUpload = async (fileList) => {
    setUploading((prev) => ({ ...prev, photos: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "reports/photos");
          const res = await axios.post("/api/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return { url: res.data.url, key: res.data.key };
        }),
      );
      setFiles((prev) => ({
        ...prev,
        photos: isEditing ? [...prev.photos, ...uploaded] : uploaded,
      }));
    } catch {
      setError("Failed to upload photos");
    } finally {
      setUploading((prev) => ({ ...prev, photos: false }));
    }
  };

  const handleOtherAttachmentsUpload = async (fileList) => {
    setUploading((prev) => ({ ...prev, other_attachments: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "reports/other-attachments");
          const res = await axios.post("/api/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return { url: res.data.url, key: res.data.key, name: file.name };
        }),
      );
      setFiles((prev) => ({
        ...prev,
        other_attachments: [...prev.other_attachments, ...uploaded],
      }));
    } catch {
      setError("Failed to upload attachments");
    } finally {
      setUploading((prev) => ({ ...prev, other_attachments: false }));
    }
  };

  const removePhoto = (idx) => {
    setDeletedPhotoKeys((prev) => {
      const photo = files.photos[idx];
      if (!photo?.key) return prev;
      return [...prev, photo.key];
    });
    setFiles((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  const removeOtherAttachment = (idx) => {
    setDeletedAttachmentKeys((prev) => {
      const file = files.other_attachments[idx];
      if (!file?.key) return prev;
      return [...prev, file.key];
    });
    setFiles((prev) => ({
      ...prev,
      other_attachments: prev.other_attachments.filter((_, i) => i !== idx),
    }));
  };

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/events/accomplishment-report/${event._id}`);
      const data = await res.json();

      if (!data?.data) {
        setShowReport(null);
        return;
      }

      const report = data.data;

      const hasContent =
        report.narrative?.trim() ||
        report.office_memorandum?.url ||
        report.activity_design?.url ||
        report.attendance_sheet?.url ||
        report.photos?.length > 0 ||
        report.other_attachments?.length > 0;

      if (!hasContent) {
        setShowReport(null);
        return;
      }

      setShowReport(report);
    } catch {
      setShowReport(null);
    }
  };

  useEffect(() => {
    if (event?._id) fetchReport();
  }, [event?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const url = isEditing
        ? `/api/events/accomplishment-report/${event._id}`
        : `/api/events/accomplishment-report`;
      const method = isEditing ? "PUT" : "POST";

      const currentFiles = { ...files };
      const currentDeletedPhotoKeys = [...deletedPhotoKeys];
      const currentDeletedAttachmentKeys = [...deletedAttachmentKeys];

      if (currentDeletedPhotoKeys.length > 0) {
        await Promise.all(
          currentDeletedPhotoKeys.map((key) => deleteFileByKey(key)),
        );
      }
      if (currentDeletedAttachmentKeys.length > 0) {
        await Promise.all(
          currentDeletedAttachmentKeys.map((key) => deleteFileByKey(key)),
        );
      }

      const payload = {
        event_id: event._id,
        narrative: form.narrative,
        office_memorandum: currentFiles.office_memorandum,
        activity_design: currentFiles.activity_design,
        attendance_sheet: currentFiles.attendance_sheet,
        photos: currentFiles.photos.filter(
          (p) => !currentDeletedPhotoKeys.includes(p.key),
        ),
        other_attachments: currentFiles.other_attachments.filter(
          (p) => !currentDeletedAttachmentKeys.includes(p.key),
        ),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to submit");
      }

      const responseData = await res.json();
      const savedReport = responseData.data || responseData;

      setShowReport(savedReport);

      setSuccess(
        isEditing
          ? "Report updated successfully."
          : "Report submitted successfully.",
      );
      setForm({ narrative: "" });
      setFiles({
        office_memorandum: null,
        activity_design: null,
        attendance_sheet: null,
        photos: [],
        other_attachments: [],
      });
      setDeletedPhotoKeys([]);
      setDeletedAttachmentKeys([]);
      setIsEditing(false);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const singleFileFields = [
    {
      key: "office_memorandum",
      label: "Office Memorandum",
      folder: "reports/memorandum",
    },
    {
      key: "activity_design",
      label: "Activity Design",
      folder: "reports/activity-design",
    },
    {
      key: "attendance_sheet",
      label: "Attendance Sheet",
      folder: "reports/attendance",
    },
  ];

  if (showReport !== null && !isEditing) {
    return (
      <div className="space-y-6 animate-fade-in">
        {previewImg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
            onClick={() => setPreviewImg(null)}
          >
            <img
              src={previewImg}
              className="max-w-[90%] max-h-[90%] rounded-2xl shadow-2xl"
            />
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FiCheckCircle size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Accomplishment Report
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Submitted report for this event
                </p>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="btn-secondary !py-2 !px-4 !rounded-lg !text-xs shrink-0"
            >
              <FiEdit2 size={13} />
              Edit
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Narrative
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed rounded-xl bg-slate-50 p-5 border border-slate-100">
                {showReport.narrative}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {singleFileFields.map((field) => (
                <div key={field.key}>
                  <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    {field.label}
                  </h4>
                  {showReport[field.key]?.url ? (
                    <div className="group relative">
                      <img
                        src={showReport[field.key].url}
                        className="h-40 w-full object-cover rounded-xl border border-gray-200 transition-all duration-200 group-hover:opacity-90 group-hover:shadow-md"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                        <button
                          onClick={() => setPreviewImg(showReport[field.key].url)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
                        >
                          <FiEye size={12} />
                          View
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                      No file uploaded
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Event Photos
              </h4>
              {showReport.photos?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {showReport.photos.map((p, i) => (
                    <div key={i} className="group relative">
                      <img
                        src={p.url}
                        className="h-40 w-full object-cover rounded-xl border border-gray-200 transition-all duration-200 group-hover:opacity-90 group-hover:shadow-md"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                        <button
                          onClick={() => setPreviewImg(p.url)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
                        >
                          <FiEye size={12} />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                  No photos uploaded
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Other Attachments
              </h4>
              {showReport.other_attachments?.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {showReport.other_attachments.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white hover:bg-gray-50 text-blue-600 hover:underline transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FiPaperclip size={14} />
                      </span>
                      {file.name || `Attachment ${i + 1}`}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                  No attachments uploaded
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-8"
      >
        {/* ── Section Header ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FiFileText size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Post-Activity Report
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              Submit the official report for this event
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
            <FiAlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-3">
            <FiCheckCircle size={16} className="shrink-0" />
            {success}
          </div>
        )}

        {/* ── Narrative ───────────────────────────────────────────── */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label !mb-0">
              Narrative Report <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={generateNarrative}
              disabled={generating}
              className="btn-secondary !py-1.5 !px-3 !text-xs !rounded-lg"
            >
              <FaMagic className="text-violet-500" size={12} />
              {generating ? "Generating..." : "Generate Narrative"}
            </button>
          </div>
          <textarea
            name="narrative"
            value={form.narrative}
            onChange={(e) => setForm({ ...form, narrative: e.target.value })}
            className="input min-h-[120px] resize-y"
            placeholder="Describe what happened during the event..."
          />
        </div>

        {/* ── Required Documents ──────────────────────────────────── */}
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
            Required Documents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {singleFileFields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-gray-100 bg-slate-50/50 p-4"
              >
                <label className="label">
                  {field.label} <span className="text-red-500">*</span>
                </label>
                <div className="file-input">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleSingleFileUpload(
                        e.target.files[0],
                        field.key,
                        field.folder,
                      )
                    }
                  />
                </div>
                {uploading[field.key] && (
                  <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                    <FiLoader className="animate-spin" /> Uploading...
                  </p>
                )}
                {files[field.key]?.url && (
                  <div className="relative mt-3 inline-block">
                    <img
                      src={files[field.key].url}
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                      onClick={() =>
                        setFiles((prev) => ({ ...prev, [field.key]: null }))
                      }
                    >
                      <FiX size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Event Photos ────────────────────────────────────────── */}
        <div>
          <label className="label">
            Event Photos <span className="text-red-500">*</span>
          </label>
          <div className="file-input">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotosUpload(e.target.files)}
            />
          </div>
          {uploading.photos && (
            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
              <FiLoader className="animate-spin" /> Uploading photos...
            </p>
          )}
          {files.photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {files.photos.map((p, i) => (
                <div key={i} className="relative group">
                  <img
                    src={p.url}
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                    alt={`photo-${i}`}
                  />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                    onClick={() => removePhoto(i)}
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Other Attachments ───────────────────────────────────── */}
        <div>
          <label className="label">
            Other Attachments <span className="text-red-500">*</span>
          </label>
          <div className="file-input">
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              multiple
              onChange={(e) => handleOtherAttachmentsUpload(e.target.files)}
            />
          </div>
          {uploading.other_attachments && (
            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
              <FiLoader className="animate-spin" /> Uploading attachments...
            </p>
          )}
          {files.other_attachments.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              {files.other_attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <FiPaperclip size={14} />
                  </span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex-1 truncate"
                  >
                    {file.name || `Attachment ${i + 1}`}
                  </a>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 shrink-0"
                    onClick={() => removeOtherAttachment(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-5 border-t border-gray-100">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setForm({ narrative: "" });
                setFiles({
                  office_memorandum: null,
                  activity_design: null,
                  attendance_sheet: null,
                  photos: [],
                  other_attachments: [],
                });
                setDeletedPhotoKeys([]);
                setDeletedAttachmentKeys([]);
                setShowReport(showReport);
              }}
              className="btn-secondary !rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary !rounded-lg"
          >
            {submitting ? (
              <>
                <FiLoader className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <FiUpload size={14} />
                {isEditing ? "Update Report" : "Submit Report"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}