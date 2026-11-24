import mongoose from "mongoose";
import { OFFICIAL_SEX_VALUES } from "../data/lib/universityOfficialsMerge.js";

/**
 * One document = one person who may hold a seat.
 *
 * Names are manually encoded plain text — no vault, no UserAuth ref. The source
 * data has always been typed strings, and a seat holder is often not a system
 * user at all (e.g. "Dr. Maria Morena V. Santos").
 *
 * `name` is unique so the backfill groups typed strings into a single Official,
 * and concurrent seats for the same person share one document.
 */
const officialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    /* Sex of the person, typed by the editor or pre-filled from the person
       search. Stored on the person, not the seat, so it is set once and shared
       by every seat they hold. "unspecified" is the default so the officials
       recorded before this field existed stay valid and show as "not set". */
    sex: {
      type: String,
      enum: OFFICIAL_SEX_VALUES,
      default: "unspecified",
    },
  },
  { timestamps: true },
);

officialSchema.pre("validate", function () {
  if (this.name) this.name = String(this.name).trim().replace(/\s+/g, " ");
  if (this.email) this.email = String(this.email).trim().toLowerCase();
});

officialSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Official ||
  mongoose.model("Official", officialSchema);
