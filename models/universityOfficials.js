import mongoose from "mongoose";
import {
  ALL_TITLES,
  HEADERS,
  composePosition,
} from "../lib/universityOfficialsConstants";

/**
 * One document = one filled seat of the MarSU org chart.
 *
 * The catalog of every valid seat lives in code
 * (lib/universityOfficialsConstants.js); this collection only stores who
 * currently fills a seat. A seat is identified by header + title + unit,
 * which is unique across the whole chart.
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
      enum: ALL_TITLES,
      required: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    // Derived display string, e.g. "Head, Legal Services Unit".
    position: {
      type: String,
    },
    name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },
  },
  { timestamps: true },
);

universityOfficialSchema.pre("validate", function () {
  this.position = composePosition(this.title, this.unit);
});

// One person per seat per academic year — mirrors the API's 409 duplicate check.
universityOfficialSchema.index(
  { academic_year: 1, header: 1, title: 1, unit: 1 },
  { unique: true },
);

universityOfficialSchema.index({ academic_year: 1 });

export default mongoose.models.UniversityOfficial ||
  mongoose.model("UniversityOfficial", universityOfficialSchema);
