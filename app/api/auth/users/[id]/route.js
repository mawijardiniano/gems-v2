import User from "@/models/user";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { SCOPED_ROLES } from "@/lib/colleges";
import { logActivity } from "@/lib/activityLog";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req, { params }) {
  const { id } = await params;
  console.log("id:", id);

  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing user id" },
      { status: 400 },
    );
  }

  await connectDB();

  const user = await User.findById(id, { password: 0 }).lean();

  if (!user) {
    return NextResponse.json(
      { status: "error", message: "User not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ status: "success", data: user });
}


export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log("PUT id:", id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "Missing user id" },
        { status: 400 },
      );
    }

    const token = req.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
       if (decoded.role !== "Admin") {
      return NextResponse.json(
        { status: "error", message: "Forbidden: Admins only" },
        { status: 403 },
      );
    }

    } catch (err) {
      return NextResponse.json(
        { status: "error", message: "Invalid token" },
        { status: 401 },
      );
    }

   
    const body = await req.json();
    console.log("PUT body:", body);

    if (!body.role) {
      return NextResponse.json(
        { status: "error", message: "Missing role field" },
        { status: 400 },
      );
    }

    if (SCOPED_ROLES.includes(body.role) && !body.assignedCollege) {
      return NextResponse.json(
        {
          status: "error",
          message: `assignedCollege is required for role ${body.role}`,
        },
        { status: 400 },
      );
    }

    await connectDB();
    const update = { role: body.role };
    if (body.assignedCollege !== undefined)
      update.assignedCollege = body.assignedCollege;
    const updated = await User.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();

    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    await logActivity({
      req,
      action: "ROLE_CHANGE",
      description: `Assigned role "${body.role}"${body.assignedCollege ? ` to ${body.assignedCollege}` : ""}`,
      resource_type: "user",
      resource_id: id,
      severity: "warning",
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    console.log("DELETE id:", id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "Missing user id" },
        { status: 400 },
      );
    }

    await connectDB();
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    await logActivity({
      req,
      action: "USER_DELETE",
      description: `Deleted user ${id}`,
      resource_type: "user",
      resource_id: id,
      severity: "warning",
    });

    return NextResponse.json({ status: "success", message: "User deleted" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
