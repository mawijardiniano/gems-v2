import Project from "@/models/projects";
import Event from "@/models/event";

export async function rollupEventActuals(eventId) {
  const event = await Event.findById(eventId).populate({
    path: "attended_users.user_id",
    select: "personal_info_id",
    populate: { path: "personal_info_id", select: "gadData" },
  });
  if (!event || !event.project) return null;

  const attended = Array.isArray(event.attended_users)
    ? event.attended_users
    : [];
  let female = 0;
  let male = 0;
  attended.forEach((att) => {
    const sex = (
      att?.user_id?.personal_info_id?.gadData?.sexAtBirth || ""
    ).toLowerCase();
    if (sex === "female") female += 1;
    else if (sex === "male") male += 1;
  });
  const other = attended.length - female - male;

  const start =
    event.start_date ||
    (Array.isArray(event.start_dates) ? event.start_dates[0] : null);
  const dateStr = start
    ? new Date(start).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const summary =
    `Conducted "${event.title}"` +
    (dateStr ? ` on ${dateStr}` : "") +
    ` — ${attended.length} participant${attended.length === 1 ? "" : "s"}` +
    ` (${female} Female, ${male} Male, ${other} Other)` +
    (event.venue ? ` — Venue: ${event.venue}` : "");

  const project = await Project.findById(event.project);
  if (!project) return null;

  const marker = `[ref:${eventId}]`;
  const lines = (project.actual_accomplishment || []).filter(
    (l) => !String(l).includes(marker),
  );
  lines.push(`${summary} ${marker}`);

  project.actual_accomplishment = lines;
  await project.save();
  return project;
}
