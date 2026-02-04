import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";
import { logActivity } from "@/lib/activityLog";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();
    const { username, password } = await req.json();

    const user = await UserAuth.findOne({ username });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 401 });

    const isValid = await user.matchPassword(password);
    if (!isValid)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    await logActivity({
      user_id: user._id,
      action: "LOGIN",
      description: "User logged in",
      req,
    });

    const token = jwt.sign({ id: user._id, role: user.role, }, JWT_SECRET, { expiresIn: "1d" });

    const profile = await GemsProfile.findById(user.personal_info_id).lean();

    const { password: _, ...userWithoutPassword } = user.toObject();

    const res = NextResponse.json({
      success: true,
      user: userWithoutPassword,
      profile: profile || null,
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
