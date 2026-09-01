import mongoose from "mongoose";
import "./universityOfficials";
import "./user";

const OFFICIAL_GROUPS = [
  "PRESIDENT",
  "VICE_PRESIDENTS",
  "CAMPUS_DIRECTORS",
  "COLLEGE_DEANS",
  "ASSOCIATE_DEANS",
  "OFFICE_OF_THE_PRESIDENT",
  "VP_ACADEMIC_AFFAIRS_OFFICE",
  "VP_ADMIN_FINANCE_OFFICE",
  "VP_STUDENT_AFFAIRS_OFFICE",
  "VP_RESEARCH_EXTENSION_OFFICE",
];
 
const MemberSchema = new mongoose.Schema({
  official: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UniversityOfficial",
    required: false,
  },
  // Id of the specific position entry (subdocument) inside the
  // UniversityOfficial document. Needed to distinguish officials who hold
  // multiple positions (e.g., a person who is both a VP and a Dean).
  official_ref: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  // Which official group the position entry belongs to
  // (e.g., "vicePresidents", "collegeDeans").
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
  // Same as MemberSchema.official_ref — see comment there.
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
