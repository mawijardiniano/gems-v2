
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";

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

    await logActivity({
      req,
      action: "REGISTER",
      description: `Admin account created: ${username}`,
      resource_type: "user",
      resource_id: admin._id,
      severity: "info",
    });

    const { password: _, ...adminData } = admin.toObject();

    return NextResponse.json({ success: true, admin: adminData }, { status: 201 });
  } catch (err) {
    console.error("Create admin error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

