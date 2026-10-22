import mongoose from "mongoose";

/**
 * One document = one seat in the org chart — the 148 rows previously
 * hard-coded in lib/universityOfficialsConstants.js (CATALOG).
 *
 * NOT the same as UniversityOffice. An office is a *column*
 * ("EXECUTIVE OFFICIALS"); a position is a *seat inside a column*
 * ("University President"). One office owns many positions, joined by the
 * `header` string — a case/space-insensitive name (lib/universityOffices.js
 * officeKey), deliberately not a ref so renaming an office stays a Settings
 * concern and past chart prints keep the header they were rendered with.
 *
 * Two independent is_active flags, on purpose:
 *   UniversityOffice.is_active → retires the whole column
 *   Position.is_active         → retires a single seat
 *
 * Soft-retired, never deleted: terms reference a position forever, so an
 * unused seat must still resolve its tenure history.
 *
 * Seat identity is the pair { header, name }, where `name` is the composed
 * display string from composePosition(title, unit) — e.g. "Head, Legal
 * Services Unit". title/unit are deliberately NOT stored here: they are the
 * catalog's construction detail (lib/universityOfficialsConstants.js) and
 * keeping a second copy in the database is what let the wording drift.
 *
 * `name` alone is not enough to identify a seat: "Head, Student Affairs and
 * Services" exists in three columns (MarSU Torrijos / Santa Cruz / Gasan) and
 * "Head, Physical Resource Services" in two. The header disambiguates them.
 */
const positionSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      required: true,
      trim: true,
    },
    // Composed display string, e.g. "Head, Legal Services Unit".
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Seat order inside its column (UniversityOffice.sort_order is the column).
    sort_order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

positionSchema.pre("validate", function () {
  if (this.header) this.header = String(this.header).trim();
  if (this.name) this.name = String(this.name).trim();
  if (!this.name) this.invalidate("name", "Position requires a name");
});

// Seat identity. Verified 0 duplicates across the 148-seat catalog.
positionSchema.index({ header: 1, name: 1 }, { unique: true });
positionSchema.index({ header: 1, is_active: 1, sort_order: 1 });

export default mongoose.models.Position ||
  mongoose.model("Position", positionSchema);
