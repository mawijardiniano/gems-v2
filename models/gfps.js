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
});

const ExecutiveMemberSchema = new mongoose.Schema({
  official: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UniversityOfficial",
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


// import mongoose from "mongoose";

// const MemberSchema = new mongoose.Schema(
//   {
//     official: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "UniversityOfficial",
//       required: true,
//     },

//     position: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     role: {
//       type: String,
//       enum: ["chair", "member", "head", "secretary", "director"],
//       default: "member",
//     },

//     order: {
//       type: Number,
//       default: 0,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//     },

//     appointedAt: {
//       type: Date,
//       default: Date.now,
//     },

//     endedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   { _id: false }
// );

// const AuditLogSchema = new mongoose.Schema(
//   {
//     action: {
//       type: String,
//       enum: ["CREATE", "UPDATE", "DELETE", "REORDER"],
//       required: true,
//     },

//     section: {
//       type: String,
//       required: true,
//     },

//     performedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },

//     targetMember: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "UniversityOfficial",
//     },

//     before: mongoose.Schema.Types.Mixed,
//     after: mongoose.Schema.Types.Mixed,

//     timestamp: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { _id: false }
// );

// const SectionSchema = new mongoose.Schema(
//   {
//     members: [MemberSchema],

//     updatedAt: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { _id: false }
// );

// const GFPSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       default: "GFPS Organization",
//     },

//     year: {
//       type: Number,
//     },

//     sections: {
//       PRESIDENT: SectionSchema,
//       VICE_PRESIDENTS: SectionSchema,
//       CAMPUS_DIRECTORS: SectionSchema,
//       COLLEGE_DEANS: SectionSchema,
//       ASSOCIATE_DEANS: SectionSchema,
//       OFFICE_OF_THE_PRESIDENT: SectionSchema,
//       VP_ACADEMIC_AFFAIRS_OFFICE: SectionSchema,
//       VP_ADMIN_FINANCE_OFFICE: SectionSchema,
//       VP_STUDENT_AFFAIRS_OFFICE: SectionSchema,
//       VP_RESEARCH_EXTENSION_OFFICE: SectionSchema,
//     },

//     auditLogs: [AuditLogSchema],

//     version: {
//       type: Number,
//       default: 1,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { timestamps: true }
// );

// GFPSchema.index({ "sections.PRESIDENT.members.official": 1 });
// GFPSchema.index({ isActive: 1 });

// export default mongoose.models.GFPS ||
//   mongoose.model("GFPS", GFPSchema);