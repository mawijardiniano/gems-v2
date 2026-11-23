"use client";

import { useState } from "react";
import { MAX_UPLOAD_FILE_BYTES } from "@/data/lib/uploadRules";
import { FiX } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import EventFormFields from "../../../../components/EventFormFields";
import Button from "@/components/ui/Button";

/* Editing uploads a new poster straight away (and can remove the saved one)
   through the editor's poster session (useEventEditor): a poster replaced or
   removed during the edit is deleted at once if it was uploaded in this
   edit; the saved one only once a save drops it. */
function PosterEditor({ poster, onChange, posterFiles }) {
  const [error, setError] = useState("");
  const uploading = Boolean(posterFiles?.isUploading);

  const replaceWith = (next) => {
    if (poster?.key && poster.key !== next?.key) posterFiles?.release(poster);
    posterFiles?.syncCurrent(next?.key ? [next.key] : []);
    onChange(next);
  };

  const upload = async (file) => {
    if (!file || !posterFiles) return;
    setError("");
    try {
      const uploaded = await posterFiles.upload([file], {
        folder: "events/posters",
        maxBytes: MAX_UPLOAD_FILE_BYTES,
        label: "The poster",
        target: "poster",
      });
      /* null: the edit was cancelled while it uploaded. */
      if (!uploaded?.length) return;
      replaceWith({ url: uploaded[0].url, key: uploaded[0].key });
    } catch (err) {
      setError(err.message || "Failed to upload image. Please try again.");
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
              className="touch-target absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
              onClick={() => replaceWith("")}
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
          accept=".jpg,.jpeg,.png,.gif,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            upload(file);
          }}
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
  posterFiles,
}) {
  const posterUploading = Boolean(posterFiles?.isUploading);

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
            posterFiles={posterFiles}
          />
        }
      />

      {saveError && (
        <p className="alert-error mt-6" role="alert">
          {saveError}
        </p>
      )}
      <div className="flex gap-3 justify-end pt-6 border-t border-gray-100 mt-8">
        <Button onClick={onCancel} variant="secondary" className="!rounded-lg">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || posterUploading}
          variant="primary"
          className="!rounded-lg"
        >
          {saving ? (
            <>
              <FaSpinner className="animate-spin" /> Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </>
  );
}
