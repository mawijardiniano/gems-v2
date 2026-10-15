import mongoose from "mongoose";

/**
 * One document = one office / group shown as a column in the org chart
 * (the `header` every UniversityOfficial row is filed under).
 *
 * Offices used to be hard-coded in lib/universityOfficialsConstants.js, so
 * adding or retiring one needed a code deploy. They live in the database now:
 * the University Officials page can add a new office while assigning an
 * official and deactivate one it no longer needs.
 *
 * Deactivation is soft (`is_active: false`) — past academic years keep
 * referencing the office, so the row can never be deleted outright without
 * orphaning history.
 */
const universityOfficeSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

universityOfficeSchema.pre("validate", function () {
  if (this.header) this.header = String(this.header).trim();
});

universityOfficeSchema.index({ is_active: 1, sort_order: 1 });

export default mongoose.models.UniversityOffice ||
  mongoose.model("UniversityOffice", universityOfficeSchema);
