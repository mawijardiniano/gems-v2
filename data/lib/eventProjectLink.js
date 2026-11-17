import mongoose from "mongoose";
import Project from "@/models/projects";
import { resolveProjectActivities } from "@/data/lib/projectActivities";

/**
 * Checks a project-based event's link before it is saved.
 *
 * The event routes used to take `project` and `gad_activity` on trust: any
 * user could attach their event to another office's GPB project (adding it to
 * that project's `events`), name an activity the project does not have, or
 * send a malformed id that surfaced as a 500.
 *
 * Rules: the project must exist; it must be the caller's own project (the
 * picker only offers those) unless the caller is an Admin or the link is the
 * one the event already has; and the activity must be one of the project's.
 *
 * @returns {Promise<string|null>} an error message, or null when the link is valid
 */
export async function checkEventProjectLink({
  projectId,
  gadActivity,
  user,
  existingProjectId = null,
}) {
  if (!projectId) return null;
  if (!mongoose.isValidObjectId(projectId)) return "Invalid project.";

  const project = await Project.findById(projectId)
    .select("createdBy gad_activity")
    .lean();
  if (!project) return "The selected project no longer exists.";

  const unchanged =
    existingProjectId && String(existingProjectId) === String(projectId);
  const ownsProject = String(project.createdBy) === String(user?._id);
  if (!unchanged && !ownsProject && user?.role !== "Admin") {
    return "You can only link events to your own projects.";
  }

  const activity = String(gadActivity || "").trim();
  if (activity && !resolveProjectActivities(project).includes(activity)) {
    return "The selected GAD activity is not part of that project.";
  }
  return null;
}
