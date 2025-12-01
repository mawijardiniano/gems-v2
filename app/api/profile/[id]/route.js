import Profile from "@/models/profile";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id) return NextResponse.json({ status: "error", message: "Missing profile id" }, { status: 400 });

  await connectDB();
  const profile = await Profile.findById(id).lean();
  if (!profile) return NextResponse.json({ status: "error", message: "Profile not found" }, { status: 404 });

  return NextResponse.json({ status: "success", data: profile });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ status: "error", message: "Missing profile id" }, { status: 400 });

  await connectDB();
  const body = await req.json();
  const updated = await Profile.findByIdAndUpdate(id, body, { new: true }).lean();

  if (!updated) return NextResponse.json({ status: "error", message: "Profile not found" }, { status: 404 });

  if (global.io) {
    global.io.emit("profile:updated", updated);
    console.log("✅ Emitted profile:updated", updated._id);
  } else {
    console.warn("⚠️ Socket.IO server not initialized!");
  }

  return NextResponse.json({ status: "success", data: updated });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ status: "error", message: "Missing profile id" }, { status: 400 });

  await connectDB();
  const deleted = await Profile.findByIdAndDelete(id).lean();

  if (!deleted) return NextResponse.json({ status: "error", message: "Profile not found" }, { status: 404 });

  if (global.io) {
    global.io.emit("profile:deleted", { id });
    console.log("✅ Emitted profile:deleted", id);
  } else {
    console.warn("⚠️ Socket.IO server not initialized!");
  }

  return NextResponse.json({ status: "success", message: "Profile deleted" });
}
