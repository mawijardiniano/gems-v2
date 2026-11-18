import { appDateInput } from "@/data/lib/appTime";
import { formatLongDay } from "@/data/lib/eventDates";

/** The Manila "YYYY-MM-DD" for a stored date (for <input type="date">). */
export const formatForInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return appDateInput(d);
};

/* The one place the edit form's state is built from an event — on load,
   after a save, and when an edit is cancelled. Building it in three places
   is how a save used to drop `date` and break the next save. */
export const buildEditData = (evt) => {
  const startValue =
    evt.start_date ||
    (Array.isArray(evt.start_dates) ? evt.start_dates[0] : null) ||
    evt.date;
  return {
    event_source: evt.project ? "project" : "independent",
    type_of_activity: evt.type_of_activity,
    project: evt.project?._id || evt.project || "",
    gad_activity: evt.gad_activity || "",
    title: evt.title || "",
    description: evt.description || "",
    date: formatForInput(startValue),
    venue: evt.venue || "",
    status: evt.status || "active",
    organizing_office_unit: evt.organizing_office_unit || [],
    co_organizing_office_unit: evt.co_organizing_office_unit || [],
    event_poster: evt.event_poster || null,
  };
};

const formatDateOnly = (value) => formatLongDay(value);

/* Lines for the Overview's "Date Range" tile. Date-only: the time of day is
   noise here, and a same-day event reads as one date, not "X - X". */
export const formatRangeLines = (start, end, evt) => {
  const startValue =
    (evt && evt.start_date) ||
    start ||
    (evt && Array.isArray(evt.start_dates) ? evt.start_dates[0] : null);
  const endValue =
    (evt && evt.end_date) ||
    end ||
    (evt && Array.isArray(evt.end_dates)
      ? evt.end_dates[evt.end_dates.length - 1]
      : null);

  if (!startValue) return ["No date"];
  const startStr = formatDateOnly(startValue);
  if (!endValue) return [startStr];
  const endStr = formatDateOnly(endValue);
  return startStr === endStr ? [startStr] : [`${startStr} - ${endStr}`];
};
