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
