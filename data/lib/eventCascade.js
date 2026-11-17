import Event from "@/models/event";
import Project from "@/models/projects";
import AccomplishmentReport from "@/models/accomplishment_report";
import { deleteFileFromBucket } from "@/data/lib/delete";
import { collectReportFileKeys } from "@/data/lib/eventFileKeys";

/**
 * Deletes an event together with everything attached to it:
 *   - poster + accomplishment-report files in the storage bucket
 *   - the accomplishment report document
 *   - the `events` reference held by any project
 *
 * Shared by the event delete route and the project delete cascade so the
 * cleanup logic can never drift apart between the two callers.
 *
 * @param {object|string} eventOrId Event document or event id
 * @returns {Promise<{deleted: boolean, title?: string, keys: string[]}>}
 */
export async function deleteEventCascade(eventOrId) {
  const id = String(eventOrId?._id || eventOrId || "");
  if (!id) return { deleted: false, keys: [] };

  const event = eventOrId?._id ? eventOrId : await Event.findById(id);
  if (!event) return { deleted: false, keys: [] };

  const keys = [];
  if (event.event_poster?.key) keys.push(event.event_poster.key);

  const reports = await AccomplishmentReport.find({ event_id: id });
  for (const report of reports) keys.push(...collectReportFileKeys(report));

  /* A missing/broken object must not stop the record cleanup. */
  for (const key of keys) {
    try {
      await deleteFileFromBucket(key);
    } catch (err) {
      console.error(`Failed to delete file ${key}:`, err);
    }
  }

  await AccomplishmentReport.deleteMany({ event_id: id });
  await Project.updateMany(
    { events: event._id },
    { $pull: { events: event._id } },
  );
  await Event.deleteOne({ _id: event._id });

  return { deleted: true, title: event.title, keys };
}
