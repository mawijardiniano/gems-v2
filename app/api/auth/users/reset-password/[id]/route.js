import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import UserAuth from "@/models/user";
import { logActivity } from "@/data/lib/activityLog";
import { invalidateUserCache } from "@/data/lib/auth";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { isValidObjectId } from "@/data/lib/adminGuards";

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    /* Role from the database, not the token: a demoted or deactivated admin's
       unexpired token used to keep this power for up to a day. */
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

    const user = await UserAuth.findById(id).select("+password");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const tempPassword = "gems1234";

    user.password = tempPassword;

    await user.save();

    invalidateUserCache(id);

    await logActivity({
      req,
      user_id: auth.user._id,
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
      { status: 500 },
    );
  }
}
