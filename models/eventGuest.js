import { Schema, model, models } from "mongoose";
import { guestDedupeKey } from "../data/lib/guestIdentity.js";

/* Walk-in guest attendance captured via the public QR form.
   No login required — short check-in form: full name, sex, gender identity,
   age, contact, participant type (Student/Employee/Stakeholder),
   department/office/organization, program/year/section (students)
   or position/designation (employees & stakeholders).

   Manual validation (strict mode): a QR submission lands as PENDING and only
   counts toward attendance/reports once an organizer approves it. Rejected
   rows are kept for the audit trail and may be resubmitted (the same doc is
   flipped back to pending).

   Row identity is `dedupe_key` (data/lib/guestIdentity.js), not the name:
   rows used to be unique on (event_id, full_name), which stopped the second
   of two people who share a name from checking in at all. */

const EventGuestSchema = new Schema(
  {
    event_id: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      /* No single-field index: every compound index below starts with
         event_id, so it already serves event_id lookups. */
    },
    full_name: { type: String, required: true, trim: true },
    /* "account:<user id>" for manual rows, else the normalised name, contact,
       participant type and department the guest typed. Set on create/save by
       the hook below; routes that update with $set set it themselves. */
    dedupe_key: { type: String, default: null },
    sex: {
      type: String,
      required: true,
      enum: ["Male", "Female"],
    },
    gender_identity: {
      type: String,
      trim: true,
      enum: ["Male", "Female", "LGBTQIA+"],
    },
    age: { type: Number, min: 1, max: 120, default: null },
    contact: { type: String, default: "", trim: true },
    participant_type: {
      type: String,
      required: true,
      enum: ["Student", "Employee", "Stakeholder"],
    },
    department_office_org: { type: String, default: "", trim: true },
    position_designation: { type: String, default: "", trim: true },
    program_year_section: { type: String, default: "", trim: true },
    attended_at: { type: Date, default: Date.now },
    /* qr-scan: public no-login check-in form. manual-encode: an organizer
       recorded a profile holder straight from the Attendance tab, so the row
       lands approved (see /api/events/guests/manual). */
    source: {
      type: String,
      enum: ["qr-scan", "manual-encode"],
      default: "qr-scan",
    },
    /* Set only for manual-encode rows: the account the organizer picked.
       Kept for traceability and to dedupe profile holders per event. */
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    validation_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    validated_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    validated_at: { type: Date, default: null },
    validation_note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

/* Synchronous hook (no `next`), which Mongoose 8 and 9 both accept. */
EventGuestSchema.pre("validate", function setDedupeKey() {
  this.dedupe_key = guestDedupeKey(this);
});

/* One row per check-in per event. Partial so rows written before the field
   existed (until scripts/migrate-guest-dedupe-key.mjs backfills them) do not
   collide on a missing key. */
EventGuestSchema.index(
  { event_id: 1, dedupe_key: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupe_key: { $type: "string" } },
  },
);
EventGuestSchema.index({ event_id: 1, attended_at: -1 });
/* One manual row per account per event. */
EventGuestSchema.index(
  { event_id: 1, user_id: 1 },
  {
    unique: true,
    partialFilterExpression: { user_id: { $type: "objectId" } },
  },
);
/* Organizer review queue: pending first, newest submission first. */
EventGuestSchema.index({ event_id: 1, validation_status: 1, attended_at: -1 });

export default models.EventGuest || model("EventGuest", EventGuestSchema);