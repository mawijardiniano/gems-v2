import { connectDB } from "@/lib/db";
import User from "@/models/user";

export async function GET() {
  try {
    await connectDB();

    const users = await User.find({}, { password: 0 }).lean();

    return Response.json({ status: "success", data: users }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return Response.json(
      { status: "error", message: "Internal Server Error" },
      { status: 500 }
    );
  }
}