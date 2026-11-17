import { APP_TIME_ZONE } from "./appTime.js";

/* Request bodies for the AI description/narrative routes go straight into a
   prompt. Without limits a single request could carry megabytes of "title"
   (spending model quota), and a non-array office list made `.join` throw a
   500. Every field is coerced to a bounded string here. */

export const AI_FIELD_LIMITS = {
  title: 300,
  venue: 300,
  type_of_activity: 50,
  gad_activity: 1000,
  office: 200,
  officeCount: 20,
};

const text = (value, max) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim().slice(0, max)
    : "";

const dateText = (value, opts) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  /* Manila, not the server's zone, so the prompt states the real day. */
  return d.toLocaleDateString("en-US", { ...opts, timeZone: APP_TIME_ZONE });
};

/**
 * Normalised, length-limited prompt input.
 * @returns {{ title, venue, type_of_activity, gad_activity, offices: string[],
 *             date_medium, date_long, registered_count: number|null }}
 */
export function cleanAiEventInput(data) {
  const body = data && typeof data === "object" ? data : {};
  const L = AI_FIELD_LIMITS;
  const officesRaw = Array.isArray(body.organizing_office_unit)
    ? body.organizing_office_unit
    : body.organizing_office_unit
      ? [body.organizing_office_unit]
      : [];
  const count = Number(body.registered_count);
  return {
    title: text(body.title, L.title),
    venue: text(body.venue, L.venue),
    type_of_activity: text(body.type_of_activity, L.type_of_activity),
    gad_activity: text(body.gad_activity, L.gad_activity),
    offices: officesRaw
      .map((o) => text(o, L.office))
      .filter(Boolean)
      .slice(0, L.officeCount),
    date_medium: dateText(body.start_date, { dateStyle: "medium" }),
    date_long: dateText(body.start_date, { dateStyle: "long" }),
    registered_count:
      Number.isFinite(count) && count >= 0 ? Math.floor(count) : null,
  };
}
