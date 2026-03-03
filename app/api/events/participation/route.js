import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const VALID_STATUSES = ["interested", "not_interested", "going"];

export async function POST(req) {
  try {
    await connectDB();

    const { event_id, user_id, status } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );
    }

    const userIds = Array.isArray(user_id) ? user_id : [user_id];
    if (userIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return NextResponse.json(
        { message: "All user_ids must be valid" },
        { status: 400 },
      );
    }

    const event = await Event.findById(event_id);
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });

    userIds.forEach((uid) => {
      event.registered_users.pull(uid);
      event.interested_users?.pull?.(uid);
      event.not_interested_users?.pull?.(uid);
    });

    if (status === "going") {
      userIds.forEach((uid) => event.registered_users.addToSet(uid));
    } else if (status === "interested") {
      event.interested_users = event.interested_users || [];
      userIds.forEach((uid) => {
        if (typeof event.interested_users.addToSet === "function") {
          event.interested_users.addToSet(uid);
        } else if (
          !event.interested_users.find((id) => id.toString() === uid.toString())
        ) {
          event.interested_users.push(uid);
        }
      });
    } else if (status === "not_interested") {
      event.not_interested_users = event.not_interested_users || [];
      userIds.forEach((uid) => {
        if (typeof event.not_interested_users.addToSet === "function") {
          event.not_interested_users.addToSet(uid);
        } else if (
          !event.not_interested_users.find(
            (id) => id.toString() === uid.toString(),
          )
        ) {
          event.not_interested_users.push(uid);
        }
      });
    }

    await event.save();

    const populated = await event.populate([
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
      {
        path: "interested_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      },
      {
        path: "not_interested_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      },
    ]);

    return NextResponse.json({ message: "Status updated", event: populated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 },
    );
  }
}
