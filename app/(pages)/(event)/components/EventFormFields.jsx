"use client";

import { useRef, useState } from "react";
import {
  FaBuilding,
  FaCalendarAlt,
  FaFileAlt,
  FaInfoCircle,
  FaMagic,
  FaMapMarkerAlt,
  FaProjectDiagram,
  FaTag,
  FaUsers,
} from "react-icons/fa";
import EventOfficeDropdown from "./EventOfficeDropdown";
import { EVENT_SOURCES } from "./eventFormOptions";
import { officeOptionList } from "@/data/lib/colleges";
import { appDayRange } from "@/data/lib/appTime";
import {
  activityOptionValue,
  projectPickerLabel,
  resolveProjectActivities,
  splitActivityOption,
  truncateOptionLabel,
} from "@/data/lib/projectActivities";

/* The fields of an event, shared by the create page and the Overview tab's
   edit form. They used to be written twice and had drifted: different
   activity pickers (one still had the comma-joined bug), different source
   switching rules, a time input only one of them saved, and two office
   dropdowns.

   The parent owns the state (`values` + `setValues`, a React state setter) and
   saving. What genuinely differs between the two screens is passed in:
     - `posterField`: create picks a file and uploads on submit; edit uploads
       right away and can remove the saved poster.
     - `activityPrefill`: on create, picking a GAD activity names the event after
       it and adds the creator's unit; an existing event keeps its title.
     - `minDate`: new events cannot be scheduled in the past.
     - `variant`: "sections" (create page cards) or "compact" (inside the
       Event Details card). */

export const EVENT_ACTIVITY_TYPES = [
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500";

const labelClass =
  "block text-sm font-medium text-gray-700 mb-2 gap-2 flex items-center";

const SECTION_COLORS = {
  blue: "bg-secondary-50 text-secondary-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-secondary-50 text-secondary-600",
  cyan: "bg-cyan-50 text-cyan-600",
};

function Section({ variant, icon: Icon, color = "blue", title, subtitle, children }) {
  if (variant === "compact") {
    return (
      <section className="space-y-5" aria-label={title}>
        {children}
      </section>
    );
  }
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl ${SECTION_COLORS[color] || SECTION_COLORS.blue} flex items-center justify-center shrink-0`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Whether the AI description generator has what it needs. */
export function canGenerateEventDescription(values) {
  const base =
    String(values.title || "").trim().length > 0 &&
    values.type_of_activity &&
    values.date;
  if (values.event_source === "project") {
    return Boolean(
      base && values.type_of_activity === "GAD" && values.gad_activity,
    );
  }
  return Boolean(base && values.type_of_activity !== "GAD");
}

export default function EventFormFields({
  values,
  setValues,
  projects = [],
  posterField = null,
  activityPrefill = null,
  minDate,
  variant = "sections",
  idPrefix = "event",
  onError,
}) {
  const [generating, setGenerating] = useState(false);
  /* The unit the GAD activity prefill added last, so switching activity swaps
     it out without touching offices the user picked by hand. */
  const autoUnitRef = useRef(null);

  const id = (name) => `${idPrefix}-${name}`;
  const isProjectBased = values.event_source === "project";
  const set = (field, value) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  /* GAD events are always project-based, and only project-based events are
     GAD — for every role. */
  const activityTypes = isProjectBased
    ? EVENT_ACTIVITY_TYPES.filter((type) => type === "GAD")
    : EVENT_ACTIVITY_TYPES.filter((type) => type !== "GAD");

  const chooseSource = (source) => {
    if (source === "independent") {
      autoUnitRef.current = null;
      setValues((prev) => ({
        ...prev,
        event_source: "independent",
        /* Cleared rather than guessed, so the organizer picks a real type. */
        type_of_activity:
          prev.type_of_activity === "GAD" ? "" : prev.type_of_activity,
        project: "",
        gad_activity: "",
      }));
    } else {
      setValues((prev) => ({
        ...prev,
        event_source: "project",
        type_of_activity: "GAD",
      }));
    }
  };

  const chooseType = (type) => {
    if (isProjectBased && type !== "GAD") return;
    if (!isProjectBased && type === "GAD") return;
    setValues((prev) => ({
      ...prev,
      type_of_activity: type,
      ...(type !== "GAD" ? { project: "", gad_activity: "" } : {}),
    }));
  };

  const chooseActivity = (optionValue) => {
    const { project, gad_activity } = splitActivityOption(optionValue);
    if (!activityPrefill || !gad_activity) {
      setValues((prev) => ({ ...prev, project, gad_activity }));
      return;
    }
    /* Picking an activity names the event after it and scopes the event to
       the creator's unit. Switching activity swaps out the unit this prefill
       added before and keeps every office picked by hand. The previous unit
       is read before updating so the updater stays pure. */
    const unit = activityPrefill.unit || null;
    const previousAutoUnit = autoUnitRef.current;
    autoUnitRef.current = unit;
    setValues((prev) => {
      const kept = (prev.organizing_office_unit || []).filter(
        (office) => office !== previousAutoUnit,
      );
      return {
        ...prev,
        project,
        gad_activity,
        title: gad_activity,
        organizing_office_unit:
          unit && !kept.includes(unit) ? [...kept, unit] : kept,
      };
    });
  };

  const canGenerate = canGenerateEventDescription(values);

  const generateDescription = async () => {
    setGenerating(true);
    onError?.("");
    try {
      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          venue: values.venue,
          /* The Manila day picked in the form, so an edited date is what the
             prompt describes. */
          start_date: appDayRange(values.date)?.start_date,
          type_of_activity: values.type_of_activity,
          gad_activity: values.gad_activity,
        }),
      });
      const data = await response.json().catch(() => null);
      /* A generated description only replaces what the user typed when the
         request actually succeeded. */
      if (!response.ok) {
        onError?.(data?.message || data?.error || "Failed to generate description.");
        return;
      }
      if (!data?.description) {
        onError?.("The AI returned an empty description. Please try again.");
        return;
      }
      set("description", data.description);
    } catch (err) {
      onError?.("Failed to generate description.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={variant === "compact" ? "space-y-8" : "space-y-6"}>
      <Section
        variant={variant}
        icon={FaProjectDiagram}
        color="cyan"
        title="Event Source"
        subtitle="Choose first — this controls the rest of the form"
      >
        <div>
          {variant === "compact" && (
            <p className={labelClass} id={id("source-label")}>
              Event Source <span className="text-red-500">*</span>
            </p>
          )}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="group"
            aria-label="Event source"
          >
            {EVENT_SOURCES.map((source) => {
              const active = values.event_source === source.value;
              return (
                <button
                  type="button"
                  key={source.value}
                  onClick={() => chooseSource(source.value)}
                  aria-pressed={active}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-secondary-500 bg-secondary-50 ring-2 ring-secondary-500/20 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        active ? "border-secondary-600" : "border-gray-300"
                      }`}
                      aria-hidden="true"
                    >
                      {active && (
                        <span className="h-2.5 w-2.5 rounded-full bg-secondary-600" />
                      )}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {source.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {source.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section
        variant={variant}
        icon={FaInfoCircle}
        color="blue"
        title="Event Information"
        subtitle="Basic details about the activity"
      >
        <div>
          <p className={labelClass} id={id("type-label")}>
            <FaTag
              className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5"
              aria-hidden="true"
            />
            Type of Activity <span className="text-red-500">*</span>
          </p>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            role="group"
            aria-labelledby={id("type-label")}
          >
            {activityTypes.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => chooseType(type)}
                aria-pressed={values.type_of_activity === type}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  values.type_of_activity === type
                    ? "border-secondary-500 bg-secondary-50 text-secondary-700 ring-2 ring-secondary-500/20 shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {isProjectBased && (
          <div>
            <label className={labelClass} htmlFor={id("gad-activity")}>
              <FaProjectDiagram
                className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5"
                aria-hidden="true"
              />
              GAD Activity <span className="text-red-500">*</span>
            </label>
            {projects.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No projects with GAD activities found. Please create a GPB
                project first.
              </p>
            ) : (
              <select
                id={id("gad-activity")}
                value={
                  values.project && values.gad_activity
                    ? activityOptionValue(values.project, values.gad_activity)
                    : ""
                }
                onChange={(e) => chooseActivity(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a GAD activity...</option>
                {projects.map((proj) => {
                  const activities = resolveProjectActivities(proj);
                  if (activities.length === 0) return null;
                  return (
                    <optgroup key={proj._id} label={projectPickerLabel(proj)}>
                      {/* A GPB title can run to a full sentence, so the option
                          is shortened while `title` keeps the full text. */}
                      {activities.map((activity, idx) => (
                        <option
                          key={`${proj._id}-${idx}`}
                          value={activityOptionValue(proj._id, activity)}
                          title={activity}
                        >
                          {truncateOptionLabel(activity)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              This activity is required because the event type is GAD.
              {activityPrefill
                ? " Selecting one fills in the event title and your office/unit."
                : ""}
            </p>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor={id("title")}>
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            id={id("title")}
            type="text"
            value={values.title || ""}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
            placeholder="Enter event title"
          />
        </div>

        {posterField}
      </Section>

      <Section
        variant={variant}
        icon={FaCalendarAlt}
        color="amber"
        title="Schedule"
        subtitle="Set the event date"
      >
        {/* Date only: events run the whole (Manila) day. */}
        <div>
          <label className={labelClass} htmlFor={id("date")}>
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            id={id("date")}
            type="date"
            value={values.date || ""}
            min={minDate}
            onChange={(e) => set("date", e.target.value)}
            className={inputClass}
          />
        </div>
      </Section>

      <Section
        variant={variant}
        icon={FaFileAlt}
        color="cyan"
        title="Details"
        subtitle="Describe the event and location"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className={labelClass.replace("mb-2", "")}
              htmlFor={id("description")}
            >
              Description
            </label>
            <button
              type="button"
              onClick={generateDescription}
              disabled={generating || !canGenerate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-secondary-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-black shadow-sm transition-all hover:shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FaMagic className="h-3 w-3" aria-hidden="true" />
              {generating ? "Generating..." : "Generate with AI"}
            </button>
          </div>
          <textarea
            id={id("description")}
            value={values.description || ""}
            onChange={(e) => set("description", e.target.value)}
            className={`${inputClass} resize-y min-h-[100px]`}
            rows={4}
            placeholder="Add a detailed event description..."
          />
          {!canGenerate && (
            <p className="text-xs text-gray-500 mt-1.5">
              Fill in the event title, date and GAD activity (for GAD events)
              to enable AI description generation.
            </p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor={id("venue")}>
            <FaMapMarkerAlt
              className="inline h-4 w-4 mr-1.5 text-gray-400 -mt-0.5"
              aria-hidden="true"
            />
            Venue
          </label>
          <input
            id={id("venue")}
            type="text"
            value={values.venue || ""}
            onChange={(e) => set("venue", e.target.value)}
            className={inputClass}
            placeholder="Where will this be held?"
          />
        </div>
      </Section>

      <Section
        variant={variant}
        icon={FaBuilding}
        color="emerald"
        title="Organizing Offices"
        subtitle="Select the office units involved"
      >
        {/* Saved offices that are not on the canonical list — a freely typed
            one, or a legacy "&" college — are offered too, so they stay
            visible and can be unticked. */}
        <EventOfficeDropdown
          label="Organizing Office/Unit"
          icon={FaBuilding}
          options={officeOptionList(values.organizing_office_unit)}
          selected={values.organizing_office_unit || []}
          onChange={(vals) => set("organizing_office_unit", vals)}
          required
          description="Select at least one primary organizing office."
        />
        <EventOfficeDropdown
          label="Co-Organizing Office/Unit"
          icon={FaUsers}
          options={officeOptionList(values.co_organizing_office_unit)}
          selected={values.co_organizing_office_unit || []}
          onChange={(vals) => set("co_organizing_office_unit", vals)}
          required
          allowCustom
          description="Select supporting offices, or type an office/unit that is not listed."
        />
      </Section>
    </div>
  );
}
