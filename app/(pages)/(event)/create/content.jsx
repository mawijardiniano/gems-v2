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
  FaChevronDown,
  FaCheck,
  FaBuilding,
  FaProjectDiagram,
  FaTimes,
  FaExclamationCircle,
  FaCheckCircle,
  FaMagic,
  FaPlus,
  FaMinus,
  FaUpload,
  FaTag,
  FaArrowLeft,
} from "react-icons/fa";
import { OFFICE_OPTIONS, addTypedOffice, defaultOrganizingUnit } from "@/lib/colleges";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500";

const labelClass = "block text-sm font-medium text-gray-700 mb-2 gap-2 flex items-center";

const ACTIVITY_TYPES = [
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
];

const EVENT_SOURCES = [
  {
    value: "project",
    label: "Project-based (GPB)",
    description: "Linked to a GPB project + GAD activity",
  },
  {
    value: "independent",
    label: "Independent",
    description: "Not based on any project. Standalone event.",
  },
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

function CheckboxDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
  required,
  description,
  /* Offices may also be typed by hand, exactly like the GPB responsible-office
     picker, so the panel gets an "add an office" row under the option list. */
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    let newSelected;

    if (selected.includes(option)) {
      newSelected = selected.filter((v) => v !== option);
    } else {
      if (option === "None") {
        newSelected = ["None"];
      } else {
        newSelected = selected.filter((v) => v !== "None");
        newSelected.push(option);
      }
    }

    onChange(newSelected);
  };

  /* A hand-typed office/unit joins the selection as a chip and can be removed
     with the same × as the options picked from the list. */
  const addDraft = () => {
    onChange(addTypedOffice(selected, draft));
    setDraft("");
  };

  return (
    <div className="relative" ref={ref}>
      <label className={labelClass}>
        {Icon && (
          <Icon className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" />
        )}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-400 mb-2">{description}</p>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 ${
          open
            ? "border-secondary-500 bg-secondary-50/50"
            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
        } ${selected.length === 0 ? "text-gray-400" : "text-gray-900"}`}
      >
        <span className="flex items-center gap-2 truncate pr-2">
          {selected.length === 0 ? "Select options..." : selected.join(", ")}
        </span>
        <FaChevronDown
          className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-secondary-50 border border-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700"
            >
              {item}
              <button
                type="button"
                onClick={() => toggleOption(item)}
                className="hover:text-secondary-900 transition-colors"
              >
                <FaTimes className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50 overflow-hidden">
          <div className="max-h-60 overflow-auto py-1">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => toggleOption(option)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="pr-2">{option}</span>
                {selected.includes(option) && (
                  <FaCheck className="h-3.5 w-3.5 text-secondary-600 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {allowCustom && (
            <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 p-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraft();
                  }
                }}
                placeholder="Type an office not listed..."
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500"
              />
              <button
                type="button"
                onClick={addDraft}
                disabled={!draft.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaPlus className="h-3 w-3" /> Add
              </button>
            </div>
          )}
        </div>
      )}
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
    start_time: "",
    end_time: "",
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
    if (isProjectBased) {
      return ACTIVITY_TYPES.filter((type) => type === "GAD");
    }
    if (userRole === "dean" || isDeanRoute) {
      return ACTIVITY_TYPES.filter((type) => type !== "GAD");
    }
    return ACTIVITY_TYPES.filter((type) => type !== "GAD");
  }, [userRole, isDeanRoute, isProjectBased]);

  const todayLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }, []);

  const canGenerateDescription = useMemo(() => {
    const baseValid =
      formData.title.trim().length > 0 &&
      formData.venue.trim().length > 0 &&
      formData.type_of_activity &&
      formData.date &&
      formData.start_time &&
      formData.end_time;

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
        type_of_activity: prev.type_of_activity === "GAD" ? "" : prev.type_of_activity,
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
      const {
        title,
        venue,
        date,
        start_time,
        type_of_activity,
        gad_activity,
      } = formData;

      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          start_date:
            date && start_time ? `${date}T${start_time}` : undefined,
          type_of_activity,
          gad_activity,
        }),
      });

      const data = await response.json();
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
        setError("GAD events must be project-based. Select Project-based (GPB) or choose another activity type.");
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
    if (!formData.start_time || !formData.end_time) {
      setError("Start time and end time are required");
      setLoading(false);
      return;
    }

    const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
    const endDateTime = new Date(`${formData.date}T${formData.end_time}`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      setError("Invalid date or time values");
      setLoading(false);
      return;
    }
    if (endDateTime < startDateTime) {
      setError("End time must be after start time");
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
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
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

      const redirectPath = userRole === "dean" ? "/dean/projects" : "/events-list";
      setTimeout(() => router.push(redirectPath), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error creating event. Please try again.",
      );
    } finally {
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
            <label className={labelClass}>
              <FaTag className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" />
              Type of Activity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredActivityTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleTypeChange(type)}
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
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 transition-all">
              <label className="block text-sm font-semibold text-emerald-800 mb-2">
                <FaProjectDiagram className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                GAD Activity <span className="text-red-500">*</span>
              </label>
              {projects.length === 0 ? (
                <p className="text-xs text-emerald-600/80 italic">
                  No projects with GAD activities found. Please create a GPB
                  project first.
                </p>
              ) : (
                <select
                  value={
                    formData.project && formData.gad_activity
                      ? `${formData.project}||||${formData.gad_activity}`
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
                    const [project, gad_activity] = val.split("||||");
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
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select a GAD activity...</option>
                  {projects.map((proj) => {
                    const activities = (
                      Array.isArray(proj.gad_activity)
                        ? proj.gad_activity
                        : [proj.gad_activity]
                    )
                      .filter(Boolean)
                      .map((activity) =>
                        typeof activity === "object"
                          ? activity.value
                          : activity,
                      );
                    if (activities.length === 0) return null;
                    const projectLabel =
                      typeof proj.project_type === "object"
                        ? proj.project_type.value
                        : proj.project_type;
                    return (
                      <optgroup
                        key={proj._id}
                        label={`${projectLabel || "Project"} (${proj.year})`}
                      >
                        {/* Only the activity title is offered here — the
                            GPB description would turn every option into a
                            paragraph and the event stores the title only. */}
                        {activities.map((activity, idx) => (
                          <option
                            key={`${proj._id}-${idx}`}
                            value={`${proj._id}||||${activity}`}
                          >
                            {activity}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              )}
              <p className="text-xs text-emerald-600/70 mt-2">
                This activity is required because the event type is GAD.
                Selecting one fills in the event title and your office/unit.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelClass}>
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={inputClass}
              placeholder="Enter event title"
            />
          </div>

          {/* Poster Upload */}
          <div>
            <label className={labelClass}>
              <FaImage className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" />
              Event Poster
            </label>
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              onChange={handlePosterSelect}
              className="hidden"
            />
            <div
              onClick={() => posterInputRef.current?.click()}
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
            subtitle="Set the event date and time"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                min={todayLocal}
                onChange={(e) => handleChange("date", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
                className={inputClass}
              />
            </div>
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
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={`${inputClass} resize-y min-h-[100px]`}
              rows={4}
              placeholder="Add a detailed event description..."
            />
            {!canGenerateDescription && (
              <p className="text-xs text-gray-400 mt-1.5">
                Fill in the title, venue, dates and GAD activity (if GAD) to
                enable AI description generation.
              </p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className={labelClass}>
              <FaMapMarkerAlt className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" />
              Venue
            </label>
            <input
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

          <CheckboxDropdown
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

          <CheckboxDropdown
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
            onClick={() => router.push(userRole === "dean" ? "/dean/projects" : "/events-list")}
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
