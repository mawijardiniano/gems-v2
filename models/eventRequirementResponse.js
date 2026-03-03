const mongoose = require("mongoose");

const EventRequirementResponseSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  responses: [
    {
      field: String,
      value: String,
    },
  ],
  submittedAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.EventRequirementResponse ||
  mongoose.model("EventRequirementResponse", EventRequirementResponseSchema);
