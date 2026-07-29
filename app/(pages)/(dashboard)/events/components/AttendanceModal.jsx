"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export default function AttendanceModal({ eventId, isOpen, onClose }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendedAt, setAttendedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        setError(err.response?.data?.message || "Unable to load event.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId, isOpen]);

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
      try {
        const res = await axios.post("/api/events/attendance", {
          event_id: eventId,
          user_id: userId,
        });

        if (res.data.already_attended) {
          setAttendanceStatus("already");
          setAttendanceMessage("You are already marked as attended!");
          setAttendedAt(res.data.attended_at);
        } else {
          setAttendanceStatus("success");
          setAttendanceMessage("Attendance recorded successfully!");
          setAttendedAt(res.data.attended_at);
        }
      } catch (err) {
        setAttendanceStatus("error");
        setAttendanceMessage(
          err.response?.data?.message || "Failed to record attendance.",
        );
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
              ? "bg-green-600"
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
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold">Attendance Confirmed!</h2>
              <p className="text-green-100 text-sm mt-1">
                You are now marked as attended
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

          {attendanceStatus === "success" && (
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