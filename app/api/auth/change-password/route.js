import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";
import { rateLimiters } from "@/lib/rateLimit";
import { invalidateUserCache } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const rateLimitResult = await rateLimiters.passwordChange(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers }
      );
    }

    await connectDB();

    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body || {};
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const user = await UserAuth.findById(userId).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      await logActivity({
        user_id: user._id,
        action: "CHANGE_PASSWORD",
        description: "Failed password change - current password incorrect",
        req,
        metadata: { module: "auth" },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    user.password = newPassword;
    await user.save();

    invalidateUserCache(userId);

    await logActivity({
      user_id: user._id,
      action: "CHANGE_PASSWORD",
      description: "User changed their password successfully",
      req,
      metadata: { module: "auth" },
      resource_type: "user",
      resource_id: user._id,
      severity: "info",
    });

    return NextResponse.json(
      { success: true, message: "Password updated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}