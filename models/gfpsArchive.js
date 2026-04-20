// import mongoose from "mongoose";
// import "./gfps"

// const GFPSArchiveSchema = new mongoose.Schema(
//   {
//     gfpsId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "GFPS",
//       required: true,
//       index: true,
//     },
//     snapshot: {
//       type: mongoose.Schema.Types.Mixed,
//       required: true,
//     },
//     archivedAt: {
//       type: Date,
//       default: Date.now,
//       index: true,
//     },
//   },
//   {
//     timestamps: true, 
//   }
// );

// export default mongoose.models.GFPSArchive ||
//   mongoose.model("GFPSArchive", GFPSArchiveSchema);