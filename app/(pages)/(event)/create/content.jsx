"use client";

import axios from "axios";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaFileAlt,
  FaImage,
  FaUsers,
  FaInfoCircle,
  FaBuilding,
  FaProjectDiagram,
  FaExclamationCircle,
  FaCheckCircle,
  FaMagic,
  FaUpload,
  FaTag,
  FaArrowLeft,
} from "react-icons/fa";
import {
  OFFICE_OPTIONS,
  defaultOrganizingUnit,
} from "@/data/lib/colleges";
import { appDateInput, appDayRange } from "@/data/lib/appTime";
import EventOfficeDropdown from "../components/EventOfficeDropdown";
import { EVENT_SOURCES } from "../components/eventFormOptions";
import {
  activityOptionValue,
  projectPickerLabel,
  resolveProjectActivities,
  splitActivityOption,
  truncateOptionLabel,
} from "@/data/lib/projectActivities";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500";

const labelClass =
  "block text-sm font-medium text-gray-700 mb-2 gap-2 flex items-center";

const ACTIVITY_TYPES = [
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
];

function SectionHeader({ icon: Icon, color = "blue", title, subtitle }) {
  const colorMap = {
    blue: "bg-secondary-50 text-secondary-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-secondary-50 text-secondary-600",
    violet: "bg-secondary-50 text-secondary-600",
    rose: "bg-rose-50 text-rose-600",
    cyan: "bg-cyan-50 text-cyan-600",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-xl ${colorMap[color] || colorMap.blue} flex items-center justify-center shrink-0`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function AlertBanner({ type = "error", message }) {
  const isError = type === "error";
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {isError ? (
        <FaExclamationCircle className="h-5 w-5 shrink-0 mt-0.5" />
      ) : (
        <FaCheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
      )}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default function CreateEventsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const isDeanRoute = pathname?.startsWith("/dean");

  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  /* College the signed-in GAD coordinator is assigned to (see manage-role),
     used to prefill the organising office of the events they create. */
  const [userCollege, setUserCollege] = useState("");
  const [formData, setFormData] = useState({
    event_source: "project",
    title: "",
    description: "",
    date: "",
    venue: "",
    type_of_activity: "GAD",
    organizing_office_unit: [],
    co_organizing_office_unit: [],
    project: "",
    gad_activity: "",
  });
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const posterInputRef = useRef(null);
  /* The unit the GAD activity prefill added last, so switching activity swaps
     it out without touching offices the user picked by hand. */
  const autoOrganizingUnitRef = useRef(null);

  const isProjectBased = formData.event_source === "project";
  const isGAD = formData.type_of_activity === "GAD";

  const filteredActivityTypes = useMemo(() => {
    /* GAD events are always project-based, and only project-based events are
       GAD — for every role, Deans included. */
    return isProjectBased
      ? ACTIVITY_TYPES.filter((type) => type === "GAD")
      : ACTIVITY_TYPES.filter((type) => type !== "GAD");
  }, [isProjectBased]);

  /* Today's Manila date, the earliest an event may be scheduled. */
  const todayLocal = useMemo(() => appDateInput(new Date()), []);

  /* Events are scheduled by date only, so the generator no longer waits on a
     time, and a venue stays optional (the route already falls back to
     "To be announced"). */
  const canGenerateDescription = useMemo(() => {
    const baseValid =
      formData.title.trim().length > 0 &&
      formData.type_of_activity &&
      formData.date;

    if (formData.event_source === "project") {
      return (
        baseValid &&
        formData.type_of_activity === "GAD" &&
        Boolean(formData.gad_activity)
      );
    }
    return baseValid && formData.type_of_activity !== "GAD";
  }, [formData]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile");
        setUserId(res.data?.user?._id || null);
        setUserRole(res.data?.user?.role?.toLowerCase() || null);
        setUserCollege(res.data?.user?.assignedCollege || "");
      } catch (err) {
        console.error("Error loading profile", err);
      }
    };

    const fetchProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        const allProjects = res.data?.data || [];
        const myProjects = allProjects.filter(
          (p) => p.createdBy?.toString() === userId?.toString(),
        );
        setProjects(myProjects);
      } catch (err) {
        setProjects([]);
      }
    };

    fetchProfile();
    fetchProjects();
  }, [userId]);

  const uploadPoster = async () => {
    if (!posterFile) return null;

    const form = new FormData();
    form.append("file", posterFile);
    form.append("folder", "events/posters");

    setUploading(true);

    try {
      const res = await axios.post("/api/upload", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return {
        url: res.data.url,
        key: res.data.key,
      };
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSourceChange = (source) => {
    if (source === "independent") {
      setFormData((prev) => ({
        ...prev,
        event_source: "independent",
        type_of_activity:
          prev.type_of_activity === "GAD" ? "" : prev.type_of_activity,
        project: "",
        gad_activity: "",
      }));
      autoOrganizingUnitRef.current = null;
    } else {
      setFormData((prev) => ({
        ...prev,
        event_source: "project",
        type_of_activity: "GAD",
      }));
    }
  };

  const handleTypeChange = (type) => {
    if (formData.event_source === "project" && type !== "GAD") return;
    if (formData.event_source === "independent" && type === "GAD") return;
    handleChange("type_of_activity", type);
    if (type !== "GAD") {
      setFormData((prev) => ({ ...prev, project: "", gad_activity: "" }));
    }
  };

  const handlePosterSelect = (e) => {
    const file = e.target.files[0];
    setPosterFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPosterPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPosterPreview(null);
    }
  };

  const generateDescription = async () => {
    setGenerating(true);
    setError("");
    try {
      const { title, venue, date, type_of_activity, gad_activity } = formData;

      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          start_date: date || undefined,
          type_of_activity,
          gad_activity,
        }),
      });

      const data = await response.json().catch(() => null);

      /* A generated description only replaces what the user typed when the
         request actually succeeded; error payloads carry no description and
         used to blank the textarea silently. */
      if (!response.ok) {
        setError(data?.error || "Failed to generate description.");
        return;
      }
      if (!data?.description) {
        setError("The AI returned an empty description. Please try again.");
        return;
      }

      setFormData((prev) => ({ ...prev, description: data.description }));
    } catch (err) {
      setError("Failed to generate description.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Event title is required");
      setLoading(false);
      return;
    }

    if (formData.event_source === "project") {
      if (
        formData.type_of_activity !== "GAD" ||
        !formData.project ||
        !formData.gad_activity
      ) {
        setError(
          "Project-based events require a GAD Activity — select a project and its GAD activity.",
        );
        setLoading(false);
        return;
      }
    } else {
      if (formData.type_of_activity === "GAD") {
        setError(
          "GAD events must be project-based. Select Project-based (GPB) or choose another activity type.",
        );
        setLoading(false);
        return;
      }
      if (formData.project || formData.gad_activity) {
        setError("Independent events cannot be linked to a project.");
        setLoading(false);
        return;
      }
    }

    if (!formData.date) {
      setError("Event date is required");
      setLoading(false);
      return;
    }

    /* Events are scheduled by date only: the day runs from Manila midnight to
       23:59 (data/lib/appTime.js), so the stored instant keeps the calendar day
       the user picked even from a browser set to another time zone. */
    const dayRange = appDayRange(formData.date);
    if (!dayRange) {
      setError("Invalid event date");
      setLoading(false);
      return;
    }

    try {
      let posterUrl = null;

      if (posterFile) {
        posterUrl = await uploadPoster();
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_date: dayRange.start_date,
        end_date: dayRange.end_date,
        venue: formData.venue.trim(),
        type_of_activity: formData.type_of_activity,
        organizing_office_unit: formData.organizing_office_unit,
        co_organizing_office_unit: formData.co_organizing_office_unit,
        ...(formData.event_source === "project" && formData.project
          ? { project: formData.project }
          : {}),
        ...(formData.event_source === "project" && formData.gad_activity
          ? { gad_activity: formData.gad_activity }
          : {}),
        ...(userId ? { created_by: userId } : {}),
        ...(posterUrl ? { event_poster: posterUrl } : {}),
      };

      await axios.post("/api/events", payload);
      setSuccess("Event created successfully");

      const redirectPath =
        userRole === "dean" ? "/dean/projects" : "/events-list";
      /* `loading` stays true until the redirect: clearing it here re-enabled
         the button for the 1.2s the success message shows, and a second
         click created a duplicate event with its own reference number. */
      setTimeout(() => router.push(redirectPath), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error creating event. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-secondary-600 mb-4 transition-colors"
      >
        <FaArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-lg shadow-secondary-500/20 shrink-0">
          <FaCalendarAlt className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Fill out the details below to schedule a new event.
          </p>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── 0. Event Source ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaProjectDiagram}
            color="cyan"
            title="Event Source"
            subtitle="Choose first — this controls the rest of the form"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EVENT_SOURCES.map((source) => (
              <button
                type="button"
                key={source.value}
                onClick={() => handleSourceChange(source.value)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  formData.event_source === source.value
                    ? "border-secondary-500 bg-secondary-50 ring-2 ring-secondary-500/20 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      formData.event_source === source.value
                        ? "border-secondary-600"
                        : "border-gray-300"
                    }`}
                  >
                    {formData.event_source === source.value && (
                      <span className="h-2.5 w-2.5 rounded-full bg-secondary-600" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {source.label}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {source.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaInfoCircle}
            color="blue"
            title="Event Information"
            subtitle="Basic details about the activity"
          />

          <div>
            <p className={labelClass} id="activity-type-label">
              <FaTag className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" aria-hidden="true" />
              Type of Activity <span className="text-red-500">*</span>
            </p>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              role="group"
              aria-labelledby="activity-type-label"
            >
              {filteredActivityTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  aria-pressed={formData.type_of_activity === type}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    formData.type_of_activity === type
                      ? "border-secondary-500 bg-secondary-50 text-secondary-700 ring-2 ring-secondary-500/20 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Project / GAD Activity — only for project-based events */}
          {isProjectBased && (
            <div>
              <label className={labelClass} htmlFor="event-gad-activity">
                <FaProjectDiagram className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" aria-hidden="true" />
                GAD Activity <span className="text-red-500">*</span>
              </label>
              {projects.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No projects with GAD activities found. Please create a GPB
                  project first.
                </p>
              ) : (
                <select
                  id="event-gad-activity"
                  value={
                    formData.project && formData.gad_activity
                      ? activityOptionValue(
                          formData.project,
                          formData.gad_activity,
                        )
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setFormData((prev) => ({
                        ...prev,
                        project: "",
                        gad_activity: "",
                      }));
                      return;
                    }
                    const { project, gad_activity } = splitActivityOption(val);
                    /* Picking an activity names the event after it and scopes
                       the event to the unit its creator belongs to: the GAD
                       Unit for a focal person, the college a coordinator is
                       assigned to. Switching activity swaps out the unit this
                       prefill added before and keeps every office picked by
                       hand. */
                    const unit = defaultOrganizingUnit(userRole, userCollege);
                    /* Snapshot the unit the last prefill added before updating
                       state so the updater below stays a pure function. */
                    const previousAutoUnit = autoOrganizingUnitRef.current;
                    autoOrganizingUnitRef.current = unit;

                    setFormData((prev) => {
                      const kept = (prev.organizing_office_unit || []).filter(
                        (office) => office !== previousAutoUnit,
                      );
                      const nextUnits =
                        unit && !kept.includes(unit) ? [...kept, unit] : kept;

                      return {
                        ...prev,
                        project,
                        gad_activity,
                        title: gad_activity,
                        organizing_office_unit: nextUnits,
                      };
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">Select a GAD activity...</option>
                  {projects.map((proj) => {
                    const activities = resolveProjectActivities(proj);
                    if (activities.length === 0) return null;
                    return (
                      <optgroup key={proj._id} label={projectPickerLabel(proj)}>
                        {/* Only the activity title is offered here — the
                            GPB description would turn every option into a
                            paragraph and the event stores the title only. A
                            GPB title can run to a full sentence, so the option
                            is shortened while `title` keeps the full text. */}
                        {activities.map((activity, idx) => (
                          <option
                            key={`${proj._id}-${idx}`}
                            value={activityOptionValue(proj._id, activity)}
                            title={activity}
                          >
                            {truncateOptionLabel(activity)}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                This activity is required because the event type is GAD.
                Selecting one fills in the event title and your office/unit.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelClass} htmlFor="event-title">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={inputClass}
              placeholder="Enter event title"
            />
          </div>

          {/* Poster Upload */}
          <div>
            <label className={labelClass} htmlFor="event-poster">
              <FaImage className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" aria-hidden="true" />
              Event Poster
            </label>
            <input
              id="event-poster"
              ref={posterInputRef}
              type="file"
              accept="image/*"
              onChange={handlePosterSelect}
              className="hidden"
            />
            <div
              role="button"
              tabIndex={0}
              aria-label={posterPreview ? "Change event poster" : "Choose an event poster"}
              onClick={() => posterInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  posterInputRef.current?.click();
                }
              }}
              className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-all ${
                posterPreview
                  ? "border-secondary-200 bg-secondary-50/40"
                  : "border-gray-200 hover:border-secondary-300 hover:bg-secondary-50/30"
              }`}
            >
              {posterPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterPreview}
                    alt="Poster preview"
                    className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {posterFile?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Click to change the poster
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <FaUpload className="h-5 w-5 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">
                      Upload an event poster
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Click to browse · PNG, JPG or GIF
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaCalendarAlt}
            color="amber"
            title="Schedule"
            subtitle="Set the event date"
          />

          <div>
            <label className={labelClass} htmlFor="event-date">
              Event Date <span className="text-red-500">*</span>
            </label>
            <input
              id="event-date"
              type="date"
              value={formData.date}
              min={todayLocal}
              onChange={(e) => handleChange("date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaFileAlt}
            color="cyan"
            title="Details"
            subtitle="Describe the event and location"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={labelClass.replace("mb-2", "")}>
                Description
              </span>
              <button
                type="button"
                onClick={generateDescription}
                disabled={generating || !canGenerateDescription}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-secondary-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-black shadow-sm transition-all hover:shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaMagic className="h-3 w-3" />
                {generating ? "Generating..." : "Generate with AI"}
              </button>
            </div>
            <textarea
              id="event-description"
              aria-label="Description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={`${inputClass} resize-y min-h-[100px]`}
              rows={4}
              placeholder="Add a detailed event description..."
            />
            {!canGenerateDescription && (
              <p className="text-xs text-gray-500 mt-1.5">
                Fill in the event title, date and GAD activity (for GAD events)
                to enable AI description generation.
              </p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className={labelClass} htmlFor="event-venue">
              <FaMapMarkerAlt className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" aria-hidden="true" />
              Venue
            </label>
            <input
              id="event-venue"
              type="text"
              value={formData.venue}
              onChange={(e) => handleChange("venue", e.target.value)}
              className={inputClass}
              placeholder="Where will this be held?"
            />
          </div>
        </div>

        {/* ── 4. Organizing Offices ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaBuilding}
            color="emerald"
            title="Organizing Offices"
            subtitle="Select the office units involved"
          />

          <EventOfficeDropdown
            label="Organizing Office/Unit"
            icon={FaBuilding}
            options={OFFICE_OPTIONS}
            selected={formData.organizing_office_unit}
            onChange={(vals) =>
              setFormData((prev) => ({ ...prev, organizing_office_unit: vals }))
            }
            required
            description="Select at least one primary organizing office."
          />

          <EventOfficeDropdown
            label="Co-Organizing Office/Unit"
            icon={FaUsers}
            options={OFFICE_OPTIONS}
            selected={formData.co_organizing_office_unit}
            onChange={(vals) =>
              setFormData((prev) => ({
                ...prev,
                co_organizing_office_unit: vals,
              }))
            }
            required
            allowCustom
            description="Select supporting offices, or type an office/unit that is not listed."
          />
        </div>

        {/* ── Footer Actions ───────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                userRole === "dean" ? "/dean/projects" : "/events-list",
              )
            }
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-secondary-700 to-secondary-500 text-sm font-medium text-white shadow-lg shadow-secondary-500/25 transition-all hover:shadow-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading || uploading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
