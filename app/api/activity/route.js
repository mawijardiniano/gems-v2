import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/activity_log";
import jwt from "jsonwebtoken";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";

const JWT_SECRET = process.env.JWT_SECRET;
const ACTIVITY_CACHE_TTL = 15 * 1000; // 15 seconds

function authenticate(req) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    await connectDB();

    const decoded = authenticate(req);
    if (!decoded) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const filter = {};

    if (decoded.role === "Admin") {
      const user_id = url.searchParams.get("user_id");
      if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
        filter.user_id = user_id;
      }
    } else {
      // Non-admins can only view their own activity
      filter.user_id = decoded.id;
    }

    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Build a cache key from the authenticated user + query params so
    // each user/filter combination gets its own cached result.
    const cacheKey = `activity:${decoded.id}:${JSON.stringify(filter)}:${page}:${limit}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const total = await ActivityLog.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const activities = await ActivityLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

        return {
          activities,
          pagination: { total, totalPages, page, limit },
        };
      },
      ACTIVITY_CACHE_TTL,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Activity fetch error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    await connectDB();

    const decoded = authenticate(req);
    if (!decoded || decoded.role !== "Admin") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Valid id is required" },
        { status: 400 },
      );
    }

    const result = await ActivityLog.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ message: "Log not found" }, { status: 404 });
    }

    // Invalidate cached activity lists so the next fetch is fresh.
    cacheDelPrefix("activity:");

    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("Activity delete error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}