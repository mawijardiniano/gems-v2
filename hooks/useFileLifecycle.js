"use client";

import { useCallback, useRef } from "react";

async function deleteStoredFile(key) {
  try {
    await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  } catch (err) {
    console.warn("useFileLifecycle: failed to delete file:", key, err);
  }
}

const toKeySet = (keys) => new Set((keys || []).filter(Boolean));


export function useFileLifecycle() {
  const originalKeysRef = useRef(toKeySet());
  const currentKeysRef = useRef(toKeySet());

  const startSession = useCallback((keys) => {
    originalKeysRef.current = toKeySet(keys);
    currentKeysRef.current = new Set(originalKeysRef.current);
  }, []);

  const syncCurrent = useCallback((keys) => {
    currentKeysRef.current = toKeySet(keys);
  }, []);

  const hasOriginal = useCallback(
    (key) => Boolean(key) && originalKeysRef.current.has(key),
    [],
  );

  const commit = useCallback(async () => {
    const removed = [...originalKeysRef.current].filter(
      (k) => !currentKeysRef.current.has(k),
    );
    await Promise.all(removed.map(deleteStoredFile));
    originalKeysRef.current = new Set(currentKeysRef.current);
    return removed;
  }, []);

  const rollback = useCallback(async () => {
    const added = [...currentKeysRef.current].filter(
      (k) => !originalKeysRef.current.has(k),
    );
    await Promise.all(added.map(deleteStoredFile));
    currentKeysRef.current = new Set(originalKeysRef.current);
    return added;
  }, []);

  const resetSession = useCallback(() => {
    originalKeysRef.current = toKeySet();
    currentKeysRef.current = toKeySet();
  }, []);

  return {
    startSession,
    syncCurrent,
    hasOriginal,
    commit,
    rollback,
    resetSession,
  };
}