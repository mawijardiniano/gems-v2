import User from "@/models/user";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { id } = await params; 
  console.log("id:", id);

  if (!id) {
    return NextResponse.json({ status: "error", message: "Missing user id" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(id, { password: 0 }).lean();

  if (!user) {
    return NextResponse.json({ status: "error", message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ status: "success", data: user });
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    console.log("PUT id:", id);

    if (!id) {
      return NextResponse.json({ status: "error", message: "Missing user id" }, { status: 400 });
    }

    const body = await request.json();
    console.log("PUT body:", body);

    await connectDB();
    const updated = await User.findByIdAndUpdate(id, body, { new: true }).lean();

    if (!updated) {
      return NextResponse.json({ status: "error", message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "success", data: updated });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ status: "error", message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    console.log("DELETE id:", id);

    if (!id) {
      return NextResponse.json({ status: "error", message: "Missing user id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ status: "error", message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "success", message: "User deleted" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ status: "error", message: "Internal Server Error" }, { status: 500 });
  }
}
