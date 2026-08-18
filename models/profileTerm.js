import mongoose, { Schema } from "mongoose";
import affiliationSchema from "./affiliation.js";

const profileTermSchema = new Schema(
  {
    profile_id: {
      type: Schema.Types.ObjectId,
      ref: "GemsProfile",
      required: true,
      index: true,
    },

    school_year: {
      type: String,
      required: true,
    },

    semester: {
      type: String,
      enum: ["1st", "2nd", "Summer"],
      required: true,
    },
    affiliation: affiliationSchema,

    import_meta: {
      source_file: { type: String },
      imported_at: { type: Date, default: Date.now },
      uploaded_by: {
        type: Schema.Types.ObjectId,
        ref: "UserAuth",
      },
      uploaded_by_username: {
        type: String,
      },
    },
  },
  { timestamps: true },
);

profileTermSchema.index(
  { profile_id: 1, school_year: 1, semester: 1 },
  { unique: true },
);

profileTermSchema.index({ school_year: 1, semester: 1 });

const ProfileTerm =
  mongoose.models.ProfileTerm ||
  mongoose.model("ProfileTerm", profileTermSchema);

export default ProfileTerm;
