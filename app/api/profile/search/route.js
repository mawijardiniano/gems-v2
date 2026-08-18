import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";

const SEARCH_CACHE_TTL = 15 * 1000;

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const role = url.searchParams.get("role")?.trim() || null;
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10)),
    );

    const cacheKey = `profile:search:${q || "all"}:${role || "all"}:${limit}`;

    const data = await cacheOrSet(
      cacheKey,
      async () => {
        const match = {};
        if (role) {
          match.role = role;
        }

        const pipeline = [
          {
            $lookup: {
              from: Profile.collection.name,
              localField: "personal_info_id",
              foreignField: "_id",
              as: "personal_info_id",
            },
          },
          {
            $unwind: {
              path: "$personal_info_id",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];

        if (q) {
          const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          match.$or = [
            { username: regex },
            { "personal_info_id.personal.first_name": regex },
            { "personal_info_id.personal.last_name": regex },
          ];
        }

        if (Object.keys(match).length > 0) {
          pipeline.push({ $match: match });
        }

        pipeline.push(
          { $limit: limit },
          {
            $project: {
              _id: 1,
              username: 1,
              role: 1,
              assignedCollege: 1,
              "personal_info_id._id": 1,
              "personal_info_id.personal.first_name": 1,
              "personal_info_id.personal.last_name": 1,
            },
          },
        );

        return UserAuth.aggregate(pipeline);
      },
      SEARCH_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", data });
  } catch (error) {
    console.error("GET /api/profile/search error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}