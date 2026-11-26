"use client";

import axios from "axios";
import { activityPillClasses } from "@/data/lib/activityTypeColors";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaArrowLeft,
  FaChevronRight,
  FaSearch,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaBriefcase,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaSpinner,
  FaUserCheck,
  FaUsers,
  FaExclamationCircle,
} from "react-icons/fa";
import { COLLEGE_TO_PROGRAMS, YEAR_LEVELS } from "@/data/lib/colleges";
import { formatEventWhen } from "@/data/lib/eventDates";
import { attendanceWindow } from "@/data/lib/eventStatus";
import { APP_TIME_ZONE } from "@/data/lib/appTime";
import Button from "@/components/ui/Button";

const EMPTY = {
  full_name: "",
  sex: "",
  gender_identity: "",
  age: "",
  contact: "",
  participant_type: "",
  department_office_org: "",
  position_designation: "",
  program: "",
  year: "",
  section: "",
};


const PARTICIPANT_TYPES = [
  {
    value: "Student",
    label: "Student",
    icon: FaGraduationCap,
    hint: "Enrolled in the university",
  },
  {
    value: "Employee",
    label: "Employee",
    icon: FaBriefcase,
    hint: "Faculty or staff",
  },
  {
    value: "Stakeholder",
    label: "Stakeholder / Guest",
    icon: FaUsers,
    hint: "Parent, alumni, partner, visitor",
  },
];

/* Students and employees have a GEMS profile, so they check in with one
   field (ID number or registered email) instead of the whole form. */
const usesLookup = (type) => type === "Student" || type === "Employee";

const helperCls = "mt-1 text-xs text-fg-muted";

const formatDateTime = (value) => {
  if (!value) return "";
  /* Manila time, like the event's own dates. */
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
};

/* A left-aligned section heading inside the form body. */
function SectionTitle({ step, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
        {step}
      </span>
      <h2 className="text-xs font-bold tracking-wider text-fg-muted uppercase">
        {title}
      </h2>
      <span className="h-px flex-1 bg-muted" />
    </div>
  );
}

/* Top bar on every step after the first: back link plus the chosen type. */
function StepNav({ type, onBack }) {
  const current = PARTICIPANT_TYPES.find((t) => t.value === type);
  const Icon = current?.icon;
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-fg-muted hover:text-fg focus-visible:ring-4 focus-visible:ring-secondary-500/20 focus-visible:outline-none"
      >
        <FaArrowLeft size={11} />
        Back
      </button>
      {current && (
        <span className="badge border border-secondary-200 bg-secondary-50 text-secondary-700">
          <Icon size={11} />
          {current.label}
        </span>
      )}
    </div>
  );
}

/* Centered state card used while loading and for not-found / cancelled. */
function StateCard({ icon, tone = "gray", title, message }) {
  const tones = {
    gray: "bg-subtle text-fg-muted",
    red: "bg-danger-subtle text-danger",
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card w-full max-w-md p-8 text-center animate-slide-up">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}
        >
          {icon}
        </div>
        <h1 className="text-lg font-bold text-fg">{title}</h1>
        {message && <p className="mt-1.5 text-sm text-fg-muted">{message}</p>}
      </div>
    </div>
  );
}

export default function AttendContent() {
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  /* "type" → (Student/Employee) "lookup" → "confirm", or → "form" for
     stakeholders and anyone who can't use the lookup. */
  const [step, setStep] = useState("type");
  const [identifier, setIdentifier] = useState("");
  const [match, setMatch] = useState(null);
  const [notFound, setNotFound] = useState(false);

  /* Programs offered for the college typed above, used as datalist hints. */
  const programOptions = useMemo(() => {
    const typed = form.department_office_org.trim();
    const college = Object.keys(COLLEGE_TO_PROGRAMS).find(
      (name) => name.toLowerCase() === typed.toLowerCase(),
    );
    if (college) return COLLEGE_TO_PROGRAMS[college];
    return [...new Set(Object.values(COLLEGE_TO_PROGRAMS).flat())].sort();
  }, [form.department_office_org]);

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        setLoadFailed(false);
        const res = await axios.get(`/api/events/public/${eventId}`);
        setEvent(res.data?.data || null);
      } catch (err) {
        setEvent(null);
        /* Only a 404 means the QR code is wrong. Anything else (no signal,
           a server error) told guests to rescan a code that was fine. */
        setLoadFailed(err?.response?.status !== 404);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, reloadKey]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickParticipantType = (value) => {
    setForm((p) => ({
      ...p,
      participant_type: value,
      /* Switching type clears the fields that no longer apply. */
      ...(value !== "Student"
        ? { program: "", year: "", section: "" }
        : { position_designation: "" }),
    }));
  };

  /* Back to the first screen with nothing carried over. */
  const restart = () => {
    setForm(EMPTY);
    setIdentifier("");
    setMatch(null);
    setNotFound(false);
    setError("");
    setDone(null);
    setStep("type");
  };

  const chooseType = (value) => {
    pickParticipantType(value);
    setError("");
    setNotFound(false);
    setMatch(null);
    setStep(usesLookup(value) ? "lookup" : "form");
  };

  /* Can't use the lookup: the full form, with the type already picked. */
  const fillFormInstead = () => {
    setError("");
    setNotFound(false);
    setMatch(null);
    setStep("form");
  };

  /* Shared reply handling for both submit paths. */
  const handleCheckInError = (err) => {
    const data = err.response?.data;
    if (data?.already_attended) {
      setDone({ already: true, at: data?.attended_at });
    } else if (data?.already_submitted) {
      setDone({ already: true, pending: true, at: data?.submitted_at });
    } else {
      setError(data?.message || "Unable to record attendance.");
    }
  };
  const doneFrom = (data, name) => ({
    already: !!data?.already_attended || !!data?.already_submitted,
    pending: data?.validation_status === "pending",
    at: data?.submitted_at || data?.attended_at,
    name,
  });

  const lookUp = async (e) => {
    e.preventDefault();
    setError("");
    setNotFound(false);
    if (!identifier.trim())
      return setError("Enter your ID number or email.");
    setSubmitting(true);
    try {
      const res = await axios.post("/api/events/guest-attendance/lookup", {
        event_id: eventId,
        participant_type: form.participant_type,
        identifier: identifier.trim(),
      });
      if (res.data?.found) {
        setMatch(res.data);
        setStep("confirm");
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to look up your record.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmMatch = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await axios.post("/api/events/guest-attendance", {
        event_id: eventId,
        participant_type: form.participant_type,
        identifier: identifier.trim(),
      });
      setDone(doneFrom(res.data, match?.displayName));
    } catch (err) {
      const data = err.response?.data;
      /* The record changed or is incomplete since the lookup: fall back to
         the form rather than leaving the person stuck. */
      if (data?.code === "NOT_FOUND" || data?.code === "INCOMPLETE_PROFILE") {
        setMatch(null);
        setStep("form");
        setError(data.message);
      } else {
        handleCheckInError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.sex) return setError("Sex at birth is required.");
    if (!form.age || Number(form.age) < 1) return setError("Age is required.");
    if (!form.participant_type)
      return setError("Participant type is required.");
    if (form.participant_type === "Student" && !form.program.trim())
      return setError("Program is required for students.");
    setSubmitting(true);
    try {
      const isStudent = form.participant_type === "Student";
      /* The API stores one combined sheet value plus the split parts, so send
         both shapes and leave the unused participant fields blank. */
      const res = await axios.post("/api/events/guest-attendance", {
        event_id: eventId,
        ...form,
        department_office_org: form.department_office_org.trim(),
        program_year_section: isStudent
          ? [form.program, form.year, form.section]
              .filter(Boolean)
              .join(" ")
              .trim()
          : "",
        program: isStudent ? form.program.trim() : "",
        year: isStudent ? form.year : "",
        section: isStudent ? form.section.trim() : "",
        position_designation: isStudent ? "" : form.position_designation.trim(),
      });
      setDone(doneFrom(res.data));
    } catch (err) {
      handleCheckInError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StateCard
        icon={<FaSpinner className="animate-spin" size={20} />}
        title="Loading event"
        message="Fetching the event details for this QR code."
      />
    );
  }

  if (!event && loadFailed) {
    return (
      <div>
        <StateCard
          tone="red"
          icon={<FaExclamationCircle size={22} />}
          title="Couldn't load the event"
          message="Check your internet connection, then try again."
        />
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-fg-3 hover:bg-subtle"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <StateCard
        tone="red"
        icon={<FaExclamationCircle size={22} />}
        title="Event not found"
        message="Check the QR code and try scanning it again."
      />
    );
  }

  if (event.status === "cancelled") {
    return (
      <StateCard
        tone="red"
        icon={<FaExclamationCircle size={22} />}
        title="Event cancelled"
        message="This event has been cancelled, so attendance is closed."
      />
    );
  }

  /* Same window the check-in API enforces, checked before the guest fills
     in the whole form only to be told the QR is not open (or has expired). */
  if (!done) {
    const { earliestStart, latestEnd } = attendanceWindow(event);
    const now = Date.now();
    if (earliestStart !== null && now < earliestStart) {
      return (
        <StateCard
          icon={<FaExclamationCircle size={22} />}
          title="Attendance not open yet"
          message={`Check-in opens on ${formatEventWhen(event) || "the event day"}. Please scan again then.`}
        />
      );
    }
    if (latestEnd !== null && now > latestEnd) {
      return (
        <StateCard
          tone="red"
          icon={<FaExclamationCircle size={22} />}
          title="Attendance closed"
          message="This event has already ended, so check-in is closed."
        />
      );
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="card w-full max-w-md overflow-hidden text-center animate-slide-up">
          <div className="h-1.5 w-full bg-gradient-to-r from-secondary-700 to-secondary-500" />
          <div className="p-8">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                done.pending
                  ? "bg-secondary-50"
                  : done.already
                    ? "bg-secondary-50"
                    : "bg-success-subtle"
              }`}
            >
              {done.pending ? (
                <FaUserCheck className="text-secondary-500" size={26} />
              ) : done.already ? (
                <FaUserCheck className="text-secondary-500" size={26} />
              ) : (
                <FaCheckCircle className="text-emerald-500" size={26} />
              )}
            </div>
            <h1 className="text-xl font-bold text-fg">
              {done.pending
                ? done.already
                  ? "Already Submitted"
                  : "Submitted for Validation"
                : done.already
                  ? "Already Checked In"
                  : "Attendance Confirmed!"}
            </h1>
            {done.name && (
              <p className="mt-2 text-sm font-semibold text-fg-3">
                {done.name}
              </p>
            )}
            <p className="mt-1.5 text-sm text-fg-muted">
              {done.pending
                ? "Your check-in was submitted and is awaiting organizer validation. It will count toward attendance once approved."
                : done.already
                  ? "You were already marked as attended for"
                  : "Your attendance has been recorded for"}{" "}
              <span className="font-semibold text-fg-3">{event.title}</span>
              .
            </p>
            {done.at && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-xs font-medium text-fg-muted">
                <FaCalendarAlt size={11} />
                {formatDateTime(done.at)}
              </p>
            )}
            <Button
              type="button"
              onClick={restart}
              variant="secondary"
              className="mt-6 w-full"
            >
              Check in another guest
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isStudent = form.participant_type === "Student";
  const eventDate = event.start_date || event.start_dates?.[0];
  const posterUrl = event.event_poster?.url || "";
  const offices = (event.organizing_office_unit || []).join(", ");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="card overflow-hidden animate-slide-up">
          {/* ── Event header ─────────────────────────────────────── */}
          <div className="relative bg-gradient-to-br from-secondary-700 to-secondary-500 text-white">
            {posterUrl && (
              <>
                <img
                  src={posterUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-45"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
              </>
            )}
            <div className="relative p-5 sm:p-6">
              <span className="badge border border-white/25 bg-white/15 text-white backdrop-blur-sm">
                <FaUserCheck size={11} />
                QR Check-in · No login needed
              </span>
              <h1 className="mt-3 text-lg leading-snug font-bold sm:text-xl">
                {event.title}
              </h1>
              <div className="mt-3 space-y-1.5 text-sm text-white/85">
                {eventDate && (
                  <p className="flex items-center gap-2">
                    <FaCalendarAlt
                      className="shrink-0 text-white/60"
                      size={12}
                    />
                    <span>{formatEventWhen(event)}</span>
                  </p>
                )}
                {event.venue && (
                  <p className="flex items-center gap-2">
                    <FaMapMarkerAlt
                      className="shrink-0 text-white/60"
                      size={12}
                    />
                    <span>{event.venue}</span>
                  </p>
                )}
                {offices && (
                  <p className="flex items-start gap-2">
                    <FaBuilding
                      className="mt-0.5 shrink-0 text-white/60"
                      size={12}
                    />
                    <span>{offices}</span>
                  </p>
                )}
              </div>
              {event.type_of_activity && (
                <span
                  className={`badge mt-3 border bg-white/90 ${
                    activityPillClasses(event.type_of_activity)
                  }`}
                >
                  {event.type_of_activity}
                </span>
              )}
            </div>
          </div>

          {/* ── Step 1: who is attending ─────────────────────────── */}
          {step === "type" && (
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-fg">
                Who are you attending as?
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Pick one to continue.
              </p>
              <div className="mt-4 space-y-2.5">
                {PARTICIPANT_TYPES.map(({ value, label, hint, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseType(value)}
                    className="flex w-full items-center gap-3.5 rounded-xl border border-line bg-white px-4 py-3.5 text-left transition duration-200 hover:border-secondary-500 hover:bg-secondary-50 focus-visible:ring-4 focus-visible:ring-secondary-500/20 focus-visible:outline-none"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">
                        {label}
                      </span>
                      <span className="block text-xs text-fg-muted">
                        {hint}
                      </span>
                    </span>
                    <FaChevronRight className="shrink-0 text-fg-muted" size={12} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: ID number or email ───────────────────────── */}
          {step === "lookup" && (
            <form onSubmit={lookUp} noValidate className="p-5 sm:p-6">
              <StepNav type={form.participant_type} onBack={restart} />
              {error && (
                <div className="alert-error mb-5">
                  <FaExclamationCircle className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <label className="label" htmlFor="identifier">
                {form.participant_type} ID or email{" "}
                <span className="text-danger">*</span>
              </label>
              <input
                id="identifier"
                name="identifier"
                className="input"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setNotFound(false);
                }}
                placeholder={
                  form.participant_type === "Student"
                    ? "e.g. 2021-00123 or you@email.com"
                    : "e.g. EMP-0456 or you@email.com"
                }
                aria-describedby="identifier_help"
                aria-invalid={notFound || undefined}
              />
              <p id="identifier_help" className={helperCls}>
                Don&apos;t remember your ID? Use the email you registered in
                GEMS.
              </p>

              {notFound && (
                <div className="alert-error mt-4" role="alert">
                  <FaExclamationCircle className="shrink-0" />
                  <span>
                    We couldn&apos;t find a{" "}
                    {form.participant_type.toLowerCase()} record with that ID
                    or email.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                variant="primary"
                className="mt-6 w-full py-3 text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} />
                    Looking up...
                  </>
                ) : notFound ? (
                  "Try again"
                ) : (
                  <>
                    <FaSearch size={13} />
                    Find my record
                  </>
                )}
              </Button>
              {notFound ? (
                <Button
                  type="button"
                  onClick={fillFormInstead}
                  variant="secondary"
                  className="mt-2.5 w-full py-3 text-sm font-semibold"
                >
                  Fill in my details instead
                </Button>
              ) : (
                <p className="mt-4 text-center text-sm text-fg-muted">
                  Don&apos;t know your ID or email?{" "}
                  <button
                    type="button"
                    onClick={fillFormInstead}
                    className="font-semibold text-secondary-600 underline-offset-2 hover:underline"
                  >
                    Fill in your details instead
                  </button>
                </p>
              )}
            </form>
          )}

          {/* ── Step 3: is this you? ─────────────────────────────── */}
          {step === "confirm" && match && (
            <div className="p-5 sm:p-6">
              <StepNav
                type={form.participant_type}
                onBack={() => {
                  setMatch(null);
                  setStep("lookup");
                }}
              />
              {error && (
                <div className="alert-error mb-5">
                  <FaExclamationCircle className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <h2 className="text-base font-bold text-fg">Is this you?</h2>
              <div className="mt-3 flex items-start gap-3.5 rounded-xl border border-line bg-subtle px-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
                  <FaUserCheck size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-fg">
                    {match.displayName}
                  </p>
                  {match.sex && (
                    <p className="text-sm text-fg-muted">{match.sex}</p>
                  )}
                  {match.department && (
                    <p className="mt-0.5 text-sm text-fg-3">
                      {match.department}
                    </p>
                  )}
                  {match.program && (
                    <p className="text-sm text-fg-muted">{match.program}</p>
                  )}
                </div>
              </div>
              <p className={`${helperCls} mt-2`}>
                Not you? Tap &quot;Not me&quot; and check the ID or email you
                typed.
              </p>
              <Button
                type="button"
                onClick={confirmMatch}
                disabled={submitting}
                variant="primary"
                className="mt-6 w-full py-3 text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} />
                    Recording...
                  </>
                ) : (
                  <>
                    <FaUserCheck size={14} />
                    Yes, record my attendance
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setMatch(null);
                  setError("");
                  setStep("lookup");
                }}
                disabled={submitting}
                variant="secondary"
                className="mt-2.5 w-full py-3 text-sm font-semibold"
              >
                Not me
              </Button>
            </div>
          )}

          {/* ── Full form: stakeholders, or no ID / email ─────────── */}
          {step === "form" && (
          <form onSubmit={submit} noValidate className="p-5 sm:p-6">
            <StepNav type={form.participant_type} onBack={restart} />
            {error && (
              <div className="alert-error mb-5">
                <FaExclamationCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <SectionTitle step="1" title="Personal Information" />
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="full_name">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  className="input"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="e.g. Juan D. Cruz"
                  aria-describedby="full_name_help"
                />
                <p id="full_name_help" className={helperCls}>
                  As shown on your ID — used to avoid duplicate entries.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="sex">
                    Sex at Birth <span className="text-danger">*</span>
                  </label>
                  <select
                    id="sex"
                    name="sex"
                    className="input"
                    value={form.sex}
                    onChange={(e) => set("sex", e.target.value)}
                    aria-describedby="sex_help"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <p id="sex_help" className={helperCls}>
                    Used for GAD reporting.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="age">
                    Age <span className="text-danger">*</span>
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="120"
                    className="input"
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                    placeholder="e.g. 21"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="gender_identity">
                    Gender Identity
                  </label>
                  <select
                    id="gender_identity"
                    name="gender_identity"
                    className="input"
                    value={form.gender_identity}
                    onChange={(e) => set("gender_identity", e.target.value)}
                    aria-describedby="gender_identity_help"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="LGBTQIA+">LGBTQIA+</option>
                  </select>
                  <p id="gender_identity_help" className={helperCls}>
                    Optional — how you identify.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="contact">
                    Contact Number
                  </label>
                  <input
                    id="contact"
                    name="contact"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="input"
                    value={form.contact}
                    onChange={(e) => set("contact", e.target.value)}
                    placeholder="09xx xxx xxxx"
                    aria-describedby="contact_help"
                  />
                  <p id="contact_help" className={helperCls}>
                    Optional — for verification only.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-7">
              <SectionTitle step="2" title="Participant Details" />
            </div>
            <div className="mt-4 space-y-4">
              {/* The participant type was picked on the first screen and is
                  shown in the bar above; "Change" goes back to it. */}
              <div>
                <label className="label" htmlFor="department_office_org">
                  College / Office / Organization
                </label>
                <input
                  id="department_office_org"
                  name="department_office_org"
                  className="input"
                  value={form.department_office_org}
                  onChange={(e) => set("department_office_org", e.target.value)}
                  placeholder="e.g. College of Information and Computing Sciences"
                  aria-describedby="department_help"
                />
                <p id="department_help" className={helperCls}>
                  Pick your college, or type your office or organization.
                </p>
              </div>
              {isStudent && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <label className="label" htmlFor="program">
                      Program <span className="text-danger">*</span>
                    </label>
                    <input
                      id="program"
                      name="program"
                      className="input"
                      value={form.program}
                      onChange={(e) => set("program", e.target.value)}
                      placeholder="e.g. BSIT / BSED"
                      list="program_options"
                      aria-describedby="program_help"
                    />
                    {/* The input pointed at this list but it was never
                        rendered, so no program suggestions appeared and
                        students typed free text the reports could not group. */}
                    <datalist id="program_options">
                      {programOptions.map((program) => (
                        <option key={program} value={program} />
                      ))}
                    </datalist>
                    <p id="program_help" className={helperCls}>
                      Your degree program.
                    </p>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="label" htmlFor="year">
                      Year Level
                    </label>
                    <select
                      id="year"
                      name="year"
                      className="input"
                      value={form.year}
                      onChange={(e) => set("year", e.target.value)}
                    >
                      <option value="">Select...</option>
                      {YEAR_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="section">
                      Section
                    </label>
                    <input
                      id="section"
                      name="section"
                      className="input"
                      value={form.section}
                      onChange={(e) => set("section", e.target.value)}
                      placeholder="e.g. A or 2-A"
                    />
                  </div>
                </div>
              )}

              {!isStudent && form.participant_type && (
                <div>
                  <label className="label" htmlFor="position_designation">
                    Position / Designation
                  </label>
                  <input
                    id="position_designation"
                    name="position_designation"
                    className="input"
                    value={form.position_designation}
                    onChange={(e) =>
                      set("position_designation", e.target.value)
                    }
                    placeholder="e.g. Instructor I"
                    aria-describedby="position_help"
                  />
                  <p id="position_help" className={helperCls}>
                    Employees: your position title. Stakeholders: e.g. Parent,
                    Alumni, Guest.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              variant="primary"
              className="mt-7 w-full py-3 text-sm font-semibold"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" size={13} />
                  Recording...
                </>
              ) : (
                <>
                  <FaUserCheck size={14} />
                  Confirm Attendance
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-fg-muted">
              Your details are used only for this event&apos;s attendance
              report.
            </p>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
