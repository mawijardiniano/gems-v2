"use client";

import { useEffect, useRef, useState } from "react";
import {
  syncQueuedAttendance,
  hasQueuedAttendance,
} from "@/lib/pwa/attendanceQueue";

export default function AttendanceSyncToast() {
  const [toasts, setToasts] = useState([]);
  const syncingRef = useRef(false);


  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const buildSyncMessage = (items) => {
    const alreadyAttended = items.filter((item) => item.already_attended);
    const rejected = items.filter((item) => item.error_code);
    const confirmed = items.filter(
      (item) => !item.already_attended && !item.error_code,
    );

    if (rejected.length > 0) {
      return {
        message: "Attendance Failed",
        type: "error",
      };
    }

    if (alreadyAttended.length > 0 && confirmed.length === 0) {
      return {
        message: "Already Attended",
        type: "info",
      };
    }

    return {
      message: "Attendance Confirmed!",
      type: "success",
    };
  };


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

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }


    window.addEventListener("online", attemptSync);


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