import mongoose from "mongoose";

/* The audit trail.
 *
 * Read this before changing a field.
 *
 * WHAT THIS COLLECTION IS FOR
 *
 * It answers three questions an auditor, a DPO or an incident responder will
 * ask, in this order: who did it, when, and *what actually changed*. The third
 * question is the one an activity feed cannot answer, which is why `changes`
 * exists here. A description like "GPB updated" is not evidence; a diff of
 * `budget: 500000 -> 800000` is.
 *
 * WHY THE ACTOR IS COPIED, NOT ONLY REFERENCED
 *
 * `user_id` alone decays. A username is edited, a role is downgraded, the
 * account is deleted — and every historical entry silently re-describes the
 * past in terms of the present. `actor` freezes the identity as it was at the
 * moment of the action, which is what non-repudiation (NIST AU-10) needs. The
 * `user_id` reference is kept for joining *now*, not for telling the story
 * *then*.
 *
 * WHY `user_id` IS NOT REQUIRED
 *
 * It used to be. That made the single most investigative event — a login
 * attempt against a username that does not exist — impossible to store: the
 * write failed a validation rule and `writeLog` swallowed the error. Failed
 * attempts against unknown accounts were therefore invisible. An actor of
 * `null` means "unauthenticated or unidentifiable", which is a fact worth
 * recording, not an error worth dropping.
 *
 * WHAT MUST NEVER GO IN HERE
 *
 * No plaintext PII. This collection has weaker protection than IdentityVault
 * (every Admin can read it through /api/activity). `logPiiAccess` stores
 * identifiers and field names only, and diffed PII fields are recorded as
 * `[vaulted]` with `redacted: true`. Never widen that. See NIST AU-3(3).
 */

/** One field-level change. `before`/`after` carry no plaintext PII. */
const ChangeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    /* True when the real value is withheld because it lives in the vault.
       Its presence is the record: "this field changed", not "to this value". */
    redacted: { type: Boolean, default: false },
  },
  { _id: false },
);

/** Identity of the actor as it was when the action happened. */
const ActorSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    username: { type: String, default: null },
    role: { type: String, default: null },
    name: { type: String, default: null },
    /* "session" when a JWT identified the actor, "script"/"system" when a
       background job wrote the entry, null when unauthenticated. */
    auth_method: { type: String, default: null },
  },
  { _id: false },
);

/** How the action turned out — NIST AU-3(e). */
const OutcomeSchema = new mongoose.Schema(
  {
    result: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
    },
    status_code: { type: Number, default: null },
    error_code: { type: String, default: null },
    message: { type: String, default: null },
  },
  { _id: false },
);

const ActivityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    actor: { type: ActorSchema, default: () => ({}) },
    action: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
    },
    resource_type: {
      type: String,
    },
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    /* Where the event happened: "PUT /api/university-officials/:id" and the
       feature area it belongs to. AU-3(c) asks for the location. */
    route: { type: String, default: null },
    module: { type: String, default: null },
    /* What changed. Absent for reads, logins and pure events. */
    changes: { type: [ChangeSchema], default: undefined },
    outcome: { type: OutcomeSchema, default: () => ({}) },
    /* Groups the several documents one request touches, so a reader can see a
       bulk delete as one act rather than N unrelated deletions. */
    request_id: { type: String, default: null },
    session_id: { type: String, default: null },
    ip_address: String,
    user_agent: String,
    metadata: Object,
    /* Hash chain: hash_self = sha256(hash_prev + canonical(this)), so removing
       or editing a record breaks every later link. Null on legacy rows written
       before the chain existed. */
    hash_prev: { type: String, default: null },
    hash_self: { type: String, default: null },
    /* Set by redactActivityLog(). The record survives; its content does not. */
    redacted: { type: Boolean, default: false },
    redacted_at: { type: String, default: null },
    redacted_by: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ user_id: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ resource_type: 1, resource_id: 1, createdAt: -1 });
ActivityLogSchema.index({ "outcome.result": 1, createdAt: -1 });
ActivityLogSchema.index({ request_id: 1 });
ActivityLogSchema.index({ hash_self: 1 });

/* The trail is append-only.
 *
 * This is the technical half of NIST AU-9. The other half — removing the
 * DELETE endpoint and the trash icon from the admin UI — lives in the route and
 * the page, because a schema guard only stops callers that go through Mongoose.
 *
 * Redaction is deliberately permitted: a legally-required removal blanks
 * `description`/`metadata` and keeps the record, the actor and the hashes, so
 * the *existence* of the act survives even when its detail cannot. A hard
 * delete would be exactly the tampering AU-9 forbids. */
const READ_ONLY_ERROR =
  "ActivityLog is append-only: audit records may not be modified or deleted. " +
  "Use redactActivityLog() for legally-required redaction.";

/* The guard must *throw*.
 *
 * A pre-hook that returns an Error is silently ignored by mongoose — only a
 * thrown error aborts the operation. Returning it here (as this code first did)
 * produced a guard that never fired and let every delete and update through,
 * which is precisely the tampering it exists to prevent. Verified: a returned
 * Error proceeds to the driver; a thrown one rejects with its code. */
function blockWrite() {
  const err = new Error(READ_ONLY_ERROR);
  err.code = "AUDIT_LOG_IMMUTABLE";
  throw err;
}

ActivityLogSchema.pre("updateOne", blockWrite);
ActivityLogSchema.pre("updateMany", blockWrite);
ActivityLogSchema.pre("replaceOne", blockWrite);
ActivityLogSchema.pre("findOneAndUpdate", blockWrite);
ActivityLogSchema.pre("findOneAndReplace", blockWrite);
ActivityLogSchema.pre("deleteOne", blockWrite);
ActivityLogSchema.pre("deleteMany", blockWrite);
ActivityLogSchema.pre("findOneAndDelete", blockWrite);

/* `save()` on a loaded document issues its own `updateOne` through the model,
 * which the hooks above do not intercept. Without this, the guard would stop
 * `Model.updateOne(...)` while allowing the equivalent `doc.description = "...";
 * doc.save()` — the more natural way to tamper from application code. Only
 * existing documents are stopped; a new document inserts, which must stay
 * allowed or nothing could ever be logged. */
ActivityLogSchema.pre("save", function () {
  if (this.isNew) return;
  const err = new Error(READ_ONLY_ERROR);
  err.code = "AUDIT_LOG_IMMUTABLE";
  throw err;
});

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
