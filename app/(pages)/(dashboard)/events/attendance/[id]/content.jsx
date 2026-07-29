"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AttendancePageContent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;

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
  }, []);

  useEffect(() => {
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
  }, [eventId]);

  // Once profile is checked and event is loaded, submit attendance
  useEffect(() => {
    if (!profileChecked || !event || !eventId) return;

    if (!userId) {
      // User not logged in - redirect to sign in
      router.push(`/?redirect=/events/attendance/${eventId}`);
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
  }, [profileChecked, event, eventId, userId, router]);

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

  if (loading || !profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/events/discover")}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
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
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
              <h2 className="text-xl font-bold">Recording Attendance...</h2>
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

          {attendanceStatus === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Your attendance has been recorded for this event. You may close
              this page.
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
              onClick={() => router.push("/events/discover")}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Browse Events
            </button>
            {attendanceStatus && (
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}