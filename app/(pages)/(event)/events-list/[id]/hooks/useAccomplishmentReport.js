"use client";

import { useEffect, useRef, useState } from "react";
import { useFileUploads } from "@/hooks/useFileUploads";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { MAX_UPLOAD_FILE_BYTES } from "@/data/lib/uploadRules";
import { readJson } from "@/data/lib/uploadClient";
import { fileKeyOf } from "@/data/lib/eventFileKeys";

export const EMPTY_FILES = {
  office_memorandum: null,
  activity_design: null,
  attendance_sheet: null,
  photos: [],
  other_attachments: [],
};

/* The accomplishment report of one event: loading it, the form's text and
   files, uploads (through the shared upload hook), AI narrative, submit and
   edit. ReportTab renders it with ReportView and ReportForm. */
export function useAccomplishmentReport({
  event,
  approvedGuestCount = 0,
  attendedCount = 0,
}) {
  const [form, setForm] = useState({ narrative: "" });
  const [files, setFilesState] = useState(EMPTY_FILES);
  /* Uploads finish asynchronously, so each one must build on the latest file
     list, not the one captured when it started; otherwise two uploads in
     flight overwrite each other and one file is lost (but left in storage). */
  const filesRef = useRef(EMPTY_FILES);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(null);
  /* A failed or pending load used to look like "no report yet" and showed
     the empty form, so people re-entered a report that already existed. */
  const [reportLoading, setReportLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  /* Uploads, checks and cleanup through the shared hook. Rolled back on
     unmount: switching tabs mid-draft used to orphan every upload. A file
     that finishes after Cancel is deleted instead of landing in a closed
     form. */
  const fileLifecycle = useFileUploads({ rollbackOnUnmount: true });
  useEscapeKey(Boolean(previewImg), () => setPreviewImg(null));

  /* Replace the file list outright (start/end of an edit session). */
  const setFiles = (next) => {
    filesRef.current = next;
    setFilesState(next);
  };
  /* Apply a change to the latest list and keep the lifecycle in step. */
  const updateFiles = (change) => {
    const next = change(filesRef.current);
    setFiles(next);
    fileLifecycle.syncCurrent(keysOf(next));
    return next;
  };
  const isUploading = fileLifecycle.isUploading;

  const keysOf = (f) =>
    [
      f?.office_memorandum?.key,
      f?.activity_design?.key,
      f?.attendance_sheet?.key,
      ...(f?.photos || []).map((p) => p?.key),
      ...(f?.other_attachments || []).map((a) => a?.key),
    ].filter(Boolean);

  const generateNarrative = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/events/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          venue: event.venue,
          type_of_activity: event.type_of_activity,
          gad_activity: event.gad_activity,
          registered_count:
            attendedCount || approvedGuestCount,
          organizing_office_unit: event.organizing_office_unit,
          start_date:
            event.start_date ||
            (event.start_dates || [])[0] ||
            undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      /* A failed request used to set the narrative to undefined and wipe
         whatever the user had typed. */
      if (!response.ok || typeof data.description !== "string") {
        throw new Error(data.message || "Failed to generate narrative.");
      }
      setForm((prev) => ({ ...prev, narrative: data.description }));
    } catch (err) {
      setError("Failed to generate narrative.");
    } finally {
      setGenerating(false);
    }
  };

  /* Checked against the folder's rule before uploading; files uploaded
     before a failure in the same batch are deleted (uploadFiles). Returns
     null when nothing should be added. */
  const uploadInto = async (fileList, { folder, field, label }) => {
    setError("");
    try {
      return await fileLifecycle.upload(fileList, {
        folder,
        label,
        maxBytes: MAX_UPLOAD_FILE_BYTES,
        target: field,
      });
    } catch (err) {
      setError(err.message || `Failed to upload ${label.toLowerCase()}.`);
      return null;
    }
  };

  const handleDownload = (file) => {
    if (!file?.key && !file?.url) return;
    const key = fileKeyOf(file);
    if (!key) return;

    const nameParam = file.name
      ? `&name=${encodeURIComponent(file.name)}`
      : "";
    const link = document.createElement("a");
    link.href = `/api/download?key=${encodeURIComponent(key)}${nameParam}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleEdit = () => {
    const editFiles = {
      office_memorandum: showReport?.office_memorandum || null,
      activity_design: showReport?.activity_design || null,
      attendance_sheet: showReport?.attendance_sheet || null,
      photos: showReport?.photos || [],
      other_attachments: showReport?.other_attachments || [],
    };
    setForm({ narrative: showReport?.narrative || "" });
    setFiles(editFiles);
    fileLifecycle.startSession(keysOf(editFiles));
    setIsEditing(true);
  };

  const handleSingleFileUpload = async (file, field, folder, label) => {
    if (!file) return;
    const uploaded = await uploadInto([file], { folder, field, label });
    if (!uploaded?.length) return;
    const oldFile = filesRef.current[field];
    updateFiles((prev) => ({ ...prev, [field]: uploaded[0] }));
    /* The file it replaces is deleted now if it was uploaded in this edit;
       a saved one waits for the save (commit). */
    if (oldFile) fileLifecycle.release(oldFile);
  };

  /* One by one with cleanup on failure: a rejected photo used to leave the
     ones uploaded in parallel with it in storage, on no record. */
  const handlePhotosUpload = async (fileList) => {
    const uploaded = await uploadInto(fileList, {
      folder: "reports/photos",
      field: "photos",
      label: "Photos",
    });
    if (!uploaded?.length) return;
    updateFiles((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }));
  };

  const handleOtherAttachmentsUpload = async (fileList) => {
    const uploaded = await uploadInto(fileList, {
      folder: "reports/other-attachments",
      field: "other_attachments",
      label: "Attachments",
    });
    if (!uploaded?.length) return;
    updateFiles((prev) => ({
      ...prev,
      other_attachments: [...prev.other_attachments, ...uploaded],
    }));
  };

  const removePhoto = (idx) => {
    const photo = filesRef.current.photos[idx];
    updateFiles((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
    fileLifecycle.release(photo);
  };

  const removeOtherAttachment = (idx) => {
    const attachment = filesRef.current.other_attachments[idx];
    updateFiles((prev) => ({
      ...prev,
      other_attachments: prev.other_attachments.filter((_, i) => i !== idx),
    }));
    fileLifecycle.release(attachment);
  };

  const fetchReport = async () => {
    setReportLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/events/accomplishment-report/${event._id}`);
      const data = await readJson(res);
      if (!res.ok) {
        setLoadError(
          res.status === 403
            ? "You are not allowed to view this event's report."
            : data?.message || data?.error || "Unable to load the report.",
        );
        return;
      }

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
      setLoadError("Unable to load the report. Check your connection.");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (event?._id) fetchReport();
  }, [event?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isUploading) {
      setError("Please wait for the uploads to finish.");
      return;
    }
    /* The fields marked * on the form; Other Attachments is optional. */
    const missing = [
      !form.narrative?.trim() && "Narrative Report",
      ...singleFileFields
        .filter((field) => !files[field.key]?.url)
        .map((field) => field.label),
      files.photos.length === 0 && "Event Photos",
    ].filter(Boolean);
    if (missing.length) {
      setError(`Please complete: ${missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);

    try {
      const url = isEditing
        ? `/api/events/accomplishment-report/${event._id}`
        : `/api/events/accomplishment-report`;
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        event_id: event._id,
        narrative: form.narrative,
        office_memorandum: files.office_memorandum,
        activity_design: files.activity_design,
        attendance_sheet: files.attendance_sheet,
        photos: files.photos,
        other_attachments: files.other_attachments,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to submit");
      }

      const responseData = await readJson(res);
      const savedReport = responseData.data || responseData;

      await fileLifecycle.commit();

      setShowReport(savedReport);

      setSuccess(
        isEditing
          ? "Report updated successfully."
          : "Report submitted successfully.",
      );
      setForm({ narrative: "" });
      setFiles(EMPTY_FILES);
      fileLifecycle.resetSession();
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


  return {
    form,
    setForm,
    files,
    setFilesState,
    filesRef,
    generating,
    setGenerating,
    submitting,
    setSubmitting,
    success,
    setSuccess,
    error,
    setError,
    showReport,
    setShowReport,
    reportLoading,
    setReportLoading,
    loadError,
    setLoadError,
    isEditing,
    setIsEditing,
    previewImg,
    setPreviewImg,
    fileLifecycle,
    setFiles,
    updateFiles,
    isUploading,
    keysOf,
    generateNarrative,
    uploadInto,
    handleDownload,
    handleEdit,
    handleSingleFileUpload,
    handlePhotosUpload,
    handleOtherAttachmentsUpload,
    removePhoto,
    removeOtherAttachment,
    fetchReport,
    handleSubmit,
    singleFileFields,
  };
}
