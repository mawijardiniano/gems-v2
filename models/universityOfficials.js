import mongoose from "mongoose";
import { HEADERS } from "../lib/universityOfficialsConstants.js";
/**
 * One document = one assigned official (temporary assigned-only mode).
 *
 * Offices (header) are saved/fixed; positions (title/position) are manually
 * encoded since they are inconsistent; names may be a UserAuth ref or
 * free text. Only assigned rows are stored/shown — no vacancy tracking.
 */
const universityOfficialSchema = new mongoose.Schema(
  {
    academic_year: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-\d{4}$/, "academic_year must look like 2025-2026"],
    },
    header: {
      type: String,
      enum: HEADERS,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    // Manual position string, e.g. "Secretary of the University and of the Board of Regents".
    position: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
      required: false,
      default: null,
    },
    name_text: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

universityOfficialSchema.pre("validate", function () {
  if (!this.position && this.title) this.position = String(this.title).trim();
  if (this.title) this.title = String(this.title).trim();
  if (this.name_text) this.name_text = String(this.name_text).trim();
  if (!this.name && !this.name_text) {
    this.invalidate("name", "Official requires a user or a typed name");
  }
});

// One person per seat per academic year — mirrors the API's 409 duplicate check.
universityOfficialSchema.index(
  { academic_year: 1, header: 1, title: 1, unit: 1 },
  { unique: true },
);

universityOfficialSchema.index({ academic_year: 1 });

export default mongoose.models.UniversityOfficial ||
  mongoose.model("UniversityOfficial", universityOfficialSchema);
