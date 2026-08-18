import User from "@/models/user";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { SCOPED_ROLES } from "@/lib/colleges";
import { logActivity } from "@/lib/activityLog";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { invalidateUserCache } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

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
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    console.log("PUT id:", id);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "Missing user id" },
        { status: 400 },
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

    invalidateUserCache(id);

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

export async function DELETE(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

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

    invalidateUserCache(id);

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