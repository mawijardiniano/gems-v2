import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import Profile from "@/models/profile";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    const token = req.cookies.get("auth_token")?.value;

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const payloadId = decoded.id || decoded._id;

    if (!payloadId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(payloadId).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await Profile.findOne({ userId: user._id })
      .populate("userId", "-password")
      .lean();

    if (!profile) {
      return NextResponse.json(
        {
          success: true,
          hasProfile: false,
          user,
          data: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        hasProfile: true,
        user,
        data: profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/profile/me error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
