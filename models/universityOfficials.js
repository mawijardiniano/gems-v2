import mongoose from "mongoose";
/**
 * One document = one assigned official for one academic year (temporary
 * assigned-only mode). This is the *snapshot* shape that
 * scripts/migrate-officials-to-terms.mjs reads from the on-disk backup and
 * converts into Position + OfficialTerm; the collection itself is retired
 * after migration.
 *
 * Offices (header) are stored in the `universityoffices` collection so they
 * can be added / deactivated from the UI; the API validates `header` against
 * an active office instead of a compile-time enum.
 *
 * The seat is addressed by { header, name } — the same pair Position is keyed
 * on. title/unit/position are no longer stored: `name` is the composed
 * display string, so there is one representation instead of three.
 *
 * The person is `official` (an Official ref) with `official_text` as the
 * typed fallback. The fields were previously called name/name_text, which
 * collided with the seat's own `name`; the rename frees `name` for the seat.
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
      required: true,
      trim: true,
    },
    // Composed display string, e.g. "Secretary of the University and of the Board of Regents".
    name: {
      type: String,
      required: true,
      trim: true,
    },
    official: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Official",
      required: false,
      default: null,
    },
    official_text: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

universityOfficialSchema.pre("validate", function () {
  if (this.header) this.header = String(this.header).trim();
  if (this.name) this.name = String(this.name).trim();
  if (this.official_text) this.official_text = String(this.official_text).trim();
  if (!this.official && !this.official_text) {
    this.invalidate("official", "Official requires an official or a typed name");
  }
});

// One person per seat per academic year — mirrors the API's 409 duplicate check.
universityOfficialSchema.index(
  { academic_year: 1, header: 1, name: 1 },
  { unique: true },
);

universityOfficialSchema.index({ academic_year: 1 });

export default mongoose.models.UniversityOfficial ||
  mongoose.model("UniversityOfficial", universityOfficialSchema);
