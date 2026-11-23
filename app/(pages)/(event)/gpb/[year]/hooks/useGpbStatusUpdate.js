"use client";

import { useState } from "react";
import {
  deleteUploadedFile,
  readJson,
  uploadFile,
} from "@/data/lib/uploadClient";

/* The "Update Status" modal: status, reason and an optional scanned copy. */
export function useGpbStatusUpdate({ gpbId, gpbStatus, onUpdated, onError }) {
  const [open, setOpen] = useState(false);
  const [statusType, setStatusType] = useState("approved");
  const [reasonField, setReasonField] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  /* The modal opens with the saved reason: the API replaces the reason with
     whatever is sent (so it can be cleared), and an empty field would
     silently wipe it on every status update. */
  /* It also opens on the saved status and with no file picked: a file picked
     and then cancelled used to stay selected and be uploaded on the next save,
     while the file input looked empty. */
  const openModal = () => {
    setReasonField(gpbStatus?.reason || "");
    setStatusType(gpbStatus?.status || "approved");
    setSelectedFile(null);
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setSelectedFile(null);
    setOpen(false);
  };

  /* `setOpen` keeps the prop the modal component already uses; it no longer
     closes mid-save. */
  const setUpdateStatusModal = (value) => (value ? openModal() : closeModal());

  const handleUpdateStatus = async () => {
    if (saving) return;
    setSaving(true);
    const oldKey = gpbStatus?.scanned_copy?.key;
    let uploadedKey = null;
    try {
      let scanned_copy = gpbStatus?.scanned_copy || { url: "", key: "" };

      if (selectedFile) {
        scanned_copy = await uploadFile(selectedFile, "status/scanned");
        uploadedKey = scanned_copy.key;
      }

      const res = await fetch(`/api/gpb/status/${gpbId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusType,
          reason: reasonField,
          scanned_copy,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update status");
      }

      if (uploadedKey && oldKey && oldKey !== uploadedKey) {
        await deleteUploadedFile(oldKey);
      }
      uploadedKey = null;

      setOpen(false);
      setReasonField("");
      setStatusType("approved");
      setSelectedFile(null);
      onUpdated?.();
    } catch (error) {
      console.error(error);
      // The new upload is not linked to anything if the update failed.
      if (uploadedKey) await deleteUploadedFile(uploadedKey);
      onError?.(error.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    open,
    openModal,
    closeModal,
    setUpdateStatusModal,
    statusType,
    setStatusType,
    reasonField,
    setReasonField,
    selectedFile,
    setSelectedFile,
    saving,
    handleUpdateStatus,
  };
}

/* The full-screen preview of the GPB's scanned copy. */
export function useScannedViewer(scannedCopyUrl) {
  const [open, setOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");

  const openViewer = () => {
    setPreviewLoading(true);
    setPreviewError("");
    setOpen(true);
  };

  const download = () => {
    if (!scannedCopyUrl) return;
    /* A new tab: without it, Download replaced the GPB page with the file. */
    const link = document.createElement("a");
    link.href = scannedCopyUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return {
    open: open && Boolean(scannedCopyUrl),
    openViewer,
    closeViewer: () => setOpen(false),
    download,
    previewLoading,
    setPreviewLoading,
    previewError,
    setPreviewError,
  };
}
