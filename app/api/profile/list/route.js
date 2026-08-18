import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";

const JWT_SECRET = process.env.JWT_SECRET;
const LIST_CACHE_TTL = 15 * 1000; // 15 seconds

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)),
    );
    const college = url.searchParams.get("college")?.trim() || null;

    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        decoded = null;
      }
    }
    const scopedCollege = college || decoded?.assignedCollege || null;

    const cacheKey = `profile:list:${scopedCollege || "all"}:${page}:${limit}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const match = {};
        if (scopedCollege) {
          match.$or = [
            {
              "personal_info_id.affiliation.academic_information.college":
                scopedCollege,
            },
            {
              "personal_info_id.affiliation.employment_information.office":
                scopedCollege,
            },
          ];
        }

        const countPipeline = [
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
        if (scopedCollege) countPipeline.push({ $match: match });
        countPipeline.push({ $count: "total" });

        const [countResult] = await UserAuth.aggregate(countPipeline);
        const total = countResult?.total || 0;

        const dataPipeline = [
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
        if (scopedCollege) dataPipeline.push({ $match: match });
        dataPipeline.push(
          { $skip: (page - 1) * limit },
          { $limit: limit },

          {
            $project: {
              _id: 1,
              username: 1,
              role: 1,
              assignedCollege: 1,
              is_active: 1,
              "personal_info_id._id": 1,
              "personal_info_id.personal.first_name": 1,
              "personal_info_id.personal.last_name": 1,
              "personal_info_id.personal.currentStatus": 1,
              "personal_info_id.gadData.sexAtBirth": 1,
              "personal_info_id.affiliation.academic_information": 1,
              "personal_info_id.affiliation.employment_information": 1,
            },
          },
        );

        const data = await UserAuth.aggregate(dataPipeline);

        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      },
      LIST_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", ...result });
  } catch (error) {
    console.error("GET /api/profile/list error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}