import mongoose from "mongoose";

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
