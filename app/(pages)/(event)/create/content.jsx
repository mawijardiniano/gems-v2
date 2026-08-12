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
  FaClipboardList,
  FaProjectDiagram,
  FaTimes,
  FaExclamationCircle,
  FaCheckCircle,
  FaMagic,
  FaPlus,
  FaMinus,
  FaUpload,
  FaTag,
} from "react-icons/fa";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";

const labelClass = "block text-sm font-medium text-gray-700 mb-2 gap-2 flex items-center";

const ACTIVITY_TYPES = [
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
];

const ELIGIBILITY_OPTIONS = [
  { value: "Scholarship Applicant", label: "Scholarship Applicant" },
  { value: "Solo Parent", label: "Solo Parent" },
  { value: "PWDs", label: "Person with Disability (PWD)" },
  { value: "Indigenous Group", label: "Indigenous Group Member" },
  { value: "LGBTQIA+", label: "LGBTQIA+" },
  { value: "Low Income Student", label: "Low-income Student" },
  { value: "None", label: "None" },
];

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, color = "blue", title, subtitle }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
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

// ─── Checkbox Dropdown ───────────────────────────────────────────
function CheckboxDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
  required,
  description,
}) {
  const [open, setOpen] = useState(false);
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
        className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          open
            ? "border-blue-500 bg-blue-50/50"
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
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              {item}
              <button
                type="button"
                onClick={() => toggleOption(item)}
                className="hover:text-blue-900 transition-colors"
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
                  <FaCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Alert Banners ───────────────────────────────────────────────
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

// ─── Main Component ──────────────────────────────────────────────
export default function CreateEventsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const isDeanRoute = pathname?.startsWith("/dean");

  const OFFICE_OPTIONS = [
    "Graduate School",
    "College of Agriculture",
    "College of Allied Health Sciences",
    "College of Arts & Social Sciences",
    "College of Business & Accountancy",
    "College of Criminal Justice Education",
    "College of Education",
    "College of Engineering",
    "College of Environmental Studies",
    "College of Fisheries & Aquatic Sciences",
    "College of Governance",
    "College of Industrial Technology",
    "College of Information & Computing Sciences",
    "Offices under the Office of the University President",
    "Offices under the Office of the Vice President for Academic Affairs",
    "Offices under the Office of the Vice President for Administration and Finance",
    "Offices under the Office of the Vice President for Research and Extension",
    "Offices under the Office of the Vice President for Student Affairs and Services",
  ];

  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    number_of_days: 1,
    start_dates: [""],
    end_dates: [""],
    venue: "",
    type_of_activity: "Academic",
    organizing_office_unit: [],
    co_organizing_office_unit: [],
    eligibility_criteria: [],
    target_number_of_participants: "",
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

  const isGAD = formData.type_of_activity === "GAD";

  const filteredActivityTypes = useMemo(() => {
    if (userRole === "dean" || isDeanRoute) {
      return ACTIVITY_TYPES.filter((type) => type !== "GAD");
    }
    return ACTIVITY_TYPES;
  }, [userRole, isDeanRoute]);

  const nowLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  const canGenerateDescription = useMemo(() => {
    const baseValid =
      formData.title.trim().length > 0 &&
      formData.venue.trim().length > 0 &&
      formData.type_of_activity &&
      Number(formData.number_of_days) > 0 &&
      formData.start_dates.length === Number(formData.number_of_days) &&
      formData.start_dates.every((d) => d) &&
      formData.end_dates.length === Number(formData.number_of_days) &&
      formData.end_dates.every((d) => d);

    if (formData.type_of_activity === "GAD") {
      return baseValid && Boolean(formData.gad_activity);
    }
    return baseValid;
  }, [formData]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile");
        setUserId(res.data?.user?._id || null);
        setUserRole(res.data?.user?.role?.toLowerCase() || null);
      } catch (err) {
        console.error("Error loading profile", err);
      }
    };

    const fetchProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        setProjects(res.data?.data || []);
      } catch (err) {
        setProjects([]);
      }
    };

    fetchProfile();
    fetchProjects();
  }, []);

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
    setFormData((prev) => {
      if (field === "number_of_days") {
        if (value === "" || isNaN(Number(value)) || Number(value) < 1) {
          return {
            ...prev,
            number_of_days: value,
            start_dates: [],
            end_dates: [],
          };
        }
        const num = Number(value);
        let start_dates = prev.start_dates.slice(0, num);
        let end_dates = prev.end_dates.slice(0, num);
        while (start_dates.length < num) start_dates.push("");
        while (end_dates.length < num) end_dates.push("");
        return { ...prev, number_of_days: num, start_dates, end_dates };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleTypeChange = (type) => {
    handleChange("type_of_activity", type);
    if (type !== "GAD") {
      setFormData((prev) => ({ ...prev, project: "", gad_activity: "" }));
    }
  };

  const adjustDays = (delta) => {
    const current = Number(formData.number_of_days) || 1;
    const next = Math.max(1, current + delta);
    handleChange("number_of_days", next);
  };

  const handleDateChange = (type, idx, value) => {
    setFormData((prev) => {
      const arr = [...prev[type]];
      arr[idx] = value;
      return { ...prev, [type]: arr };
    });
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
        number_of_days,
        type_of_activity,
        gad_activity,
        eligibility_criteria,
        target_number_of_participants,
      } = formData;

      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          number_of_days,
          type_of_activity,
          gad_activity,
          eligibility_criteria,
          target_number_of_participants,
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

    if (formData.type_of_activity === "GAD") {
      if (!formData.project || !formData.gad_activity) {
        setError(
          "Please select a GAD Activity — this field is required for GAD events.",
        );
        setLoading(false);
        return;
      }
    }

    for (let i = 0; i < formData.number_of_days; i++) {
      if (!formData.start_dates[i]) {
        setError(`Start date/time for day ${i + 1} is required`);
        setLoading(false);
        return;
      }
      if (!formData.end_dates[i]) {
        setError(`End date/time for day ${i + 1} is required`);
        setLoading(false);
        return;
      }
      if (new Date(formData.end_dates[i]) < new Date(formData.start_dates[i])) {
        setError(
          `End date/time must be after start date/time for day ${i + 1}`,
        );
        setLoading(false);
        return;
      }
    }

    try {
      let posterUrl = null;

      if (posterFile) {
        posterUrl = await uploadPoster();
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        number_of_days: formData.number_of_days,
        start_dates: formData.start_dates,
        end_dates: formData.end_dates,
        venue: formData.venue.trim(),
        type_of_activity: formData.type_of_activity,
        organizing_office_unit: formData.organizing_office_unit,
        co_organizing_office_unit: formData.co_organizing_office_unit,
        eligibility_criteria: formData.eligibility_criteria,
        target_number_of_participants: formData.target_number_of_participants,
        ...(formData.project ? { project: formData.project } : {}),
        ...(formData.gad_activity
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
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
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
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Project / GAD Activity — only for GAD type */}
          {isGAD && (
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
                    setFormData((prev) => ({ ...prev, project, gad_activity }));
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
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
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

        {/* ── 2. Schedule ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaCalendarAlt}
            color="amber"
            title="Schedule"
            subtitle="Set the number of days and date range"
          />

          {/* Number of Days */}
          <div>
            <label className={labelClass}>
              Number of Days <span className="text-red-500">*</span>
            </label>
            <div className="inline-flex items-center">
              <button
                type="button"
                onClick={() => adjustDays(-1)}
                disabled={Number(formData.number_of_days) <= 1}
                className="h-10 w-10 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaMinus className="h-3 w-3" />
              </button>
              <input
                type="number"
                min="1"
                value={formData.number_of_days}
                onChange={(e) => handleChange("number_of_days", e.target.value)}
                className="h-10 w-16 border border-gray-200 text-center text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => adjustDays(1)}
                className="h-10 w-10 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
              >
                <FaPlus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Date Rows */}
          {Number(formData.number_of_days) > 0 &&
            Array.from({ length: Number(formData.number_of_days) }).map(
              (_, idx) => (
                <div
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-4"
                  key={"day-row-" + idx}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Day {idx + 1}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        Start Date & Time{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start_dates[idx] || ""}
                        min={
                          idx === 0
                            ? nowLocal
                            : formData.end_dates[idx - 1] || nowLocal
                        }
                        onChange={(e) =>
                          handleDateChange("start_dates", idx, e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        End Date & Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end_dates[idx] || ""}
                        min={formData.start_dates[idx] || nowLocal}
                        onChange={(e) =>
                          handleDateChange("end_dates", idx, e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ),
            )}
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-black shadow-sm transition-all hover:shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
            description="Select supporting offices for this event."
          />
        </div>

        {/* ── 5. Audience & Participants ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionHeader
            icon={FaClipboardList}
            color="rose"
            title="Audience & Participants"
            subtitle="Define who can join and expected attendance"
          />

          <CheckboxDropdown
            label="Eligibility Criteria"
            icon={FaClipboardList}
            options={ELIGIBILITY_OPTIONS.map((o) => o.value)}
            selected={formData.eligibility_criteria || []}
            onChange={(vals) =>
              setFormData((prev) => ({
                ...prev,
                eligibility_criteria: vals,
              }))
            }
            description="Leave empty to allow everyone."
          />

          <div>
            <label className={labelClass}>
              <FaUsers className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5" />
              Target Number of Participants
            </label>
            <input
              type="number"
              value={formData.target_number_of_participants}
              onChange={(e) =>
                handleChange("target_number_of_participants", e.target.value)
              }
              className={inputClass}
              placeholder="e.g. 150"
            />
          </div>
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
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading || uploading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
