/**
 * Shared helpers for deriving a project's "Actual Accomplishment" from the events
 * linked to it. Intentionally free of model/framework imports so the exact same
 * logic runs in React components, API routes and unit tests.
 */

import { sumActualParticipants } from "./performanceTracking.js";

/* Legacy markers written by the old `[ref:<eventId>]` actuals rollup. */
const ACTUAL_REF_PATTERN = /\s*\[ref:[^\]]+\]\s*/g;

/** Removes legacy `[ref:<eventId>]` markers from a stored accomplishment line. */
export const stripActualRefMarkers = (line) =>
  String(line ?? "").replace(ACTUAL_REF_PATTERN, " ").trim();

/** Normalizes a stored `actual_accomplishment` value (string | string[]) into clean lines. */
export const normalizeAccomplishmentLines = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  return list.map(stripActualRefMarkers).filter(Boolean);
};

/** Events linked to a project that still count toward the accomplishment. */
export const getActiveProjectEvents = (project) =>
  (Array.isArray(project?.events) ? project.events : []).filter(
    (event) => event && event.status !== "cancelled",
  );

/** Reads the GemsProfile attached to an attendance entry across populated shapes. */
const readAttendanceProfile = (entry) => {
  const userObj = entry?.user_id || entry;
  if (!userObj || typeof userObj !== "object") return {};
  return userObj?.personal_info_id || userObj?.personal_info || {};
};

/**
 * Aggregates linked-event participation for a project.
 * Reuses `sumActualParticipants` so the participant math matches the rest of the app.
 * `sex`/`sector` always add up to `totalAttended` because attendees whose profile data
 * is missing are counted as `unspecified` instead of being dropped.
 */
export const summarizeProjectEvents = (project) => {
  const events = getActiveProjectEvents(project);
  const { actualTotal, actualFemale, actualMale } = sumActualParticipants({
    events,
  });

  const sex = { female: actualFemale, male: actualMale, unspecified: 0 };
  const sector = { student: 0, employee: 0, unspecified: 0 };

  events.forEach((event) => {
    const attended = Array.isArray(event?.attended_users)
      ? event.attended_users
      : [];

    attended.forEach((entry) => {
      const profile = readAttendanceProfile(entry);

      const sexAtBirth = String(
        profile?.gadData?.sexAtBirth || "",
      ).toLowerCase();
      if (sexAtBirth !== "female" && sexAtBirth !== "male") {
        sex.unspecified += 1;
      }

      const status = String(profile?.personal?.currentStatus || "").toLowerCase();
      if (status === "student") sector.student += 1;
      else if (status === "employee") sector.employee += 1;
      else sector.unspecified += 1;
    });
  });

  return {
    events,
    eventCount: events.length,
    totalAttended: actualTotal,
    femaleCount: actualFemale,
    maleCount: actualMale,
    sex,
    sector,
    titles: events
      .map((event) => event?.title)
      .filter((title) => title && String(title).trim() !== ""),
  };
};

/**
 * Chart-ready participant breakdown for the project's linked events.
 * Zero-value rows are dropped so donut charts stay readable.
 */
export const getParticipantBreakdown = (project) => {
  const { sex, sector, totalAttended, eventCount } =
    summarizeProjectEvents(project);

  const toRows = (groups) =>
    groups
      .map(([name, value]) => ({ name, value }))
      .filter((row) => row.value > 0);

  return {
    totalAttended,
    eventCount,
    sex,
    sector,
    bySex: toRows([
      ["Female", sex.female],
      ["Male", sex.male],
      ["Unspecified", sex.unspecified],
    ]),
    bySector: toRows([
      ["Student", sector.student],
      ["Employee", sector.employee],
      ["Unspecified", sector.unspecified],
    ]),
  };
};

/**
 * Builds the auto-generated accomplishment sentence from linked events.
 * Returns "" when the project has no linked (non-cancelled) events.
 */
export const generateAccomplishmentSummary = (project) => {
  const { eventCount, totalAttended, femaleCount, maleCount, titles } =
    summarizeProjectEvents(project);

  if (eventCount === 0) return "";

  const titlePart = titles.length > 0 ? ` — '${titles.join("', '")}'` : "";

  return `${eventCount} event${eventCount !== 1 ? "s" : ""} conducted${titlePart} with ${totalAttended} participant${totalAttended !== 1 ? "s" : ""} (${femaleCount} Female, ${maleCount} Male)`;
};

/** True when the stored `actual_accomplishment` is a manual override. */
export const usesAccomplishmentOverride = (project) =>
  Boolean(project?.actual_accomplishment_override);

/**
 * True when an editor should keep the stored text as a manual override.
 * Besides the saved flag this also covers legacy hand-written text on projects
 * that have no linked events yet, so saving never silently drops it.
 */
export const shouldUseAccomplishmentOverride = (project, generated) => {
  if (usesAccomplishmentOverride(project)) return true;

  const suggestion =
    generated === undefined ? generateAccomplishmentSummary(project) : generated;

  return !suggestion && normalizeAccomplishmentLines(project?.actual_accomplishment).length > 0;
};

/**
 * Resolves which accomplishment lines should be displayed/printed:
 * stored lines win when the project owner saved a manual override, otherwise the
 * value is derived live from the linked events. Legacy stored text is still shown
 * when a project has no linked events so nothing disappears.
 */
export const resolveAccomplishmentLines = (project) => {
  const stored = normalizeAccomplishmentLines(project?.actual_accomplishment);
  if (usesAccomplishmentOverride(project)) return stored;

  const generated = generateAccomplishmentSummary(project);
  if (generated) return [generated];

  return stored;
};

/** Convenience wrapper returning the resolved lines as a single string. */
export const resolveAccomplishmentText = (project) =>
  resolveAccomplishmentLines(project).join("\n");

/**
 * Mongoose populate config that loads a project's linked events together with the
 * attendance sex data the summary needs. Model names only, so this stays importable
 * from anywhere (routes use it, tests ignore it).
 */
export const PROJECT_EVENTS_POPULATE = {
  path: "events",
  model: "Event",
  populate: {
    path: "attended_users.user_id",
    model: "UserAuth",
    select: "personal_info_id",
    populate: {
      path: "personal_info_id",
      model: "GemsProfile",
      select: "gadData.sexAtBirth personal.currentStatus",
    },
  },
};

/** Adds the derived `generated_accomplishment` string to a project payload. */
export const withGeneratedAccomplishment = (project) => {
  const plain =
    project && typeof project.toObject === "function"
      ? project.toObject()
      : project;
  return {
    ...plain,
    generated_accomplishment: generateAccomplishmentSummary(plain),
  };
};
