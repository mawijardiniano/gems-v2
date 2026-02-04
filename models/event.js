import { Schema, model, models } from "mongoose";
import { type } from "os";

const InvitationRulesSchema = new Schema(
  {
    person_type: { type: [String], default: [] },
    employment_status: { type: [String], default: [] },
    sex: { type: String, enum: ["Male", "Female", ""], default: "" },
    pwd: { type: Boolean, default: null },
    solo_parent: { type: Boolean, default: null },
    college_scope: { type: String, enum: ["ALL", "SELECTED"], default: "ALL" },
    colleges: { type: [String], default: [] },
  },
  { _id: false },
);

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true },
    venue: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
    invitation_rules: { type: InvitationRulesSchema, default: () => ({}) },
    registered_users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["active", "cancelled", "completed"], //mark as complete
      default: "active",
    },
  },
  { timestamps: true },
);

export default models.Event || model("Event", EventSchema);
