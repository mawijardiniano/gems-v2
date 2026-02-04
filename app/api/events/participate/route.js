import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import User from "@/models/user";
import GemsProfile from "@/models/profile";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";

async function meetsInvitationRules(userId, rules) {
  if (!rules || Object.keys(rules).length === 0) {
    return { eligible: true, reason: "No restrictions" };
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return { eligible: false, reason: "User not found" };
  }

  const profile = await GemsProfile.findById(user.personal_info_id).lean();
  if (!profile) {
    return { eligible: false, reason: "User profile not found" };
  }

  if (
    rules.person_type &&
    Array.isArray(rules.person_type) &&
    rules.person_type.length > 0
  ) {
    const userStatus = profile.currentStatus;
    if (userStatus && !rules.person_type.includes(userStatus)) {
      return {
        eligible: false,
        reason: `Person type "${userStatus}" not allowed. Required: ${rules.person_type.join(
          ", ",
        )}`,
      };
    }
  }

  if (
    rules.employment_status &&
    Array.isArray(rules.employment_status) &&
    rules.employment_status.length > 0
  ) {
    const empStatus = profile.personal_information?.employment_status;
    if (!empStatus || !rules.employment_status.includes(empStatus)) {
      return {
        eligible: false,
        reason: `Employment status "${empStatus}" not allowed. Required: ${rules.employment_status.join(
          ", ",
        )}`,
      };
    }
  }

  if (rules.pwd === true || rules.pwd === false) {
    const hasPWD = profile.personal_information?.pwd;
    if (hasPWD !== rules.pwd) {
      const expectedText = rules.pwd ? "PWD only" : "Non-PWD only";
      const userText = hasPWD ? "PWD" : "Non-PWD";
      return {
        eligible: false,
        reason: `Event requires ${expectedText}, but you are ${userText}`,
      };
    }
  }

  if (rules.solo_parent === true || rules.solo_parent === false) {
    const userSoloParent = profile.personal_information?.solo_parent;
    if (userSoloParent !== rules.solo_parent) {
      const expectedText = rules.solo_parent
        ? "Solo Parents Only"
        : "Non-Solo Parents Only";
      const userText = userSoloParent ? "Solo Parent" : "Not a Solo Parent";
      return {
        eligible: false,
        reason: `Event requires: ${expectedText}. You are: ${userText}`,
      };
    }
  }

  if (
    rules.college_scope === "SELECTED" &&
    rules.colleges &&
    Array.isArray(rules.colleges) &&
    rules.colleges.length > 0
  ) {
    const userCollege = profile.personal_information?.college_office;
    if (!userCollege || !rules.colleges.includes(userCollege)) {
      return {
        eligible: false,
        reason: `College "${userCollege}" not allowed. Required: ${rules.colleges.join(
          ", ",
        )}`,
      };
    }
  }

  return { eligible: true, reason: "Meets all requirements" };
}

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

    const event = await Event.findById(event_id);
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });

    const ruleCheck = await meetsInvitationRules(
      user_id,
      event.invitation_rules,
    );
    if (!ruleCheck.eligible) {
      return NextResponse.json(
        {
          message: ruleCheck.reason,
          eligible: false,
        },
        { status: 403 },
      );
    }

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

    const ruleCheck = await meetsInvitationRules(
      user_id,
      event.invitation_rules,
    );

    return NextResponse.json(
      {
        eligible: ruleCheck.eligible,
        reason: ruleCheck.reason,
        event_id,
        user_id,
        invitation_rules: event.invitation_rules,
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
