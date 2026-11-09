"use strict";

/* Helpers for reading a Project's GAD activities.
 *
 * `gad_activity` is stored through the FieldValue wrapper — the schema declares
 * it as `FieldSchema([String])`, which persists as `{ value: [String] }` — but
 * records written before the wrapper, and hand-built fixtures, still carry a
 * bare array or a plain string. Every reader therefore has to unwrap `.value`
 * *before* deciding whether it is looking at a list: testing Array.isArray on
 * the wrapper answers "no", which previously wrapped the whole list in another
 * array and rendered every activity as one comma-joined option.
 */

/* Unwraps a FieldValue ({ value }), a bare array, or a plain string into a flat
   array of trimmed, non-empty strings. */
export const resolveProjectActivities = (project) => {
  const raw = project?.gad_activity;

  /* A FieldValue wraps the real value; anything else is already the value. */
  const unwrapped =
    raw && !Array.isArray(raw) && typeof raw === "object" && "value" in raw
      ? raw.value
      : raw;

  const list = Array.isArray(unwrapped) ? unwrapped : [unwrapped];

  return list
    .map((activity) =>
      activity && typeof activity === "object" ? activity.value : activity,
    )
    .filter(
      (activity) => typeof activity === "string" && activity.trim().length > 0,
    )
    .map((activity) => activity.trim());
};

/* The human-readable label for a project in the GAD activity picker, e.g.
   "Client Focused (2027)". `project_type` is a FieldValue too. */
export const projectPickerLabel = (project) => {
  const raw = project?.project_type;
  const type =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw.value : raw;
  const name = typeof type === "string" && type.trim() ? type.trim() : "Project";
  const year = project?.year;

  return year ? `${name} (${year})` : name;
};

/* Splits the picker's "<projectId>||||<activity>" option value. The activity
   title itself may contain the separator, so only the first one is treated as
   the boundary — a plain split() would drop the tail. */
export const splitActivityOption = (value) => {
  const raw = String(value ?? "");
  const at = raw.indexOf("||||");
  if (at === -1) return { project: "", gad_activity: "" };

  return {
    project: raw.slice(0, at),
    gad_activity: raw.slice(at + 4),
  };
};

/* The option value for one activity of one project. */
export const activityOptionValue = (projectId, activity) =>
  `${projectId}||||${activity}`;

/* A GPB activity title can run to a full sentence, which a native <select>
   cannot wrap — it clips instead, and the picker reads as misaligned. The
   option text is shortened while the caller keeps the full title on the
   element's `title` attribute (and in the option value). */
export const truncateOptionLabel = (activity, limit = 90) => {
  const text = String(activity ?? "");
  if (text.length <= limit) return text;

  return `${text.slice(0, limit).trimEnd()}…`;
};
