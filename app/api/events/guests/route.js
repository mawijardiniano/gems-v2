import { connectDB } from "@/lib/db";
import EventGuest from "@/models/eventGuest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id))
      return NextResponse.json({ message: "Valid event_id is required" }, { status: 400 });
    const guests = await EventGuest.find({ event_id }).sort({ attended_at: -1 }).lean();
    return NextResponse.json({ status: "success", data: guests });
  } catch (err) {
    return NextResponse.json({ message: "Unable to load guests." }, { status: 500 });
  }
}
