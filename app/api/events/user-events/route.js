import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import User from "@/models/user";
import GemsProfile from "@/models/profile";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

async function meetsInvitationRules(userId, rules) {
  if (!rules || Object.keys(rules).length === 0) return true;

  const user = await User.findById(userId).lean();
  if (!user) return false;

  const profile = await GemsProfile.findById(user.personal_info_id).lean();
  if (!profile) return false;

  const info = profile.personal_information || {};
  const personType = info.person_type;
  if (!personType) return false;

  if (Array.isArray(rules.person_type) && rules.person_type.length > 0) {
    if (!rules.person_type.includes(personType)) return false;
  }

  if (
    personType === "Employee" &&
    Array.isArray(rules.employment_status) &&
    rules.employment_status.length > 0
  ) {
    if (!rules.employment_status.includes(info.employment_status)) {
      return false;
    }
  }

  if (rules.pwd === true || rules.pwd === false) {
    if (!!info.pwd !== rules.pwd) return false;
  }


  if (rules.solo_parent === true || rules.solo_parent === false) {
    if (!!info.solo_parent !== rules.solo_parent) return false;
  }

  if (
    rules.college_scope !== "ALL" &&
    Array.isArray(rules.colleges) &&
    rules.colleges.length > 0
  ) {
    if (!rules.colleges.includes(info.college_office)) {
      return false;
    }
  }

  return true;
}


export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 }
      );
    }

    const createdEvents = await Event.find({
      created_by: user_id,
    }).sort({ date: -1 });

    const participatedEvents = await Event.find({
      registered_users: user_id,
    }).sort({ date: -1 });

    const allOtherEvents = await Event.find({
      created_by: { $ne: user_id },
      registered_users: { $ne: user_id },
    }).sort({ date: -1 });

    const invitedEvents = [];
    for (const event of allOtherEvents) {
      const eligible = await meetsInvitationRules(
        user_id,
        event.invitation_rules
      );
      if (eligible) invitedEvents.push(event);
    }

    return NextResponse.json(
      {
        message: "User events fetched successfully",
        createdEvents,
        participatedEvents,
        invitedEvents,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
