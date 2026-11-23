"use client";

import axios from "axios";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarAlt,
  FaImage,
  FaExclamationCircle,
  FaCheckCircle,
  FaUpload,
  FaArrowLeft,
} from "react-icons/fa";
import { defaultOrganizingUnit } from "@/data/lib/colleges";
import { appDateInput, appDayRange } from "@/data/lib/appTime";
import {
  deleteUploadedFile,
  uploadFile,
  validateFiles,
} from "@/data/lib/uploadClient";
import { MAX_UPLOAD_FILE_BYTES } from "@/data/lib/uploadRules";

const POSTER_FOLDER = "events/posters";
import EventFormFields from "../components/EventFormFields";

const labelClass =
  "block text-sm font-medium text-gray-700 mb-2 gap-2 flex items-center";

function AlertBanner({ type = "error", message }) {
  const isError = type === "error";
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isError
          ? "border-danger-border bg-danger-subtle text-danger"
          : "border-success-border bg-success-subtle text-success"
      }`}
      role={isError ? "alert" : "status"}
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

/* Create keeps the chosen poster in the browser and uploads it on submit, so
   a form abandoned halfway leaves no orphan file in storage. */
function PosterPicker({ posterFile, posterPreview, onSelect }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className={labelClass} htmlFor="event-poster">
        <FaImage
          className="inline h-4 w-4 mr-1.5 text-gray-500 -mt-0.5"
          aria-hidden="true"
        />
        Event Poster
      </label>
      <input
        id="event-poster"
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        onChange={onSelect}
        className="hidden"
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={posterPreview ? "Change event poster" : "Choose an event poster"}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-4 cursor-pointer transition ${
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
              <FaUpload className="h-5 w-5 text-gray-300" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">
                Upload an event poster
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Click to browse · JPG, PNG, GIF or WEBP
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CreateEventsContent() {
  const router = useRouter();

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

  /* Today's Manila date, the earliest an event may be scheduled. */
  const todayLocal = useMemo(() => appDateInput(new Date()), []);

  /* The profile is loaded once; the creator's projects follow once the user
     id is known. This used to be one effect keyed on the userId it also set,
     so both requests ran twice and the first project filter ran with no id. */
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
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        const allProjects = res.data?.data || [];
        setProjects(
          allProjects.filter(
            (p) => p.createdBy?.toString() === userId.toString(),
          ),
        );
      } catch (err) {
        setProjects([]);
      }
    };
    fetchProjects();
  }, [userId]);

  const uploadPoster = async () => {
    if (!posterFile) return null;
    setUploading(true);
    try {
      const { url, key } = await uploadFile(posterFile, POSTER_FOLDER);
      return { url, key };
    } finally {
      setUploading(false);
    }
  };

  /* Checked when picked, against the server's poster rule: a HEIC or SVG
     used to be refused only at submit. */
  const handlePosterSelect = (e) => {
    const file = e.target.files[0];
    const problem = file
      ? validateFiles([file], {
          folder: POSTER_FOLDER,
          maxBytes: MAX_UPLOAD_FILE_BYTES,
          label: "The poster",
        })
      : null;
    if (problem) {
      e.target.value = "";
      setError(problem);
      return;
    }
    setError("");
    setPosterFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPosterPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPosterPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const fail = (message) => {
      setError(message);
      setLoading(false);
    };

    if (!formData.title.trim()) return fail("Event title is required");

    if (formData.event_source === "project") {
      if (
        formData.type_of_activity !== "GAD" ||
        !formData.project ||
        !formData.gad_activity
      ) {
        return fail(
          "Project-based events require a GAD Activity — select a project and its GAD activity.",
        );
      }
    } else {
      if (!formData.type_of_activity) return fail("Select a type of activity.");
      if (formData.type_of_activity === "GAD") {
        return fail(
          "GAD events must be project-based. Select Project-based (GPB) or choose another activity type.",
        );
      }
      if (formData.project || formData.gad_activity) {
        return fail("Independent events cannot be linked to a project.");
      }
    }

    if (!formData.date) return fail("Event date is required");

    /* Events are scheduled by date only: the day runs from Manila midnight to
       23:59 (data/lib/appTime.js), so the stored instant keeps the calendar day
       the user picked even from a browser set to another time zone. */
    const dayRange = appDayRange(formData.date);
    if (!dayRange) return fail("Invalid event date");

    /* Uploaded on submit; deleted again if the event is not created, so a
       failed attempt (or each retry) no longer leaves an orphan poster. */
    let posterUrl = null;
    try {
      posterUrl = posterFile ? await uploadPoster() : null;

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
      if (posterUrl?.key) deleteUploadedFile(posterUrl.key);
      fail(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Error creating event. Please try again.",
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-secondary-600 mb-4 transition-colors"
      >
        <FaArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <div className="flex items-start gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-lg shadow-secondary-500/20 shrink-0">
          <FaCalendarAlt className="h-6 w-6 text-white" aria-hidden="true" />
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
        <EventFormFields
          values={formData}
          setValues={setFormData}
          projects={projects}
          minDate={todayLocal}
          activityPrefill={{
            unit: defaultOrganizingUnit(userRole, userCollege),
          }}
          onError={setError}
          posterField={
            <PosterPicker
              posterFile={posterFile}
              posterPreview={posterPreview}
              onSelect={handlePosterSelect}
            />
          }
        />

        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                userRole === "dean" ? "/dean/projects" : "/events-list",
              )
            }
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-secondary-700 to-secondary-500 text-sm font-medium text-white shadow-lg shadow-secondary-500/25 transition hover:shadow-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading || uploading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
