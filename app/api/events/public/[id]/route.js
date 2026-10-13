import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id || !mongoose.isValidObjectId(id))
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  try {
    await connectDB();
    const event = await Event.findById(id)
      .select(
        "_id title description start_date end_date start_dates end_dates venue type_of_activity organizing_office_unit status event_poster.url",
      )
      .lean();
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    return NextResponse.json({ status: "success", data: event });
  } catch (err) {
    return NextResponse.json({ message: "Unable to load event." }, { status: 500 });
  }
}
