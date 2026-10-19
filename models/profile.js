import mongoose from "mongoose";
import { Schema } from "mongoose";
import affiliationSchema from "./affiliation.js";

const gemsProfileSchema = new Schema(
  {
    /* ------------------------------------------------------------------
       Identity separation (Phase 1 of the PII split).
       ------------------------------------------------------------------
       `gemsPublicId` is the only identifier meant to reach a screen: a short
       random token like "GEMS-A3F9C2". `vaultRef` is the opaque link to the
       IdentityVault document holding the encrypted name/birthday/contact
       details. Neither can be derived from the other, so a leaked GEMS
       document reveals identifiers only — never a complete identity.

       The legacy `personal` / `gadData` / `contact` blocks used to live here.
       They were removed once the Vault was verified: every profile round-trips
       through the vault, and scripts/verify-no-pii.mjs reports zero profiles
       holding plaintext. `affiliation` stays because it is GEMS-owned
       organisational data, not identity data. */
    gemsPublicId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    vaultRef: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    migrationStatus: {
      type: String,
      enum: ["legacy", "dual", "vaulted"],
      /* New profiles are vaulted from the moment they are created. The default
         was "legacy" while the plaintext blocks still existed and a row had to
         be migrated; now that they are gone, a row that is not vaulted has no
         PII anywhere and "vaulted" is the only honest default. */
      default: "vaulted",
      index: true,
    },
    /* HMAC digests of the name parts (lib/identityVault.blindIndex). They let
       "search by name" stay indexable while the name itself is encrypted —
       the digest is stable for the same name but useless without the key. */
    profileSearchIndex: {
      type: [String],
      default: [],
      index: true,
    },

    affiliation: affiliationSchema,

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    last_viewed_at: {
      type: Date,
      default: null,
    },
    data_version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

/* The `fullName` virtual used to join the plaintext name here. It is gone with
   the `personal` block: a name now arrives decrypted from the vault, and
   lib/profileBroker.js composes it (`maskProfilePii` / `revealProfilePii`)
   rather than the schema deriving it from columns that no longer exist. */

gemsProfileSchema.index({ "affiliation.person_type": 1 });
gemsProfileSchema.index({ "affiliation.academic_information.college": 1 });
gemsProfileSchema.index({ "affiliation.academic_information.year_level": 1 });
gemsProfileSchema.index({ "affiliation.academic_information.student_id": 1 });
gemsProfileSchema.index({ "affiliation.employment_information.office": 1 });
gemsProfileSchema.index({ "affiliation.employment_information.employee_id": 1 });
gemsProfileSchema.index({
  "affiliation.employment_information.employment_status": 1,
});
gemsProfileSchema.index({
  "affiliation.employment_information.employment_appointment_status": 1,
});

gemsProfileSchema.set("toJSON", { virtuals: true });
gemsProfileSchema.set("toObject", { virtuals: true });

/**
 * Keeps the student/employee discriminator consistent across both of its
 * paths, in both directions.
 *
 * The field used to live as `personal.currentStatus` and now lives as
 * `affiliation.person_type`, because the PII strip deletes the `personal`
 * block and the status is a GEMS-owned identifier rather than identity data.
 * The two coexist during the transition: the registration and profile-edit
 * forms still post `personal.currentStatus`, while every query and report
 * reads `affiliation.person_type`.
 *
 * Rather than trust ~30 call sites to set both, this normalizes them at the
 * schema boundary so the invariant holds for every writer — including the
 * generic `profile.set(body)` in `app/api/profile/[id]/route.js`, which
 * passes whichever of the two the form happened to send.
 *
 * Whichever path a writer supplies wins; if both are supplied and disagree
 * the affiliation field is authoritative, because it is the one that
 * survives the strip. Runs on `validate`, so it also applies to the
 * `required: true` check on `person_type`: a payload carrying only the legacy
 * path is promoted before that check runs, not rejected by it.
 */
gemsProfileSchema.pre("validate", function syncPersonType() {
  const fromAffiliation = this.affiliation?.person_type;
  const fromLegacy = this.personal?.currentStatus;

  const resolved = fromAffiliation || fromLegacy;
  if (!resolved) return;

  if (this.affiliation && this.affiliation.person_type !== resolved) {
    this.affiliation.person_type = resolved;
  }
  if (this.personal && this.personal.currentStatus !== resolved) {
    this.personal.currentStatus = resolved;
  }
});

const GemsProfile =
  mongoose.models.GemsProfile ||
  mongoose.model("GemsProfile", gemsProfileSchema);

export default GemsProfile;