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

    const user = await UserAuth.findOne({ username }).select("+password");
    
    if (!user) {

      await logActivity({
        user_id: null,
        action: "LOGIN_FAILED",
        description: `Login failed - invalid credentials for username: ${username}`,
        req,
        metadata: { module: "auth", username },
        resource_type: "user",
        severity: "warning",
      });
      
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil(
        (user.lockUntil - Date.now()) / 1000 / 60,
      );
      
      await logActivity({
        user_id: user._id,
        action: "LOGIN_FAILED",
        description: `Login blocked - account locked for ${lockTimeRemaining} minutes`,
        req,
        metadata: { module: "auth", lockTimeRemaining },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        {
          error: `Account temporarily locked. Try again in ${lockTimeRemaining} minutes.`,
        },
        { status: 429 },
      );
    }

    if (user.is_active === false) {
      await logActivity({
        user_id: user._id,
        action: "LOGIN_FAILED",
        description: "Login blocked - account deactivated",
        req,
        metadata: { module: "auth" },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Account is deactivated. Contact administrator." },
        { status: 403 },
      );
    }

    const isValid = await user.matchPassword(password);
    if (!isValid) {

      await user.incrementLoginAttempts();

      await logActivity({
        user_id: user._id,
        action: "LOGIN_FAILED",
        description: `Login failed - invalid password (attempt ${user.loginAttempts})`,
        req,
        metadata: {
          module: "auth",
          loginAttempts: user.loginAttempts,
        },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    await user.resetLoginAttempts();

    await logActivity({
      user_id: user._id,
      action: "LOGIN",
      description: `User logged in as ${user.role}`,
      req,
      metadata: { module: "auth", role: user.role },
      resource_type: "user",
      resource_id: user._id,
      severity: "info",
    });

 
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        assignedCollege: user.assignedCollege,
        passwordChangedAt: user.passwordChangedAt?.getTime(),
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    const profile = await GemsProfile.findById(user.personal_info_id).lean();

    const userObj = user.toObject();
    const { password: _, ...userWithoutPassword } = userObj;

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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}