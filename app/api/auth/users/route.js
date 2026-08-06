import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/integration/_utils/auth";

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();

    const users = await UserAuth.find({}, { password: 0 }).lean();

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

    const result = await UserAuth.deleteMany({});

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