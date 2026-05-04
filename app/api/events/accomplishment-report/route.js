import { connectDB } from "@/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const report = await AccomplishmentReport.create(body);

    return NextResponse.json({ status: "success", data: report });
  } catch (err) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event_id");

    let query = {};

    if (eventId) {
      query.event_id = eventId;
    }

    const reports = await AccomplishmentReport.find(query)
      .populate("event_id", "title venue start_dates end_dates")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      status: "success",
      data: reports,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}