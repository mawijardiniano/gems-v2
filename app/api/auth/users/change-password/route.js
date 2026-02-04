// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";
// import { connectDB } from "@/lib/db";
// import UserAuth from "@/models/user";

// const JWT_SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     await connectDB();

//     const token = req.cookies.get("auth_token")?.value;
//     if (!token) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = jwt.verify(token, JWT_SECRET);

//     const user = await UserAuth.findById(decoded.id);
//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const { currentPassword, newPassword } = await req.json();

//     const isValid = await user.matchPassword(currentPassword);
//     if (!isValid) {
//       return NextResponse.json(
//         { error: "Current password incorrect" },
//         { status: 400 },
//       );
//     }

//     user.password = newPassword;
//     await user.save();

//     return NextResponse.json({ success: true });
//   } catch (err) {
//     return NextResponse.json(
//       { error: "Invalid or expired token" },
//       { status: 401 },
//     );
//   }
// }
