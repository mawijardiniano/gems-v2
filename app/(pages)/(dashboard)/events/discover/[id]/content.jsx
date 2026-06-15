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
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [assignedParticipantNumber, setAssignedParticipantNumber] =
    useState(null);

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

  const handleQrYesAccount = () => {
    setShowQrPrompt(false);
    router.push(
      `/authentication/signin?redirect=/events/discover/${eventId}?qr=1`,
    );
  };

  const handleQrNoAccount = () => {
    setShowQrPrompt(false);
    router.push("/profile-registration");
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

  const myParticipantNumber = useMemo(() => {
    if (!event?.participant_numbers || !userId) return null;
    const entry = event.participant_numbers.find(
      (p) => (p.user_id?._id || p.user_id)?.toString() === userId?.toString(),
    );
    return entry?.number ?? null;
  }, [event, userId]);

  const posterUrl = (evt) =>
    evt?.event_poster?.url || evt?.eventPoster?.url || evt?.poster?.url || "";

  const formatRange = (evt) => {
    let startDates = evt.start_dates || [];
    let endDates = evt.end_dates || [];

    if (Array.isArray(startDates) && startDates.length > 0) {
      return startDates.map((startDate, index) => {
        const dayNumber = index + 1;
        const endDate = endDates[index];
        const startStr = new Date(startDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const timeStart = new Date(startDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        if (!endDate) {
          return (
            <div key={index}>
              Day {dayNumber}: {startStr} {timeStart}
            </div>
          );
        }

        const timeEnd = new Date(endDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={index}>
            <div className="flex flex-row gap-2 items-center">
              <FaCalendar />
              Day {dayNumber}: {startStr} {timeStart} - {timeEnd}
            </div>
          </div>
        );
      });
    }
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
      if (status === "going" || status === "interested") {
        const entry = updated?.participant_numbers?.find(
          (p) =>
            (p.user_id?._id || p.user_id)?.toString() === userId?.toString(),
        );
        if (entry?.number) {
          setAssignedParticipantNumber(entry.number);
          setShowParticipantModal(true);
        }
      }
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
    <div className="mx-auto p-5 font-sans space-y-6 max-w-6xl">
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

      {showParticipantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 text-center">
            <div className="text-5xl font-bold text-blue-600">
              #{assignedParticipantNumber}
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              You&apos;re on the list!
            </h2>
            <p className="text-gray-500 text-sm">
              This is your participant number for this event.
            </p>
            <button
              onClick={() => setShowParticipantModal(false)}
              className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            >
              Got it!
            </button>
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

      <div className="relative rounded-xl overflow-hidden">
        {posterUrl(event) && (
          <img
            src={posterUrl(event)}
            alt={event.title}
            className="w-full h-[400px] object-cover"
          />
        )}

        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
          <button
            onClick={() => router.push("/events/discover")}
            className="self-start text-sm hover:underline"
          >
            ← Back to Discover
          </button>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold">{event.title}</h1>

            <div className="flex flex-col gap-2">{formatRange(event)}</div>

            {event.venue && (
              <p className="flex items-center gap-2">
                <FaLocationArrow />
                {event.venue}
              </p>
            )}

            {myParticipantNumber && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg text-white text-sm font-medium">
                <span>You are participant</span>
                <span className="font-bold text-lg">
                  #{myParticipantNumber}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {["interested", "not_interested", "going"].map((s) => {
                const labels = {
                  interested: "Interested",
                  not_interested: "Not Interested",
                  going: "Going",
                };

                const active = getUserStatus(event) === s;
                const disabled =
                  isPast(event) || statusUpdatingId === event._id;

                return (
                  <button
                    key={s}
                    onClick={() => handleStatus(event, s)}
                    disabled={disabled}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className=" space-y-3">
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
