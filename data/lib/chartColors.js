/* Chart colors — the single source for data-viz color in JS.

   Recharts (and SVG presentation attributes) need concrete color values, so
   these mirror the tokens in app/globals.css (@theme --color-series-* and the
   gray ramp). Change a value here and in globals.css together.

   Use the semantic names: SERIES.female / SERIES.male always mean those data
   series, never decoration. For unordered categories (colleges, campuses,
   offices…) take colors from CATEGORICAL in order; it starts with the four
   strongest-contrast hues so small charts stay legible. */

export const SERIES = {
  female: "#f0468f", // --color-series-female (GEMS pink)
  male: "#7c5ce0", // --color-series-male
  mint: "#14b8a6", // --color-series-mint
  blue: "#3b82f6", // --color-series-blue
  amber: "#f59e0b", // --color-series-amber
  slate: "#94a3b8", // --color-series-slate (other / unspecified / no data)
};

/* Sex/gender keys as they appear in API data. Anything else falls back to
   SERIES.slate via colorForSex(). */
const SEX_COLORS = {
  female: SERIES.female,
  male: SERIES.male,
};

export function colorForSex(key) {
  return SEX_COLORS[String(key ?? "").trim().toLowerCase()] ?? SERIES.slate;
}

export const CATEGORICAL = [
  SERIES.male,
  SERIES.female,
  SERIES.mint,
  SERIES.amber,
  SERIES.blue,
  "#a851b8", // --color-secondary-500 (brand purple)
  "#0ea5e9", // sky-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  SERIES.slate,
];

export function categoricalColor(index) {
  return CATEGORICAL[index % CATEGORICAL.length];
}

/* Status meaning shared with the rest of the UI (badges, alerts). */
export const STATUS = {
  positive: "#047857", // --color-success — increase, complete, on track
  negative: "#b91c1c", // --color-danger — decrease, overdue, failed
  warning: "#92400e", // --color-warning
  neutral: "#6b7280", // gray-500
};

/* Chart chrome: gridlines, axes, tooltips. Axis text uses gray-500 so tick
   labels meet 4.5:1 on white. */
export const CHART = {
  grid: "#f3f4f6", // gray-100
  axisLine: "#e5e7eb", // gray-200
  axisText: "#6b7280", // gray-500
  track: "#f3f4f6", // gray-100 — empty part of bars/rings
  tooltipBorder: "#e5e7eb", // gray-200
  tooltipBg: "#ffffff",
};
