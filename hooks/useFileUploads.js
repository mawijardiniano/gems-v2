"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFileLifecycle } from "@/hooks/useFileLifecycle";
import {
  deleteUploadedFile,
  deleteUploadedFiles,
  uploadFiles,
  validateFiles,
} from "@/data/lib/uploadClient";

/* File attachments for a form that saves them onto a record.

   - upload(fileList, { folder, label, maxBytes, target }) checks the files
     against the folder's rules (data/lib/uploadRules.js), uploads them and
     returns [{ url, key, name }]. A validation or upload error throws, with
     nothing left behind. It returns null when the form moved on while the
     upload ran (Cancel, a new session, unmount): those files are deleted
     instead of landing in a closed form.
   - `target` names what is uploading (a field, a row): isUploadingTarget(t)
     and `uploading` (the latest target, or null) drive per-field spinners;
     `isUploading` is true while any upload runs, however many overlap.
   - The file lifecycle (startSession / syncCurrent / commit / rollback /
     resetSession) tracks which keys are saved, so Cancel deletes what this
     session uploaded and a save deletes what it dropped.
   - release(file) is for removing a file from the form: one uploaded in
     this session is deleted now; a saved one waits for commit().
   - discard(files) deletes uploads that never reached the form.
   - { rollbackOnUnmount: true } runs rollback() when the component goes
     away (a tab switch), so unsaved uploads are not orphaned. After a
     commit() there is nothing new to roll back. */
export function useFileUploads({ rollbackOnUnmount = false } = {}) {
  const lifecycle = useFileLifecycle();
  const { hasOriginal } = lifecycle;

  /* Running uploads per target. */
  const [running, setRunning] = useState({});
  const [latestTarget, setLatestTarget] = useState(null);

  /* Bumped whenever the form's file set starts over; an upload started in
     an older session must not write into the new one. */
  const sessionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      if (rollbackOnUnmount) lifecycle.rollback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = (target, delta) =>
    setRunning((prev) => {
      const key = String(target);
      const next = { ...prev, [key]: (prev[key] || 0) + delta };
      if (next[key] <= 0) delete next[key];
      return next;
    });

  const upload = useCallback(
    async (
      fileList,
      { folder, label = "Files", exts, types, maxBytes, target = "default" },
    ) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return [];
      const problem = validateFiles(files, {
        folder,
        exts,
        types,
        maxBytes,
        label,
      });
      if (problem) throw new Error(problem);

      const session = sessionRef.current;
      bump(target, 1);
      setLatestTarget(target);
      try {
        const uploaded = await uploadFiles(files, folder);
        if (!mountedRef.current || session !== sessionRef.current) {
          await deleteUploadedFiles(uploaded);
          return null;
        }
        return uploaded;
      } finally {
        if (mountedRef.current) {
          bump(target, -1);
          setLatestTarget((t) => (t === target ? null : t));
        }
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

  /* A new session, a rollback or a reset all start the file set over. */
  const startSession = useCallback(
    (keys) => {
      sessionRef.current += 1;
      lifecycle.startSession(keys);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const rollback = useCallback(async () => {
    sessionRef.current += 1;
    return lifecycle.rollback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const resetSession = useCallback(() => {
    sessionRef.current += 1;
    lifecycle.resetSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runningTargets = Object.keys(running);
  const isUploading = runningTargets.length > 0;

  return {
    ...lifecycle,
    startSession,
    rollback,
    resetSession,
    /* The latest target still uploading, or null. */
    uploading: isUploading ? latestTarget ?? runningTargets[0] : null,
    isUploading,
    isUploadingTarget: (target) => Boolean(running[String(target)]),
    upload,
    release,
    discard: deleteUploadedFiles,
  };
}
