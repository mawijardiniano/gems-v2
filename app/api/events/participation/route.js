import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheDelPrefix } from "@/lib/cache";

const VALID_STATUSES = ["interested", "not_interested", "going"];

const ORGANIZER_ROLES = [
  "Admin",
  "GAD Focal Person",
  "GAD Coordinator",
  "Dean",
];

export async function POST(req) {
  try {
    const { error, status: authStatus, user } = await requireAuth(req);
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

    const actingOnSelf =
      userIds.length === 1 && userIds[0] === user._id.toString();
    if (!actingOnSelf && !ORGANIZER_ROLES.includes(user.role)) {
      return NextResponse.json(
        { message: "You can only update your own participation." },
        { status: 403 },
      );
    }

    const event = await Event.findById(event_id);
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });

    const applyParticipation = (doc) => {
      userIds.forEach((uid) => {
        doc.registered_users.pull(uid);
        doc.interested_users?.pull?.(uid);
        doc.not_interested_users?.pull?.(uid);
      });

      doc.participant_numbers = doc.participant_numbers || [];
      if (status === "going" || status === "interested") {
        userIds.forEach((uid) => {
          const alreadyAssigned = doc.participant_numbers.some(
            (p) => p.user_id.toString() === uid.toString(),
          );
          if (!alreadyAssigned) {
            const usedNumbers = doc.participant_numbers.map((p) => p.number);
            let nextNumber = 1;
            while (usedNumbers.includes(nextNumber)) nextNumber++;
            doc.participant_numbers.push({ user_id: uid, number: nextNumber });
          }
        });
      } else if (status === "not_interested") {
        doc.participant_numbers = doc.participant_numbers.filter(
          (p) => !userIds.some((uid) => p.user_id.toString() === uid.toString()),
        );
      }

      if (status === "going") {
        userIds.forEach((uid) => doc.registered_users.addToSet(uid));
      } else if (status === "interested") {
        doc.interested_users = doc.interested_users || [];
        userIds.forEach((uid) => {
          if (typeof doc.interested_users.addToSet === "function") {
            doc.interested_users.addToSet(uid);
          } else if (
            !doc.interested_users.find((id) => id.toString() === uid.toString())
          ) {
            doc.interested_users.push(uid);
          }
        });
      } else if (status === "not_interested") {
        doc.not_interested_users = doc.not_interested_users || [];
        userIds.forEach((uid) => {
          if (typeof doc.not_interested_users.addToSet === "function") {
            doc.not_interested_users.addToSet(uid);
          } else if (
            !doc.not_interested_users.find(
              (id) => id.toString() === uid.toString(),
            )
          ) {
            doc.not_interested_users.push(uid);
          }
        });
      }
    };

    let savedEvent = null;
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const doc = attempt === 1 ? event : await Event.findById(event_id);
      if (!doc) {
        return NextResponse.json(
          { message: "Event not found" },
          { status: 404 },
        );
      }
      try {
        applyParticipation(doc);
        savedEvent = await doc.save();
        break;
      } catch (err) {
        if (err?.name === "VersionError" && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }

    cacheDelPrefix("events:list:");

    await logActivity({
      req,
      action: "EVENT_PARTICIPATE",
      description: `User participation set to "${status}" for event`,
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: { status, userIds },
    });

    const populated = await savedEvent.populate([
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
