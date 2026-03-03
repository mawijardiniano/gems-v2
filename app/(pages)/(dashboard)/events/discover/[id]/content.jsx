"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FaCalendar, FaLocationArrow } from "react-icons/fa";
import { QRCodeCanvas } from "qrcode.react";
import eligibilityRequirementsMap from "@/lib/eligibilityRequirements";

export default function DiscoverEventContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params?.id;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQrPrompt, setShowQrPrompt] = useState(false);
  const [userId, setUserId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eligibilityForm, setEligibilityForm] = useState({});

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
    if (searchParams?.get("qr") === "1" && profileChecked && !userId) {
      setShowQrPrompt(true);
    } else {
      setShowQrPrompt(false);
    }
  }, [searchParams, profileChecked, userId]);

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

  const formatRange = useMemo(() => {
    return (start, end) => {
      if (!start) return "No date";
      const opts = {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      };
      const format = (value) => {
        const d = new Date(value);
        return Number.isNaN(d.getTime())
          ? "Invalid date"
          : d.toLocaleString(undefined, opts);
      };
      const startStr = format(start);
      if (!end) return startStr;
      const endStr = format(end);
      return `${startStr} - ${endStr}`;
    };
  }, []);

  const handleQrYesAccount = () => {
    setShowQrPrompt(false);
    router.push(
      `/authentication/signin?redirect=/events/discover/${eventId}?qr=1`,
    );
  };

  const handleQrNoAccount = () => {
    setShowQrPrompt(false);
    router.push("/survey");
  };

  const isPast = (evt) => {
    const end = evt?.end_date || evt?.start_date || evt?.date;
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  };

  const isUserInList = (list = [], id) =>
    list.some((u) => (u?._id || u)?.toString?.() === id?.toString());

  const getUserStatus = (evt) => {
    if (!evt || !userId) return null;
    if (isUserInList(evt.registered_users, userId)) return "going";
    if (isUserInList(evt.interested_users, userId)) return "interested";
    if (isUserInList(evt.not_interested_users, userId)) return "not_interested";
    return null;
  };

  const handleStatus = async (evt, status) => {
    if (!evt || !evt._id) return;
    if (!userId) {
      setStatusMessage("You need to be logged in to set a status.");
      return;
    }

    setStatusUpdatingId(evt._id);
    setStatusMessage("");
    try {
      const res = await axios.post("/api/events/participation", {
        event_id: evt._id,
        user_id: userId,
        status,
      });
      const updated = res.data?.event || evt;
      setEvent(updated);
      setStatusMessage("Status updated.");
    } catch (err) {
      setStatusMessage(
        err.response?.data?.message ||
          "Failed to update status. Please try again.",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const requirements =
    (event &&
      event.eligibility_criteria &&
      eligibilityRequirementsMap[event.eligibility_criteria]) ||
    [];

  const handleEligibilityInput = (field, value) => {
    setEligibilityForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEligibilitySubmit = async (e) => {
    e.preventDefault();
    await handleStatus(event, "going");
    setShowEligibilityModal(false);
    setEligibilityForm({});
    // Optionally, send eligibilityForm data to your backend here
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading event...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
        <button
          onClick={() => router.push("/events/discover")}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center text-gray-500">Event not found.</div>
    );
  }

  return (
    <div className="mx-auto p-5 font-sans space-y-6 max-w-5xl">
      {showQrPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold">Do you have an account?</h2>
            <p className="text-gray-600">
              We use your account to personalize your event experience. If you
              do not have one, please sign up to continue.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={handleQrNoAccount}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Sign Up
              </button>
              <button
                onClick={handleQrYesAccount}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Yes, I have an account
              </button>
            </div>
          </div>
        </div>
      )}

      {showEligibilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">
              Eligibility Requirements
            </h2>
            <form onSubmit={handleEligibilitySubmit} className="space-y-4">
              {requirements.length === 0 ? (
                <div className="text-gray-600">
                  No additional requirements for this eligibility criteria.
                </div>
              ) : (
                requirements.map((req) => (
                  <div key={req}>
                    <label className="block text-sm font-medium mb-1">
                      {req}
                    </label>
                    <input
                      type="text"
                      value={eligibilityForm[req] || ""}
                      onChange={(e) =>
                        handleEligibilityInput(req, e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                ))
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEligibilityModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push("/events/discover")}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to Discover
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="text-gray-700 flex items-center gap-2">
          <FaCalendar />{" "}
          {formatRange(event.start_date || event.date, event.end_date)}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {event.venue && (
            <p className="text-gray-700 flex items-center gap-2">
              <FaLocationArrow /> {event.venue}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {["interested", "not_interested", "going"].map((s) => {
              const labels = {
                interested: "Interested",
                not_interested: "Not Interested",
                going: "Going",
              };
              const active = getUserStatus(event) === s;
              const disabled = isPast(event) || statusUpdatingId === event._id;
              return (
                <button
                  key={s}
                  onClick={() => {
                    if (s === "going") {
                      if (
                        event.eligibility_criteria &&
                        event.eligibility_criteria !== "None"
                      ) {
                        setShowEligibilityModal(true);
                      } else {
                        handleStatus(event, s);
                      }
                    } else {
                      handleStatus(event, s);
                    }
                  }}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-800 border-gray-300 hover:border-blue-400"
                  } disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-200 disabled:cursor-not-allowed`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isPast(event) && (
          <p className="text-sm text-gray-500">This event has ended.</p>
        )}
      </div>

      {event.description && (
        <div className="p-4 bg-white rounded border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">
            {event.description}
          </p>
        </div>
      )}

      <div>
        {/* <h1>QR for Attendance</h1> */}
        {/* {userId ? (
          <div className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50 mt-4">
            <div>
              <div className="font-semibold text-gray-800">Your QR for this event</div>
              <div className="text-xs text-gray-500">User ID: {userId}</div>
              <div className="text-xs text-gray-500">Event ID: {event._id}</div>
            </div>
            <QRCodeCanvas value={JSON.stringify({ eventId: event._id, participantId: userId })} size={128} />
          </div>
        ) : (
          <div className="text-sm text-gray-600 mt-2">You must be logged in to get your QR code.</div>
        )} */}
      </div>
    </div>
  );
}
