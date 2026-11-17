"use client";

import axios from "axios";
import { useState } from "react";
import { FiX } from "react-icons/fi";
import { FaMagic, FaSpinner } from "react-icons/fa";
import EventOfficeDropdown from "../../../../components/EventOfficeDropdown";
import { EVENT_SOURCES } from "../../../../components/eventFormOptions";
import { officeOptionList } from "@/data/lib/colleges";
import {
  activityOptionValue,
  projectPickerLabel,
  resolveProjectActivities,
  splitActivityOption,
  truncateOptionLabel,
} from "@/data/lib/projectActivities";

/* The edit body of the Event Details card. Saving and cancelling are owned by
   the parent (OverviewTab), which also resets the form state; this component
   only edits `editData`. */
export default function EventEditForm({
  event,
  editData,
  setEditData,
  handleEditChange,
  projects,
  saving,
  saveError,
  setSaveError,
  onCancel,
  onSave,
}) {
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [generating, setGenerating] = useState(false);

  const source =
    editData?.event_source || (event?.project ? "project" : "independent");
  const isProjectBased = source === "project";

  /* One state update per switch: the related fields (type, project, activity)
     always change together. */
  const chooseSource = (value) => {
    setEditData((prev) => {
      const next = { ...(prev || {}), event_source: value };
      if (value === "independent") {
        if (next.type_of_activity === "GAD") next.type_of_activity = "Academic";
        next.project = "";
        next.gad_activity = "";
      } else {
        next.type_of_activity = "GAD";
      }
      return next;
    });
  };

  const chooseType = (value) => {
    setEditData((prev) => ({
      ...(prev || {}),
      type_of_activity: value,
      ...(value !== "GAD" ? { project: "", gad_activity: "" } : {}),
    }));
  };

  const generateDescription = async () => {
    setGenerating(true);
    try {
      const { title, venue, type_of_activity, gad_activity } = editData || {};
      /* The saved range is the source of truth; editData only carries the
         date-only input value. */
      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          start_date: event?.start_date,
          end_date: event?.end_date,
          type_of_activity,
          gad_activity,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate description.");
      }
      if (data.description) {
        handleEditChange("description", data.description);
      }
    } catch (err) {
      console.error(err);
      setSaveError(err.message || "Failed to generate description.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePosterUpload = async (file) => {
    if (!file) return;
    setPosterUploading(true);
    setPosterError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "events/posters");

      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      handleEditChange("event_poster", {
        url: res.data.url,
        key: res.data.key,
      });
    } catch (err) {
      setPosterError("Failed to upload image. Please try again.");
    } finally {
      setPosterUploading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <p className="label" id="edit-event-source-label">
            Event Source <span className="text-red-500">*</span>
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="group"
            aria-labelledby="edit-event-source-label"
          >
            {EVENT_SOURCES.map((option) => {
              const active = source === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => chooseSource(option.value)}
                  aria-pressed={active}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-secondary-500 bg-secondary-50 ring-2 ring-secondary-500/20 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="label" htmlFor="edit-event-poster">
            Event Poster
          </label>
          {editData?.event_poster && (
            <div className="mb-3">
              <div className="relative inline-block">
                <img
                  src={editData.event_poster.url}
                  alt="Event poster"
                  className="w-40 h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                  onClick={() => handleEditChange("event_poster", "")}
                  aria-label="Remove poster"
                >
                  <FiX size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="file-input">
            <input
              id="edit-event-poster"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePosterUpload(file);
              }}
            />
          </div>

          {posterUploading && (
            <p className="text-sm text-secondary-500 mt-2 flex items-center gap-2">
              <FaSpinner className="animate-spin" /> Uploading...
            </p>
          )}
          {posterError && (
            <p className="alert-error mt-2 !p-2">{posterError}</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="edit-event-type">
            Type of Activity <span className="text-red-500">*</span>
          </label>
          {isProjectBased ? (
            <input
              id="edit-event-type"
              value="GAD"
              disabled
              className="input bg-gray-50"
            />
          ) : (
            <select
              id="edit-event-type"
              value={editData?.type_of_activity}
              onChange={(e) => chooseType(e.target.value)}
              className="input"
              required
            >
              <option value="">Select activity type</option>
              <option value="Academic">Academic</option>
              <option value="Administrative">Administrative</option>
              <option value="Extension">Extension</option>
              <option value="Research">Research</option>
              <option value="Students">Students</option>
            </select>
          )}
        </div>

        {isProjectBased && (
          <div>
            <label className="label" htmlFor="edit-event-gad-activity">
              GAD Activity <span className="text-red-500">*</span>
            </label>
            <select
              id="edit-event-gad-activity"
              value={
                editData?.project && editData?.gad_activity
                  ? activityOptionValue(editData.project, editData.gad_activity)
                  : ""
              }
              onChange={(e) => {
                /* Same helpers as the create page: projects store activities
                   as { value: [...] }, and an activity title may itself
                   contain the separator. */
                const { project, gad_activity } = splitActivityOption(
                  e.target.value,
                );
                setEditData((prev) => ({
                  ...(prev || {}),
                  project,
                  gad_activity,
                }));
              }}
              className="input"
              required
            >
              <option value="">Select a GAD activity...</option>
              {projects.map((proj) => (
                <optgroup key={proj._id} label={projectPickerLabel(proj)}>
                  {resolveProjectActivities(proj).map((activity) => (
                    <option
                      key={`${proj._id}-${activity}`}
                      value={activityOptionValue(proj._id, activity)}
                      title={activity}
                    >
                      {truncateOptionLabel(activity)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="edit-event-title">
            Title
          </label>
          <input
            id="edit-event-title"
            type="text"
            className="input"
            value={editData?.title || ""}
            onChange={(e) => handleEditChange("title", e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="edit-event-venue">
            Venue
          </label>
          <input
            id="edit-event-venue"
            type="text"
            className="input"
            value={editData?.venue || ""}
            onChange={(e) => handleEditChange("venue", e.target.value)}
          />
        </div>

        {/* Date only, as on the create page: events run the whole day. */}
        <div>
          <label className="label" htmlFor="edit-event-date">
            Event Date
          </label>
          <input
            id="edit-event-date"
            type="date"
            className="input"
            value={editData?.date || ""}
            onChange={(e) => handleEditChange("date", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-1.5">
            <label className="label !mb-0" htmlFor="edit-event-description">
              Description
            </label>
            <button
              type="button"
              onClick={generateDescription}
              disabled={generating}
              className="btn-secondary !py-1.5 !px-3 !text-xs"
            >
              <FaMagic className="text-secondary-500" size={12} />
              {generating ? "Generating..." : "Auto-Generate"}
            </button>
          </div>
          <textarea
            id="edit-event-description"
            rows={4}
            className="input resize-y"
            value={editData?.description || ""}
            onChange={(e) => handleEditChange("description", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          {/* Saved offices that are not on the canonical list — a freely typed
              one, or a legacy "&" college — are offered too, so they stay
              visible and can be unticked. */}
          <EventOfficeDropdown
            label="Organizing Office/Unit"
            options={officeOptionList(editData?.organizing_office_unit)}
            selected={editData?.organizing_office_unit || []}
            onChange={(vals) => handleEditChange("organizing_office_unit", vals)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <EventOfficeDropdown
            label="Co Organizing Office/Unit"
            options={officeOptionList(editData?.co_organizing_office_unit)}
            selected={editData?.co_organizing_office_unit || []}
            onChange={(vals) =>
              handleEditChange("co_organizing_office_unit", vals)
            }
            required
            allowCustom
          />
        </div>
      </div>

      {saveError && (
        <p className="alert-error mt-6" role="alert">
          {saveError}
        </p>
      )}
      <div className="flex gap-3 justify-end pt-6 border-t border-gray-100 mt-8">
        <button onClick={onCancel} className="btn-secondary !rounded-lg">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || posterUploading}
          className="btn-primary !rounded-lg"
        >
          {saving ? (
            <>
              <FaSpinner className="animate-spin" /> Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </>
  );
}
