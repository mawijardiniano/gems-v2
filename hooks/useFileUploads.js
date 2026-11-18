"use client";

import { useCallback, useState } from "react";
import { useFileLifecycle } from "@/hooks/useFileLifecycle";
import {
  deleteUploadedFile,
  deleteUploadedFiles,
  uploadFiles,
  validateFiles,
} from "@/data/lib/uploadClient";

/* File attachments for a form that saves them onto a record.

   - upload(fileList, { folder, label, target }) validates and uploads the
     files, returning [{ url, key, name }]. On a validation or upload error
     it throws (nothing is left behind). `uploading` holds `target` (e.g. a
     row id) while it runs, so the form can show which field is busy.
   - The file lifecycle (startSession / syncCurrent / commit / rollback /
     resetSession) tracks which keys are saved, so Cancel deletes what this
     session uploaded and a save deletes what it dropped.
   - release(file) is for removing a file from the form: a file uploaded in
     this session is deleted now; a saved one waits for commit().
   - discard(files) deletes uploads that never reached the form (for
     example, their row was removed while they uploaded). */
export function useFileUploads() {
  const lifecycle = useFileLifecycle();
  const [uploading, setUploading] = useState(null);
  const { hasOriginal } = lifecycle;

  const upload = useCallback(
    async (fileList, { folder, label = "Files", types, maxBytes, target = true }) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return [];
      const problem = validateFiles(files, { label, types, maxBytes });
      if (problem) throw new Error(problem);
      setUploading(target);
      try {
        return await uploadFiles(files, folder);
      } finally {
        setUploading(null);
      }
    },
    [],
  );

  const release = useCallback(
    (file) => {
      if (file?.key && !hasOriginal(file.key)) deleteUploadedFile(file.key);
    },
    [hasOriginal],
  );

  return {
    ...lifecycle,
    uploading,
    isUploading: uploading !== null,
    upload,
    release,
    discard: deleteUploadedFiles,
  };
}
