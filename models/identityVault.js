import mongoose, { Schema } from "mongoose";

/*
 * Identity Vault — the ONLY place that holds personally identifiable
 * information (PII) for a GEMS profile.
 *
 * Why a separate model / database:
 *   `GemsProfile` keeps identifiers only (gemsPublicId, student_id, status,
 *   coarse affiliation for filtering). Name, birthday, sex, PWD details,
 *   email, phone and addresses live here instead. A dump of the operational
 *   GEMS database therefore yields IDs — never a complete identity.
 *
 * How the two stay linked:
 *   `GemsProfile.vaultRef` <-> `IdentityVault.vaultRef`, a random opaque
 *   token (crypto.randomUUID). It is intentionally NOT an ObjectId so the
 *   reference cannot be guessed or enumerated from a leaked GEMS document.
 *
 * Every PII value is stored encrypted with AES-256-GCM (see
 * lib/identityVault.js). The key lives in the server environment
 * (PII_ENCRYPTION_KEY) and is never persisted in either database.
 */

const encryptedFieldSchema = new Schema(
  {
    v: { type: String, default: "" },
    iv: { type: String, default: "" },
    tag: { type: String, default: "" },
    c: { type: String, default: "" },
  },
  { _id: false },
);

const identityVaultSchema = new Schema(
  {
    /* Opaque link back to the GEMS record. Never shown to a client. */
    vaultRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /* Which GEMS collection/document this vault entry belongs to, so a
       legacy Vault (profiles only) can later hold guests or staging PII
       without ambiguity. */
    owner_type: {
      type: String,
      enum: ["profile", "event_guest", "staging_record"],
      default: "profile",
      index: true,
    },

    /* Encrypted PII payload. One value per field for granular reads, plus a
       single `payload` blob so new fields never need a schema migration. */
    fields: {
      type: Map,
      of: encryptedFieldSchema,
      default: {},
    },
    payload: { type: encryptedFieldSchema, default: null },

    /* Bumped when PII_ENCRYPTION_KEY rotates; decrypt uses this to pick the
       right key so old rows stay readable. */
    key_version: { type: Number, default: 1 },

    /* Migration bookkeeping only — no PII. */
    migrated_from: {
      type: Schema.Types.ObjectId,
      ref: "GemsProfile",
      default: null,
    },
    source: {
      type: String,
      enum: ["live", "backfill"],
      default: "live",
    },
  },
  { timestamps: true },
);

identityVaultSchema.index({ owner_type: 1, createdAt: -1 });

/* PII must never travel to a client implicitly: strip the encrypted blobs
   from every JSON / object conversion unless a caller explicitly asks for
   them (the broker reads `.lean()` and decrypts server-side).
   NOTE: must be set through `options` — `schema.set("toJSON", ...)` is
   silently ignored by this mongoose version. */
const stripEncrypted = (_doc, ret) => {
  delete ret.fields;
  delete ret.payload;
  return ret;
};

identityVaultSchema.options.toJSON = { transform: stripEncrypted };
identityVaultSchema.options.toObject = { transform: stripEncrypted };

const IdentityVault =
  mongoose.models.IdentityVault ||
  mongoose.model("IdentityVault", identityVaultSchema);

export default IdentityVault;
