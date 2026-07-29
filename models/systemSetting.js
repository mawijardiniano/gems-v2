import mongoose, { Schema } from "mongoose";

const systemSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

const SystemSetting =
  mongoose.models.SystemSetting ||
  mongoose.model("SystemSetting", systemSettingSchema);

export default SystemSetting;