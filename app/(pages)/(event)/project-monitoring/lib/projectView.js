/* Display helpers shared by the project monitoring pages (GAD, Academic,
   Research & Extension). Pure, so they can be tested on their own. */

// Relative path (not "@/"), so node --test can load this file directly.
import { APP_TIME_ZONE } from "../../../../../data/lib/appTime.js";

/* Project fields are stored either as plain values or as { value, ... }. */
export const getFieldValue = (field) => {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

export const getArrayValue = (field) => {
  const value = getFieldValue(field);
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return [];
};

/* "Mar 4, 2026" for a stored date, read as a Manila day; null if missing. */
export const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
};

export const ayLabel = (year) => `AY ${year}-${Number(year) + 1}`;

export const getEventStart = (ev) => {
  const value =
    ev?.start_date ||
    (Array.isArray(ev?.start_dates) ? ev.start_dates[0] : null);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getProjectEvents = (project) =>
  (Array.isArray(project?.events) ? project.events : []).filter(Boolean);

export const getActiveEvents = (project) =>
  getProjectEvents(project).filter((ev) => ev?.status !== "cancelled");

/* Linked, non-cancelled events, earliest first. */
export const getSortedEvents = (project) =>
  [...getActiveEvents(project)].sort(
    (a, b) =>
      (getEventStart(a)?.getTime() || 0) - (getEventStart(b)?.getTime() || 0),
  );

/* Uploaded files are served through the authenticated proxy. */
export const getEvidenceProxyUrl = (file) => {
  const key = file?.key || (file?.url ? file.url.split(".com/")[1] : null);
  if (!key) return null;
  return `/api/files/proxy?key=${encodeURIComponent(key)}`;
};
