import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLog";
import { invalidateUserCache } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET;

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "No token" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "Admin") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const user = await UserAuth.findById(id).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const tempPassword = "gems1234";

    user.password = tempPassword;

    await user.save();

    invalidateUserCache(id);

    await logActivity({
      req,
      action: "RESET_PASSWORD",
      description: "User password was reset to default",
      resource_type: "user",
      resource_id: id,
      severity: "warning",
    });

    return NextResponse.json({
      message: "Password reset successful",
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}