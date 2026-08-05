"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import {
  queueAttendance,
  registerAttendanceSync,
  isOnline,
  getQueuedAttendance,
  removeQueuedAttendance,
  syncQueuedAttendance,
} from "@/lib/pwa/attendanceQueue";

export default function AttendanceModal({
  eventId,
  isOpen,
  onClose,
  onAttendanceRecorded,
}) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendedAt, setAttendedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);

  // Reset all state when the modal opens so stale state from a previous
  // open doesn't leak into the new session.
  useEffect(() => {
    if (!isOpen) return;
    setEvent(null);
    setLoading(true);
    setError("");
    setAttendanceStatus(null);
    setAttendanceMessage("");
    setAttendedAt(null);
    setSubmitting(false);
    setQueued(false);
    setProfileChecked(false);
    setUserId(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loadProfile = async () => {
      try {
        const profileRes = await axios.get("/api/profile/my-profile");
        setUserId(profileRes.data?.user?._id || null);
      } catch (profileErr) {
        const status = profileErr?.response?.status;
        if (status === 401 || status === 403) {
          setUserId(null);
        } else {
          console.error(profileErr);
        }
      } finally {
        setProfileChecked(true);
      }
    };

    loadProfile();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/api/events/${eventId}`);
        const data = res.data?.data || null;
        if (!data) {
          setError("Event not found.");
        }
        setEvent(data);
      } catch (err) {
        const offline = err?.response?.status === 503 || !navigator.onLine;
        if (offline) {
          setError(
            "You're offline. Attendance will be queued and sync automatically.",
          );
        } else {
          setError(err.response?.data?.message || "Unable to load event.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId, isOpen]);

  // When the browser reconnects while the modal is still showing "Saved Offline",
  // immediately sync the queue and update the modal to the real result.
  useEffect(() => {
    if (!isOpen || !queued || !eventId || !userId) return;

    const handleOnline = async () => {
      try {
        const synced = await syncQueuedAttendance();
        const myItem = synced.find(
          (s) =>
            s.event_id?.toString() === eventId?.toString() &&
            s.user_id?.toString() === userId?.toString(),
        );
        if (!myItem) return;

        if (myItem.error_code) {
          setQueued(false);
          setAttendanceStatus("error");
          if (myItem.error_code === "EVENT_NOT_STARTED") {
            setAttendanceMessage(
              "Your offline attendance could not be recorded — the event had not started yet.",
            );
          } else if (myItem.error_code === "EVENT_EXPIRED") {
            setAttendanceMessage(
              "Your offline attendance could not be recorded — the event had already ended.",
            );
          } else {
            setAttendanceMessage(
              "Your offline attendance could not be recorded.",
            );
          }
          return;
        }

        if (myItem.already_attended) {
          setQueued(false);
          setAttendanceStatus("already");
          setAttendanceMessage("You are already marked as attended!");
          setAttendedAt(myItem.captured_at || new Date().toISOString());
          onAttendanceRecorded?.();
          return;
        }

        // Successfully synced
        setQueued(false);
        setAttendanceStatus("success");
        setAttendanceMessage("Attendance recorded successfully!");
        setAttendedAt(myItem.captured_at || new Date().toISOString());
        onAttendanceRecorded?.();
      } catch (err) {
        console.error("Failed to sync after reconnecting:", err);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isOpen, queued, eventId, userId, onAttendanceRecorded]);

  // Single effect that handles the full attendance flow:
  // 1. Check if there's already a queued item for this event+user → if online, sync it now and show result
  // 2. If offline → queue it and show queued state
  // 3. If online and no queued item → POST to server
  useEffect(() => {
    if (!profileChecked || !event || !eventId || !isOpen) return;

    if (!userId) {
      setAttendanceStatus("error");
      setAttendanceMessage("You need to be logged in to mark attendance.");
      setSubmitting(false);
      return;
    }

    const submitAttendance = async () => {
      setSubmitting(true);
      const captured_at = new Date().toISOString();

      // STEP 1: Check if there's already a queued attendance for this event+user.
      const queuedItems = await getQueuedAttendance();
      const alreadyQueued = queuedItems.some(
        (q) =>
          q.event_id?.toString() === eventId?.toString() &&
          q.user_id?.toString() === userId?.toString(),
      );

      // STEP 1.5: If there's a queued item and we're now online, replay the
      // full queue and show the user the result right in the modal.
      if (alreadyQueued && isOnline()) {
        try {
          const synced = await syncQueuedAttendance();
          const myItem = synced.find(
            (s) =>
              s.event_id?.toString() === eventId?.toString() &&
              s.user_id?.toString() === userId?.toString(),
          );

          if (myItem) {
            if (myItem.error_code) {
              setQueued(false);
              setAttendanceStatus("error");
              if (myItem.error_code === "EVENT_NOT_STARTED") {
                setAttendanceMessage(
                  "Your offline attendance could not be recorded — the event had not started yet.",
                );
              } else if (myItem.error_code === "EVENT_EXPIRED") {
                setAttendanceMessage(
                  "Your offline attendance could not be recorded — the event had already ended.",
                );
              } else {
                setAttendanceMessage(
                  "Your offline attendance could not be recorded.",
                );
              }
              setSubmitting(false);
              return;
            }

            if (myItem.already_attended) {
              setQueued(false);
              setAttendanceStatus("already");
              setAttendanceMessage("You are already marked as attended!");
              setAttendedAt(myItem.captured_at || captured_at);
              setSubmitting(false);
              onAttendanceRecorded?.();
              return;
            }

            // Successfully synced
            setQueued(false);
            setAttendanceStatus("success");
            setAttendanceMessage("Attendance recorded successfully!");
            setAttendedAt(myItem.captured_at || captured_at);
            setSubmitting(false);
            onAttendanceRecorded?.();
            return;
          }
        } catch (err) {
          // Sync failed — fall through to queued state below
          console.error("Failed to sync queued attendance on modal open:", err);
        }
      }

      // STEP 2: If offline, queue the attendance and show queued state
      if (!isOnline()) {
        // If there's already a queued item, just show the queued state
        if (alreadyQueued) {
          setQueued(true);
          setAttendanceStatus("success");
          setAttendanceMessage(
            "You have a pending offline attendance for this event — it will sync automatically.",
          );
          setAttendedAt(captured_at);
          setSubmitting(false);
          onAttendanceRecorded?.();
          return;
        }

        try {
          await queueAttendance({
            event_id: eventId,
            user_id: userId,
            captured_at,
          });
          await registerAttendanceSync();
          setQueued(true);
          setAttendanceStatus("success");
          setAttendanceMessage(
            "You're offline — your attendance is saved and will sync automatically when you're back online.",
          );
          setAttendedAt(captured_at);
          onAttendanceRecorded?.();
        } catch (queueErr) {
          setAttendanceStatus("error");
          setAttendanceMessage(
            "Failed to save attendance. Please try again when you have a connection.",
          );
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // STEP 3: Online — POST to the server.
      // Even if there's a queued item, try to sync it now. If the server
      // accepts it, remove the queued item and show "Attendance Confirmed!" (✅).
      // Only fall back to the queued state if the network actually fails.
      try {
        const res = await axios.post("/api/events/attendance", {
          event_id: eventId,
          user_id: userId,
          captured_at,
        });

        // On success, remove any queued items for this event+user
        // so the queue doesn't show outdated data.
        const staleQueued = await getQueuedAttendance();
        for (const q of staleQueued) {
          if (
            q.event_id?.toString() === eventId?.toString() &&
            q.user_id?.toString() === userId?.toString()
          ) {
            await removeQueuedAttendance(q.id);
          }
        }

        if (res.data.already_attended) {
          setQueued(false);
          setAttendanceStatus("already");
          setAttendanceMessage("You are already marked as attended!");
          setAttendedAt(res.data.attended_at);
        } else {
          setQueued(false);
          setAttendanceStatus("success");
          setAttendanceMessage("Attendance recorded successfully!");
          setAttendedAt(res.data.attended_at);
        }
        onAttendanceRecorded?.();
      } catch (err) {
        // If network fails mid-request, queue it for background sync
        const status = err?.response?.status;
        if (status === undefined || status >= 500) {
          try {
            // Only queue if there isn't already a queued item
            if (!alreadyQueued) {
              await queueAttendance({
                event_id: eventId,
                user_id: userId,
                captured_at,
              });
            }
            await registerAttendanceSync();
            setQueued(true);
            setAttendanceStatus("success");
            setAttendanceMessage(
              "Attendance saved — will sync automatically when the connection is restored.",
            );
            setAttendedAt(captured_at);
            onAttendanceRecorded?.();
          } catch (queueErr) {
            setAttendanceStatus("error");
            setAttendanceMessage(
              err.response?.data?.message || "Failed to record attendance.",
            );
          }
        } else {
          setAttendanceStatus("error");
          const code = err.response?.data?.code;
          if (code === "EVENT_NOT_STARTED") {
            setAttendanceMessage(
              "Attendance is not yet open. The event has not started yet.",
            );
          } else if (code === "EVENT_EXPIRED") {
            setAttendanceMessage(
              "The QR code has expired. This event has already ended.",
            );
          } else {
            setAttendanceMessage(
              err.response?.data?.message || "Failed to record attendance.",
            );
          }
        }
      } finally {
        setSubmitting(false);
      }
    };

    submitAttendance();
  }, [profileChecked, event, eventId, userId, isOpen]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div
          className={`p-6 text-center ${
            attendanceStatus === "success"
              ? queued
                ? "bg-amber-500"
                : "bg-green-600"
              : attendanceStatus === "already"
                ? "bg-blue-600"
                : attendanceStatus === "error"
                  ? "bg-red-600"
                  : "bg-gray-600"
          } text-white`}
        >
          {loading || !profileChecked || submitting ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
              <h2 className="text-xl font-bold">
                {submitting ? "Recording Attendance..." : "Loading..."}
              </h2>
            </>
          ) : attendanceStatus === "success" ? (
            <>
              <div className="text-5xl mb-3">{queued ? "📶" : "✅"}</div>
              <h2 className="text-xl font-bold">
                {queued ? "Attendance Saved Offline" : "Attendance Confirmed!"}
              </h2>
              <p className="text-white/90 text-sm mt-1">
                {queued
                  ? "Will sync automatically when you're back online"
                  : "You are now marked as attended"}
              </p>
            </>
          ) : attendanceStatus === "already" ? (
            <>
              <div className="text-5xl mb-3">📋</div>
              <h2 className="text-xl font-bold">Already Attended</h2>
              <p className="text-blue-100 text-sm mt-1">
                You were already marked as attended
              </p>
            </>
          ) : attendanceStatus === "error" ? (
            <>
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-xl font-bold">Failed</h2>
              <p className="text-red-100 text-sm mt-1">{attendanceMessage}</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">📋</div>
              <h2 className="text-xl font-bold">Attendance</h2>
            </>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {event && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Event:</span>
                <span className="font-semibold text-right max-w-[60%]">
                  {event.title}
                </span>
              </div>
              {attendedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time:</span>
                  <span className="font-semibold">
                    {formatDateTime(attendedAt)}
                  </span>
                </div>
              )}
            </div>
          )}

          {attendanceStatus === "success" && queued && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Your attendance was captured at{" "}
              {attendedAt ? formatDateTime(attendedAt) : "the time you tapped"}.
              It will be submitted automatically once your device reconnects —
              even if the event has ended by then.
            </div>
          )}

          {attendanceStatus === "success" && !queued && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Your attendance has been recorded for this event.
            </div>
          )}

          {attendanceStatus === "already" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              You have already been marked as attended for this event. No
              further action needed.
            </div>
          )}

          {attendanceStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {attendanceMessage}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Close
            </button>
            {attendanceStatus === "success" && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}