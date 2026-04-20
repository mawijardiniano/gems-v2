// import { NextResponse } from "next/server";
// import { connectDB } from "@/lib/db";
// import UserAuth from "@/models/user";

// export async function POST() {
//   await connectDB();

//   await UserAuth.updateMany(
//     { is_active: { $exists: false } },
//     { $set: { is_active: true } }
//   );

//   return NextResponse.json({
//     message: "is_active added to all users",
//   });
// }