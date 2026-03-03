import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import User from "@/models/user";
import "@/models/profile";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";

export async function POST(req) {
  try {
    await connectDB();

    const { event_id, user_id } = await req.json();

    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid Event ID is required" },
        { status: 400 },
      );
    }

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid User ID is required" },
        { status: 400 },
      );
    }

    const user = await User.findById(user_id);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    let event = await Event.findById(event_id);
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });

    const alreadyRegistered = event.registered_users.some(
      (id) => id.toString() === user_id,
    );
    if (alreadyRegistered) {
      return NextResponse.json(
        { message: "User already registered", event, eligible: true },
        { status: 200 },
      );
    }

    event.registered_users.push(user._id);
    await event.save();

    // Populate registered users (with personal info) and host for the response
    event = await event.populate([
      {
        path: "created_by",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      },
      {
        path: "registered_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      },
    ]);

    await logActivity({
      user_id: user._id,
      action: "EVENT_REGISTER",
      description: `Registered for event: ${event.title}`,
      req,
      metadata: { event_id: event._id },
    });

    return NextResponse.json(
      { message: "Successfully registered", event, eligible: true },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 },
    );
  }
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");
    const user_id = searchParams.get("user_id");

    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid Event ID is required" },
        { status: 400 },
      );
    }

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid User ID is required" },
        { status: 400 },
      );
    }

    const event = await Event.findById(event_id);
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });

    const user = await User.findById(user_id);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json(
      {
        eligible: true,
        reason: "All users are invited",
        event_id,
        user_id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 },
    );
  }
}
