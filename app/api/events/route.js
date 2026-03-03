import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import UserAuth from "@/models/user";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find()
      .populate({
        path: "created_by",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: {
          path: "personal_info_id",
          model: "GemsProfile",
        },
      })
      .populate({
        path: "registered_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: {
          path: "personal_info_id",
          model: "GemsProfile",
        },
      })
      .populate({
        path: "interested_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: {
          path: "personal_info_id",
          model: "GemsProfile",
        },
      })
      .populate({
        path: "not_interested_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: {
          path: "personal_info_id",
          model: "GemsProfile",
        },
      })
      .lean();

    return NextResponse.json({ status: "success", data: events });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      title,
      description,
      start_date,
      end_date,
      venue,
      created_by,
      type_of_activity,
      organizing_office_unit,
      eligibility_criteria,
    } = body;

    if (
      !title ||
      !start_date ||
      !end_date ||
      !created_by ||
      !type_of_activity ||
      !organizing_office_unit ||
      !eligibility_criteria
    ) {
      return NextResponse.json(
        {
          message:
            "Title, start_date, end_date, created_by, type_of_activity, and organizing_office_unit are required.",
        },
        { status: 400 },
      );
    }

    const user = await UserAuth.findById(created_by);
    if (!user) {
      return NextResponse.json(
        { message: "Creator user not found." },
        { status: 404 },
      );
    }

    if (user.role !== "Focal") {
      return NextResponse.json(
        { message: "Only Focal users can create events." },
        { status: 403 },
      );
    }

    const newEvent = await Event.create({
      title,
      description,
      start_date,
      end_date,
      venue,
      type_of_activity,
      organizing_office_unit,
      eligibility_criteria,
      created_by,
      updated_by: created_by,
      registered_users: [],
    });

    await logActivity({
      user_id: user._id,
      action: "EVENT_CREATE",
      description: `Created event: ${title}`,
      req,
      metadata: { event_id: newEvent?._id },
    });

    return NextResponse.json(
      { message: "Event created successfully", event: newEvent },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await connectDB();

    const result = await Event.deleteMany({});

    return NextResponse.json({
      status: "success",
      message: `Deleted ${result.deletedCount} event.`,
    });
  } catch (error) {
    console.error("Error deleting all events:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
