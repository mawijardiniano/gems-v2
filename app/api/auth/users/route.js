import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";
import { logActivity } from "@/lib/activityLog";

const USERS_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();

    const users = await cacheOrSet(
      "auth:users:list",
      async () => {
        return UserAuth.find({}, { password: 0 }).lean();
      },
      USERS_LIST_CACHE_TTL,
    );

    return Response.json({ status: "success", data: users }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return Response.json(
      { status: "error", message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();

    /* Snapshot the accounts before wiping them.
     *
     * `deleteMany({})` removes every login in the system. If it is ever called
     * against the wrong database the only way to rebuild is from a record of
     * which accounts existed — and the users themselves are gone, so nothing
     * else in the system still names them. This is also the single most
     * destructive operation an Admin can perform, so it is logged before the
     * act (with the roster) and again after (with the count actually removed). */
    const doomed = await UserAuth.find(
      {},
      { username: 1, role: 1, is_active: 1 },
    ).lean();

    await logActivity({
      req,
      actor: {
        user_id: auth.user?._id || null,
        username: auth.user?.username || null,
        role: auth.user?.role || null,
        auth_method: "session",
      },
      action: "USER_DELETE_ALL",
      description: `Deleted all ${doomed.length} user accounts`,
      severity: "critical",
      resource_type: "user",
      module: "auth",
      metadata: {
        attempted_count: doomed.length,
        accounts: doomed.map((u) => ({
          username: u.username,
          role: u.role,
          is_active: u.is_active,
        })),
      },
    });

    const result = await UserAuth.deleteMany({});

    cacheDelPrefix("auth:users:");

    return NextResponse.json({
      status: "success",
      message: `Deleted ${result.deletedCount} users.`,
    });
  } catch (error) {
    console.error("Error deleting all profiles:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}