import mongoose from "mongoose";

/**
 * One document = one academic year, with the real date range it covers.
 *
 * The "YYYY-YYYY" label stays user-facing (reports, dropdowns and GFPS
 * snapshots all speak it), but the dates are the source of truth for term
 * overlap. PH convention is Aug 1 → Jul 31 (lib/academicYear.js), which lets a
 * reader ask "which terms were live during AY 2025-2026?" without any per-year
 * cloning.
 */
const academicYearSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-\d{4}$/, "label must look like 2025-2026"],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

academicYearSchema.index({ label: 1 }, { unique: true });

/** Builds the Aug 1 → Jul 31 range for a "YYYY-YYYY" label. Null when invalid. */
export function academicYearRange(label) {
  const match = String(label || "").trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const start = Number(match[1]);
  if (Number(match[2]) !== start + 1) return null;
  return {
    startDate: new Date(Date.UTC(start, 7, 1)), // Aug 1
    endDate: new Date(Date.UTC(start + 1, 6, 31)), // Jul 31
  };
}

export default mongoose.models.AcademicYear ||
  mongoose.model("AcademicYear", academicYearSchema);
