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

export async function DELETE() {
  try {
    await connectDB();

    const result = await User.deleteMany({});

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