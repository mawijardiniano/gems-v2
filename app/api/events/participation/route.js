import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";

const VALID_STATUSES = ["interested", "not_interested", "going"];

export async function POST(req) {
  try {
    const { error, status: authStatus } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status: authStatus });

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

    // Assign or remove participant numbers
    event.participant_numbers = event.participant_numbers || [];
    if (status === "going" || status === "interested") {
      userIds.forEach((uid) => {
        const alreadyAssigned = event.participant_numbers.some(
          (p) => p.user_id.toString() === uid.toString(),
        );
        if (!alreadyAssigned) {
          // Fill the lowest available gap (Option B)
          const usedNumbers = event.participant_numbers.map((p) => p.number);
          let nextNumber = 1;
          while (usedNumbers.includes(nextNumber)) nextNumber++;
          event.participant_numbers.push({ user_id: uid, number: nextNumber });
        }
      });
    } else if (status === "not_interested") {
      // Remove user's slot so it becomes available for the next person
      event.participant_numbers = event.participant_numbers.filter(
        (p) => !userIds.some((uid) => p.user_id.toString() === uid.toString()),
      );
    }

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

    await logActivity({
      req,
      action: "EVENT_PARTICIPATE",
      description: `User participation set to "${status}" for event`,
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: { status, userIds },
    });

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
