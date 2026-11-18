"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { appDayRange } from "@/data/lib/appTime";
import { buildEditData } from "../lib/eventEditData";
import { useFileUploads } from "@/hooks/useFileUploads";

/* The Overview's edit form: its state, and saving it.

   The form is rebuilt from the event whenever the event changes (first load,
   background reload, after a save), always through buildEditData, but not
   while it is open: a reload after cancelling/reinstating the event or a
   manual encode used to throw away what the user had typed. */
export function useEventEditor({ event, setEvent, userId }) {
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  /* Poster files of the open edit: a poster uploaded and then replaced,
     removed or cancelled is deleted; the saved one is only deleted once a
     save drops it; leaving the page mid-edit rolls the new uploads back.
     Each of those used to leave an orphan file. */
  const posterFiles = useFileUploads({ rollbackOnUnmount: true });
  useEffect(() => {
    if (!isEditing) return;
    const savedKey = event?.event_poster?.key;
    posterFiles.startSession(savedKey ? [savedKey] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    if (event && !isEditing) setEditData(buildEditData(event));
  }, [event, isEditing]);

  /* Returns true on success so the form only closes when the change stuck.
     Errors go to `saveError`, shown inside the form: the page-level error
     replaces the whole page and would throw the edit away. */
  const handleSave = async () => {
    if (!event?._id || !userId || !editData) return false;

    setSaving(true);
    setSaveError("");

    try {
      const newPoster = editData.event_poster;

      if (!editData.date) {
        setSaveError("Please pick the event date.");
        return false;
      }
      /* Switching an event to Independent clears a GAD type on purpose, so
         the organizer must choose one. */
      if (!editData.type_of_activity) {
        setSaveError("Please select a type of activity.");
        return false;
      }
      if (editData.event_source === "project" && !editData.gad_activity) {
        setSaveError(
          "Please select the GAD activity for this project-based event.",
        );
        return false;
      }

      /* Events are scheduled by date only (Manila midnight to end of day), as
         on the create page. When the date is left alone the stored range is
         not re-sent, so a legacy multi-day event keeps its span. */
      const dateChanged = editData.date !== buildEditData(event).date;
      const dates = {};
      if (dateChanged) {
        const dayRange = appDayRange(editData.date);
        if (!dayRange) {
          setSaveError("Invalid event date value.");
          return false;
        }
        Object.assign(dates, dayRange);
      }

      const payload = { ...editData, ...dates, updated_by: userId };
      delete payload.date;
      // Never send the removed audience fields or the UI-only source flag.
      delete payload.eligibility_criteria;
      delete payload.target_number_of_participants;
      delete payload.event_source;
      // Normalize project linkage: independent sends null, project sends id.
      if (!payload.project) payload.project = null;
      if (!payload.project) payload.gad_activity = "";

      const res = await axios.put(`/api/events/${event._id}`, payload);
      const updated = res.data?.data || event;

      /* The saved poster is deleted only now that the record no longer
         uses it (replaced or removed). A failed cleanup only leaves an
         orphan file; the save itself already succeeded. */
      posterFiles.syncCurrent(newPoster?.key ? [newPoster.key] : []);
      await posterFiles.commit();

      /* Keep the hydrated creator already on screen; the effect above then
         rebuilds the form from the saved event. */
      setEvent({
        ...event,
        ...updated,
        created_by: event.created_by,
        event_poster: updated.event_poster ?? editData.event_poster,
      });
      return true;
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    editData,
    setEditData,
    isEditing,
    setIsEditing,
    saving,
    saveError,
    setSaveError,
    handleSave,
    posterFiles,
  };
}
