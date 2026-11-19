import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import UserAuth from "@/models/user";
import { logActivity } from "@/data/lib/activityLog";
import { invalidateUserCache } from "@/data/lib/auth";
import { disconnectUser } from "@/data/lib/realtime";
import { cacheDelPrefix } from "@/data/lib/cache";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import {
  isSelf,
  isValidObjectId,
  wouldRemoveLastAdmin,
} from "@/data/lib/adminGuards";

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    /* Role and active state from the database, not the token. */
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const user = await UserAuth.findById(id);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { action } = await req.json();

    if (action === "activate") {
      user.is_active = true;
    } else if (action === "deactivate") {
      if (isSelf(auth.user, id)) {
        return NextResponse.json(
          { message: "You cannot deactivate your own account." },
          { status: 400 },
        );
      }
      if (user.role === "Admin" && (await wouldRemoveLastAdmin([id]))) {
        return NextResponse.json(
          { message: "This is the last active Admin and cannot be deactivated." },
          { status: 400 },
        );
      }
      user.is_active = false;
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    await user.save();

    invalidateUserCache(id);
    disconnectUser(id);
    /* The user lists cache rows (including is_active) for 15 s. */
    cacheDelPrefix("profile:list:");

    await logActivity({
      req,
      user_id: auth.user._id,
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
      { status: 500 },
    );
  }
}
