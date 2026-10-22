import mongoose from "mongoose";

/**
 * One document = one appointment: a person holding a position over a period.
 *
 * This replaces the per-academic-year UniversityOfficial snapshot. Instead of
 * "Maria held University President in 2025-2026" (a new document every August),
 * a term says "Maria held University President from 2024-08-01 until …", so
 * tenure is expressed once and never cloned.
 *
 * `endDate: null` + `isOpen: true` means still in office — the snapshot model
 * could not express an ongoing appointment at all.
 *
 * A seat's history is the set of terms on that position ordered by startDate,
 * which is what makes the tenure timeline possible.
 */
const officialTermSchema = new mongoose.Schema(
  {
    official: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Official",
      required: true,
    },
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    // null = still held.
    endDate: {
      type: Date,
      default: null,
    },
    // substantive = regular holder; acting/interim = temporary designation
    // (previously smuggled into the name string as "OIC, ..."); concurrent =
    // the same person holding a second seat.
    status: {
      type: String,
      enum: ["substantive", "acting", "interim", "concurrent"],
      default: "substantive",
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

officialTermSchema.pre("validate", function () {
  // isOpen is derived, never trusted from the caller.
  this.isOpen = !this.endDate;
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "endDate cannot precede startDate");
  }
});

// One open substantive holder per seat. Partial so closed terms (history)
// coexist freely, and so multiple open ACTING/interim holders stay allowed.
officialTermSchema.index(
  { position: 1 },
  {
    unique: true,
    partialFilterExpression: { isOpen: true, status: "substantive" },
    name: "one_open_substantive_per_position",
  },
);

// Seat history: as-of-date lookup and ordered timeline.
officialTermSchema.index({ position: 1, startDate: 1, endDate: 1 });
// "What has this person held?" lookup.
officialTermSchema.index({ official: 1, startDate: -1 });
// Open-term listing for vacancy counts.
officialTermSchema.index({ isOpen: 1 });

export default mongoose.models.OfficialTerm ||
  mongoose.model("OfficialTerm", officialTermSchema);
