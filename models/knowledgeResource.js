import mongoose, { Schema } from "mongoose";
import { KNOWLEDGE_CATEGORIES } from "@/lib/knowledgeResources";

const knowledgeFileSchema = new Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
  },
  { _id: false }
);

const knowledgeResourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: KNOWLEDGE_CATEGORIES,
      required: true,
    },
    file: {
      type: knowledgeFileSchema,
      required: true,
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },
    uploaded_by_name: {
      type: String,
      default: "",
    },
    uploaded_by_role: {
      type: String,
      default: "",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

knowledgeResourceSchema.index({ category: 1 });
knowledgeResourceSchema.index({ is_active: 1, createdAt: -1 });

export default mongoose.models.KnowledgeResource ||
  mongoose.model("KnowledgeResource", knowledgeResourceSchema);
