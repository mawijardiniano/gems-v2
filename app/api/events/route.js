import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import UserAuth from "@/models/user";
import Project from "@/models/projects";
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
      number_of_days,
      start_dates,
      end_dates,
      venue,
      created_by,
      type_of_activity,
      organizing_office_unit,
      co_organizing_office_unit,
      eligibility_criteria,
      target_number_of_participants,
      project,
      gad_activity,
    } = body;

    if (
      !title ||
      !number_of_days ||
      !Array.isArray(start_dates) ||
      !Array.isArray(end_dates) ||
      start_dates.length !== Number(number_of_days) ||
      end_dates.length !== Number(number_of_days) ||
      !created_by ||
      !type_of_activity ||
      !co_organizing_office_unit ||
      !organizing_office_unit ||
      !eligibility_criteria ||
      !target_number_of_participants
    ) {
      return NextResponse.json(
        {
          message:
            "All fields are required. start_dates and end_dates must be arrays matching number_of_days.",
        },
        { status: 400 },
      );
    }

    const user = await UserAuth.findById(created_by);
    if (!user) {
      console.error("POST /api/events: Creator user not found", { created_by });
      return NextResponse.json(
        { message: "Creator user not found." },
        { status: 404 },
      );
    }

    if (user.role !== "GAD Focal Person" && user.role !== "GAD Coordinator") {
      console.error(
        "POST /api/events: Forbidden - user is not Focal or Coordinator",
        {
          userId: user._id,
          username: user.username,
          role: user.role,
        },
      );
      return NextResponse.json(
        {
          message:
            "Only GAD Focal Person or GAD Coordinator can create events.",
          debug: { userId: user._id, username: user.username, role: user.role },
        },
        { status: 403 },
      );
    }

    const newEvent = await Event.create({
      title,
      description,
      number_of_days,
      start_dates,
      end_dates,
      venue,
      type_of_activity,
      organizing_office_unit,
      co_organizing_office_unit,
      eligibility_criteria,
      target_number_of_participants,
      created_by,
      updated_by: created_by,
      registered_users: [],
      ...(project ? { project } : {}),
      gad_activity,
    });

    if (project) {
      await Project.findByIdAndUpdate(
        project,
        { $addToSet: { events: newEvent._id } },
        { new: true },
      );
    }

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
