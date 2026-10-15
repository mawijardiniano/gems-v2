"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
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
import { COLLEGE_TO_PROGRAMS, YEAR_LEVELS } from "@/lib/colleges";

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

/* Same colour families the event cards use for type_of_activity. */
const ACTIVITY_COLORS = {
  Academic: "bg-blue-50 text-blue-700 border-blue-200",
  Administrative: "bg-purple-50 text-purple-700 border-purple-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Research: "bg-amber-50 text-amber-700 border-amber-200",
  Students: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Others: "bg-gray-50 text-gray-700 border-gray-200",
};

const PARTICIPANT_TYPES = [
  { value: "Student", label: "Student", icon: FaGraduationCap },
  { value: "Employee", label: "Employee", icon: FaBriefcase },
  { value: "Stakeholder", label: "Stakeholder", icon: FaUsers },
];

const helperCls = "mt-1 text-[11px] text-gray-400";

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* A left-aligned section heading inside the form body. */
function SectionTitle({ step, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
        {step}
      </span>
      <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
        {title}
      </h2>
      <span className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

/* Centered state card used while loading and for not-found / cancelled. */
function StateCard({ icon, tone = "gray", title, message }) {
  const tones = {
    gray: "bg-gray-50 text-gray-400",
    red: "bg-red-50 text-red-500",
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card w-full max-w-md p-8 text-center animate-slide-up">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}
        >
          {icon}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {message && <p className="mt-1.5 text-sm text-gray-500">{message}</p>}
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
        const res = await axios.get(`/api/events/public/${eventId}`);
        setEvent(res.data?.data || null);
      } catch (err) {
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.sex) return setError("Sex at birth is required.");
    if (!form.age || Number(form.age) < 1) return setError("Age is required.");
    if (!form.participant_type) return setError("Participant type is required.");
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
          ? [form.program, form.year, form.section].filter(Boolean).join(" ").trim()
          : "",
        program: isStudent ? form.program.trim() : "",
        year: isStudent ? form.year : "",
        section: isStudent ? form.section.trim() : "",
        position_designation: isStudent ? "" : form.position_designation.trim(),
      });
      setDone({
        already: !!res.data?.already_attended,
        pending: res.data?.validation_status === "pending",
        at: res.data?.submitted_at || res.data?.attended_at,
      });
    } catch (err) {
      const data = err.response?.data;
      if (data?.already_attended) {
        setDone({ already: true, at: data?.attended_at });
      } else if (data?.already_submitted) {
        setDone({ already: true, pending: true, at: data?.submitted_at });
      } else {
        setError(data?.message || "Unable to record attendance.");
      }
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

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="card w-full max-w-md overflow-hidden text-center animate-slide-up">
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 to-indigo-600" />
          <div className="p-8">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                done.pending ? "bg-amber-50" : done.already ? "bg-blue-50" : "bg-emerald-50"
              }`}
            >
              {done.pending ? (
                <FaUserCheck className="text-amber-500" size={26} />
              ) : done.already ? (
                <FaUserCheck className="text-blue-500" size={26} />
              ) : (
                <FaCheckCircle className="text-emerald-500" size={26} />
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {done.pending
                ? done.already
                  ? "Already Submitted"
                  : "Submitted for Validation"
                : done.already
                  ? "Already Checked In"
                  : "Attendance Confirmed!"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {done.pending
                ? "Your check-in was submitted and is awaiting organizer validation. It will count toward attendance once approved."
                : done.already
                  ? "You were already marked as attended for"
                  : "Your attendance has been recorded for"}{" "}
              <span className="font-semibold text-gray-700">{event.title}</span>.
            </p>
            {done.at && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
                <FaCalendarAlt size={11} />
                {formatDateTime(done.at)}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setDone(null);
                setError("");
              }}
              className="btn-secondary mt-6 w-full"
            >
              Check in another guest
            </button>
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
          <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
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
                    <FaCalendarAlt className="shrink-0 text-white/60" size={12} />
                    <span>{formatDateTime(eventDate)}</span>
                  </p>
                )}
                {event.venue && (
                  <p className="flex items-center gap-2">
                    <FaMapMarkerAlt className="shrink-0 text-white/60" size={12} />
                    <span>{event.venue}</span>
                  </p>
                )}
                {offices && (
                  <p className="flex items-start gap-2">
                    <FaBuilding className="mt-0.5 shrink-0 text-white/60" size={12} />
                    <span>{offices}</span>
                  </p>
                )}
              </div>
              {event.type_of_activity && (
                <span
                  className={`badge mt-3 border bg-white/90 ${
                    ACTIVITY_COLORS[event.type_of_activity] || ACTIVITY_COLORS.Others
                  }`}
                >
                  {event.type_of_activity}
                </span>
              )}
            </div>
          </div>

          {/* ── Form ─────────────────────────────────────────────── */}
          <form onSubmit={submit} noValidate className="p-5 sm:p-6">
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
                  Full Name <span className="text-red-500">*</span>
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
                    Sex at Birth <span className="text-red-500">*</span>
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
                    Age <span className="text-red-500">*</span>
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
              <fieldset>
                <legend className="label">
                  I am attending as <span className="text-red-500">*</span>
                </legend>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {PARTICIPANT_TYPES.map(({ value, label, icon: Icon }) => {
                    const active = form.participant_type === value;
                    return (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="participant_type"
                          value={value}
                          checked={active}
                          onChange={() => pickParticipantType(value)}
                          className="sr-only"
                        />
                        <Icon
                          className={active ? "text-blue-600" : "text-gray-400"}
                          size={16}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

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
                      Program <span className="text-red-500">*</span>
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
                    onChange={(e) => set("position_designation", e.target.value)}
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

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-7 w-full py-3 text-sm font-semibold"
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
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-400">
              Your details are used only for this event&apos;s attendance report.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
