// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import { connectDB } from "@/lib/db";
// import GFPSArchive from "@/models/gfpsArchive";

// export async function GET(req, { params }) {
//   try {
//     await connectDB();

//     const { id } = await params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { error: "Invalid archive ID" },
//         { status: 400 }
//       );
//     }

//     const archive = await GFPSArchive.findById(id);

//     if (!archive) {
//       return NextResponse.json(
//         { error: "Archive not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(archive);
//   } catch (err) {
//     return NextResponse.json(
//       { error: err.message },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(req, { params }) {
//   try {
//     await connectDB();

//     const { id } = await params;

//     // ✅ Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { error: "Invalid archive ID" },
//         { status: 400 }
//       );
//     }

//     const deleted = await GFPSArchive.findByIdAndDelete(id);

//     if (!deleted) {
//       return NextResponse.json(
//         { error: "Archive not found or already deleted" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       message: "Archive deleted successfully",
//       id: deleted._id,
//     });
//   } catch (err) {
//     return NextResponse.json(
//       { error: err.message },
//       { status: 500 }
//     );
//   }
// }