"use client";

import axios from "axios";
import { useState } from "react";
import { FiX } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import EventFormFields from "../../../../components/EventFormFields";

/* Editing uploads a new poster straight away (and can remove the saved one).
   The replaced file is cleaned up by the page once the save succeeds, and a
   new upload is deleted by OverviewTab if the edit is cancelled. */
function PosterEditor({ poster, onChange, onUploadingChange }) {
  const [uploading, setUploadingState] = useState(false);
  const [error, setError] = useState("");

  const setUploading = (value) => {
    setUploadingState(value);
    onUploadingChange?.(value);
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "events/posters");
      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange({ url: res.data.url, key: res.data.key });
    } catch (err) {
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label
        className="block text-sm font-medium text-gray-700 mb-2"
        htmlFor="edit-event-poster"
      >
        Event Poster
      </label>
      {poster?.url && (
        <div className="mb-3">
          <div className="relative inline-block">
            <img
              src={poster.url}
              alt="Event poster"
              className="w-40 h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
            />
            <button
              type="button"
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
              onClick={() => onChange("")}
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
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {uploading && (
        <p className="text-sm text-secondary-500 mt-2 flex items-center gap-2">
          <FaSpinner className="animate-spin" /> Uploading...
        </p>
      )}
      {error && <p className="alert-error mt-2 !p-2">{error}</p>}
    </div>
  );
}

/* The edit body of the Event Details card: the shared event fields plus the
   edit-only poster editor. Saving and cancelling are owned by OverviewTab. */
export default function EventEditForm({
  editData,
  setEditData,
  projects,
  saving,
  saveError,
  setSaveError,
  onCancel,
  onSave,
}) {
  const [posterUploading, setPosterUploading] = useState(false);

  return (
    <>
      <EventFormFields
        variant="compact"
        idPrefix="edit-event"
        values={editData || {}}
        /* editData can briefly be null before the event loads. */
        setValues={(update) =>
          setEditData((prev) =>
            typeof update === "function" ? update(prev || {}) : update,
          )
        }
        projects={projects}
        onError={setSaveError}
        posterField={
          <PosterEditor
            poster={editData?.event_poster}
            onChange={(poster) =>
              setEditData((prev) => ({ ...(prev || {}), event_poster: poster }))
            }
            onUploadingChange={setPosterUploading}
          />
        }
      />

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
