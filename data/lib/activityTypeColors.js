/* One colour family per event type (type_of_activity), used by the event
   list, the calendar and the public check-in page. They had three maps, and
   GAD was emerald on the list but pink elsewhere. Class names are written
   out in full so Tailwind keeps them. */

const PILL = {
  Academic: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Administrative: "bg-secondary-50 text-secondary-700 border-secondary-200",
  GAD: "bg-pink-50 text-pink-700 border-pink-200",
  Extension: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Research: "bg-secondary-50 text-secondary-700 border-secondary-200",
  Students: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Others: "bg-gray-50 text-gray-700 border-gray-200",
};

const BADGE = {
  Academic: { bg: "bg-secondary-100", text: "text-secondary-700", dot: "bg-secondary-500" },
  Administrative: { bg: "bg-secondary-100", text: "text-secondary-700", dot: "bg-secondary-500" },
  GAD: { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  Extension: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Research: { bg: "bg-secondary-100", text: "text-secondary-700", dot: "bg-secondary-500" },
  Students: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  Others: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
};

/** Bordered pill classes ("bg-… text-… border-…") for an event type. */
export const activityPillClasses = (type) => PILL[type] || PILL.Others;

/** { bg, text, dot } classes for a badge with a coloured dot. */
export const activityBadgeColors = (type) => BADGE[type] || BADGE.Others;

export const ACTIVITY_PILL_CLASSES = PILL;
