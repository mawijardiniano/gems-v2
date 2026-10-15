import { Schema, model, models } from "mongoose";

/* Walk-in guest attendance captured via the public QR form.
   No login required — short check-in form: full name, sex, gender identity,
   age, contact, participant type (Student/Employee/Stakeholder),
   department/office/organization, program/year/section (students)
   or position/designation (employees & stakeholders).

   Manual validation (strict mode): a QR submission lands as PENDING and only
   counts toward attendance/reports once an organizer approves it. Rejected
   rows are kept for the audit trail and may be resubmitted (the same doc is
   flipped back to pending so the unique event_id + full_name index holds). */

const EventGuestSchema = new Schema(
  {
    event_id: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    full_name: { type: String, required: true, trim: true },
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
    source: { type: String, default: "qr-scan" },
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

/* Guests check in per event — dedupe on name within the same event. */
EventGuestSchema.index({ event_id: 1, full_name: 1 }, { unique: true });
EventGuestSchema.index({ event_id: 1, attended_at: -1 });
/* Organizer review queue: pending first, newest submission first. */
EventGuestSchema.index({ event_id: 1, validation_status: 1, attended_at: -1 });

export default models.EventGuest || model("EventGuest", EventGuestSchema);