import { connectDB } from "@/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  await connectDB();

  const { id } = await params;

  try {
    const report = await AccomplishmentReport.findOne({
      event_id: id,
    });

    return NextResponse.json({ data: report });
  } catch (err) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  await connectDB();

  const { id } = await params;

  try {
    const body = await req.json();

    const updated = await AccomplishmentReport.findOneAndUpdate(
      { event_id: id },
      {
        narrative: body.narrative,
        office_memorandum: body.office_memorandum,
        activity_design: body.activity_design,
        attendance_sheet: body.attendance_sheet,
        photos: body.photos,
        other_attachments: body.other_attachments,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}