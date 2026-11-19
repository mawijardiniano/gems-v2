import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { connectDB } from "@/data/lib/db";
import { NextResponse } from "next/server";
import { logActivity } from "@/data/lib/activityLog";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { emitToRoles, PROFILE_WATCHER_ROLES } from "@/data/lib/realtime";
import { invalidateUserCache } from "@/data/lib/auth";
import { cacheDelPrefix } from "@/data/lib/cache";
import {
  isSelf,
  isValidObjectId,
  wouldRemoveLastAdmin,
} from "@/data/lib/adminGuards";

export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { status: "error", message: "No IDs provided" },
        { status: 400 },
      );
    }

    if (!ids.every(isValidObjectId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid user id in list" },
        { status: 400 },
      );
    }
    if (ids.some((id) => isSelf(auth.user, id))) {
      return NextResponse.json(
        { status: "error", message: "You cannot delete your own account." },
        { status: 400 },
      );
    }
    if (await wouldRemoveLastAdmin(ids)) {
      return NextResponse.json(
        {
          status: "error",
          message: "The selection includes every active Admin; at least one must remain.",
        },
        { status: 400 },
      );
    }

    const users = await UserAuth.find({ _id: { $in: ids } });
    const profileIds = users.map((u) => u.personal_info_id).filter(Boolean);
    await Profile.deleteMany({ _id: { $in: profileIds } });
    await UserAuth.deleteMany({ _id: { $in: ids } });

    ids.forEach((id) => invalidateUserCache(id));
    /* Deleted users otherwise reappear in the cached lists for 15 s. */
    cacheDelPrefix("profile:list:");

    await logActivity({
      req,
      user_id: auth.user._id,
      action: "PROFILE_BULK_DELETE",
      description: `Bulk deleted ${ids.length} user(s) and linked profiles`,
      resource_type: "profile",
      severity: "critical",
      metadata: { ids },
    });

    profileIds.forEach((pid) => {
      emitToRoles(PROFILE_WATCHER_ROLES, "profile:deleted", {
        id: pid.toString(),
      });
    });

    return NextResponse.json({
      status: "success",
      message: "Users and linked profiles deleted",
    });
  } catch (error) {
    console.error("BULK DELETE /api/profile/bulk error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
