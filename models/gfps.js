import mongoose from "mongoose";
import "./universityOfficials";
import "./user";

const MemberSchema = new mongoose.Schema({
  official: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UniversityOfficial",
    required: false,
  },
  // Legacy field from the old aggregate officials document. New records leave
  // it empty — a seat is already a single UniversityOfficial document.
  official_ref: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  // Which chart header the seat belongs to
  // (e.g., "OFFICE OF THE PRESIDENT", "MARSU TORRIJOS BRANCH").
  official_group: {
    type: String,
    required: false,
  },
});

const ExecutiveMemberSchema = new mongoose.Schema({
  official: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UniversityOfficial",
    required: false,
  },
  // Same as MemberSchema.official_ref — legacy, unused for new records.
  official_ref: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  official_group: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ["chair", "member"],
    required: true,
  },
});

const ExecutiveCommitteeSchema = new mongoose.Schema({
  members: [ExecutiveMemberSchema],
});

const TechnicalWorkingGroupSchema = new mongoose.Schema({
  members: [MemberSchema],
});

const GFPSchema = new mongoose.Schema({
  chairOrHeadOfAgency: MemberSchema,
  executiveCommittee: ExecutiveCommitteeSchema,
  technicalWorkingGroup: TechnicalWorkingGroupSchema,
  secretariat: [MemberSchema],
});

export default mongoose.models.GFPS || mongoose.model("GFPS", GFPSchema);
