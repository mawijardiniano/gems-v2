import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLog";

const JWT_SECRET = process.env.JWT_SECRET;

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "No token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "Admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const user = await UserAuth.findById(id);

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const { action } = await req.json();

    if (action === "activate") {
      user.is_active = true;
    } else if (action === "deactivate") {
      user.is_active = false;
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      );
    }

    await user.save();

    await logActivity({
      req,
      action: "STATUS_CHANGE",
      description: `User account ${action === "activate" ? "activated" : "deactivated"}`,
      resource_type: "user",
      resource_id: id,
      severity: "warning",
    });

    return NextResponse.json({
      message: "Status updated",
      is_active: user.is_active,
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}