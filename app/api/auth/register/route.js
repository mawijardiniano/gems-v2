// import { connectDB } from "@/lib/db";
// import User from "@/models/user";

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     const { name, email, password, role } = body;

//     if (!name || !email || !password) {
//       return new Response(
//         JSON.stringify({ status: "error", message: "Missing required fields" }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     if (password.length < 8) {
//       return new Response(
//         JSON.stringify({
//           status: "error",
//           message: "Password must be at least 8 characters long",
//         }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     await connectDB();

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return new Response(
//         JSON.stringify({
//           status: "error",
//           message: "Email already registered",
//         }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     const newUser = await User.create({
//       name,
//       email,
//       password,
//       role: role || "User",
//     });

//     const { password: _, ...userWithoutPassword } = newUser.toObject();

//     return new Response(
//       JSON.stringify({ status: "success", data: userWithoutPassword }),
//       { status: 201, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("POST /api/auth/register error:", error);
//     return new Response(
//       JSON.stringify({ status: "error", message: "Internal Server Error" }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";

export async function POST(req) {
  try {
    await connectDB();

    const { username, password, role } = await req.json();
    const existingAdmin = await UserAuth.findOne({ username });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin with this username already exists" },
        { status: 400 }
      );
    }

    const admin = await UserAuth.create({
      username,
      password,
      role, 
    });

    const { password: _, ...adminData } = admin.toObject();

    return NextResponse.json({ success: true, admin: adminData }, { status: 201 });
  } catch (err) {
    console.error("Create admin error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

