import User from "@/models/user";
import { connectDB } from "@/data/lib/db";
import { NextResponse } from "next/server";
import { SCOPED_ROLES } from "@/data/lib/colleges";
import { logActivity } from "@/data/lib/activityLog";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { invalidateUserCache } from "@/data/lib/auth";
import {
  ROLE_VALUES,
  isSelf,
  isValidObjectId,
  wouldRemoveLastAdmin,
} from "@/data/lib/adminGuards";

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    if (!id || !isValidObjectId(id)) {
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

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { status: "error", message: "Missing or invalid user id" },
        { status: 400 },
      );
    }

    const body = await req.json();

    if (!body.role) {
      return NextResponse.json(
        { status: "error", message: "Missing role field" },
        { status: 400 },
      );
    }

    /* findByIdAndUpdate skips schema validation, so an off-list role
       ("admin", "SuperAdmin") used to be stored as-is and then pass some
       role checks and fail others. */
    if (!ROLE_VALUES.includes(body.role)) {
      return NextResponse.json(
        { status: "error", message: `Unknown role "${body.role}"` },
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

    const existing = await User.findById(id, {
      role: 1,
      assignedCollege: 1,
    }).lean();
    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    /* Keep the system administrable: no self-demotion, and the last active
       Admin can never be moved off the Admin role. */
    const removesAdmin = existing.role === "Admin" && body.role !== "Admin";
    if (removesAdmin && isSelf(auth.user, id)) {
      return NextResponse.json(
        { status: "error", message: "You cannot remove your own Admin role." },
        { status: 400 },
      );
    }
    if (removesAdmin && (await wouldRemoveLastAdmin([id]))) {
      return NextResponse.json(
        {
          status: "error",
          message: "This is the last active Admin; assign another Admin first.",
        },
        { status: 400 },
      );
    }

    /* A college only means something for a scoped role; moving off one
       clears it instead of leaving stale scope data on the account. */
    const update = SCOPED_ROLES.includes(body.role)
      ? { $set: { role: body.role, assignedCollege: body.assignedCollege } }
      : { $set: { role: body.role }, $unset: { assignedCollege: "" } };
    const updated = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      projection: { password: 0 },
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
      user_id: auth.user._id,
      action: "ROLE_CHANGE",
      description: `Changed role from "${existing.role}" to "${body.role}"${body.assignedCollege && SCOPED_ROLES.includes(body.role) ? ` (${body.assignedCollege})` : ""}`,
      resource_type: "user",
      resource_id: id,
      severity: "warning",
      changes: [
        { field: "role", before: existing.role, after: body.role, redacted: false },
        {
          field: "assignedCollege",
          before: existing.assignedCollege ?? null,
          after: updated.assignedCollege ?? null,
          redacted: false,
        },
      ],
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

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { status: "error", message: "Missing or invalid user id" },
        { status: 400 },
      );
    }

    if (isSelf(auth.user, id)) {
      return NextResponse.json(
        { status: "error", message: "You cannot delete your own account." },
        { status: 400 },
      );
    }

    await connectDB();

    const target = await User.findById(id, { role: 1 }).lean();
    if (target?.role === "Admin" && (await wouldRemoveLastAdmin([id]))) {
      return NextResponse.json(
        {
          status: "error",
          message: "This is the last active Admin and cannot be deleted.",
        },
        { status: 400 },
      );
    }

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
      user_id: auth.user._id,
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
