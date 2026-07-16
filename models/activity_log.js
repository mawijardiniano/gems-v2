import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    ip_address: String,
    user_agent: String,
    metadata: Object,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
