"use client";

import { useState } from "react";

/* Best-effort cleanup of an uploaded scanned copy. The upload route only
   deletes files the caller is allowed to manage. */
async function deleteUploadedFile(key) {
  if (!key) return;
  try {
    await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  } catch (err) {
    console.error("Failed to delete file:", err);
  }
}

/* The "Update Status" modal: status, reason and an optional scanned copy. */
export function useGpbStatusUpdate({ gpbId, gpbStatus, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [statusType, setStatusType] = useState("approved");
  const [reasonField, setReasonField] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  /* The modal opens with the saved reason: the API replaces the reason with
     whatever is sent (so it can be cleared), and an empty field would
     silently wipe it on every status update. */
  const openModal = () => {
    setReasonField(gpbStatus?.reason || "");
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
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
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folder", "status/scanned");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload scanned copy");
        }
        scanned_copy = { url: uploadData.url, key: uploadData.key };
        uploadedKey = uploadData.key;
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
      const data = await res.json().catch(() => ({}));
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
      alert(error.message);
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
    const link = document.createElement("a");
    link.href = scannedCopyUrl;
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
