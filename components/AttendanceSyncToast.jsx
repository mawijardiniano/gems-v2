"use client";

import { useEffect, useRef, useState } from "react";
import {
  syncQueuedAttendance,
  hasQueuedAttendance,
} from "@/lib/pwa/attendanceQueue";

export default function AttendanceSyncToast() {
  const [toasts, setToasts] = useState([]);
  const syncingRef = useRef(false);

  // Show a toast notification to the user
  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Build an appropriate message from the synced items
  const buildSyncMessage = (items) => {
    const alreadyAttended = items.filter((item) => item.already_attended);
    const rejected = items.filter((item) => item.error_code);
    const confirmed = items.filter(
      (item) => !item.already_attended && !item.error_code,
    );

    // If any were rejected because the event wasn't open, tell the user
    if (rejected.length > 0) {
      const rejectedMsgs = rejected.map((item) => {
        if (item.error_code === "EVENT_NOT_STARTED") {
          return "the event hadn't started yet";
        }
        if (item.error_code === "EVENT_EXPIRED") {
          return "the event had already ended";
        }
        return "the event was no longer valid";
      });
      return {
        message: `Your offline attendance could not be recorded — ${rejectedMsgs.join(
          ", ",
        )}.`,
        type: "error",
      };
    }

    if (alreadyAttended.length > 0 && confirmed.length === 0) {
      return {
        message: `You were already marked as attended for ${alreadyAttended.length} event(s).`,
        type: "info",
      };
    }

    if (confirmed.length > 0 && alreadyAttended.length === 0) {
      return {
        message: `Your attendance for ${confirmed.length} event(s) has been confirmed! ✅`,
        type: "success",
      };
    }

    return {
      message: `Your offline attendance has been synced — ${confirmed.length} confirmed, ${alreadyAttended.length} already marked.`,
      type: "success",
    };
  };

  // Handle when the service worker confirms queued attendance was synced
  const handleServiceWorkerMessage = (event) => {
    const data = event?.data;
    if (!data) return;
    if (data.type === "ATTENDANCE_SYNCED" && Array.isArray(data.items)) {
      if (data.items.length > 0) {
        const { message, type } = buildSyncMessage(data.items);
        showToast(message, type);
      }
    }
  };

  // Try to sync the queue. Returns true if anything was synced.
  const attemptSync = async () => {
    if (syncingRef.current) return false;
    syncingRef.current = true;
    try {
      const synced = await syncQueuedAttendance();
      if (synced.length > 0) {
        const { message, type } = buildSyncMessage(synced);
        showToast(message, type);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to sync queued attendance:", err);
      return false;
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    // Listen for service worker messages about synced attendance
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    // Listen for the browser coming back online (fallback for no Background Sync)
    window.addEventListener("online", attemptSync);

    // Periodically check the queue — navigator.onLine is unreliable on mobile,
    // so we just try to sync every 10 seconds if there's anything queued.
    // This guarantees the sync happens even if the "online" event never fires.
    const interval = setInterval(async () => {
      const hasQueued = await hasQueuedAttendance();
      if (hasQueued) {
        await attemptSync();
      }
    }, 10000);

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
      window.removeEventListener("online", attemptSync);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-slide-up rounded-lg shadow-xl px-5 py-4 max-w-sm text-white text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "info"
                ? "bg-blue-600"
                : "bg-red-600"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">
              {toast.type === "success" ? "✅" : toast.type === "info" ? "📋" : "❌"}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}