import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "project_comment",
        "project_updated",
        "profile_missing_fields",
        "password_not_changed",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
 
    deliveredAt: {
      type: Date,
      default: null,
    },

    socketSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);


NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

export default models.Notification || model("Notification", NotificationSchema);