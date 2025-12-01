import { connectDB } from "@/lib/db";
import User from "@/models/user";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ status: "error", message: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Email already registered",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }


    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "User",
    });

    const { password: _, ...userWithoutPassword } = newUser.toObject();

    return new Response(
      JSON.stringify({ status: "success", data: userWithoutPassword }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
