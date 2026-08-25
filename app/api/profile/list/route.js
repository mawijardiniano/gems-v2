import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";

const JWT_SECRET = process.env.JWT_SECRET;
const LIST_CACHE_TTL = 15 * 1000; // 15 seconds

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseListParam(value) {
  if (!value) return null;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

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
    const type = url.searchParams.get("type")?.trim() || null;

    const sex = url.searchParams.get("sex")?.trim() || null;
    const yearLevel = url.searchParams.get("yearLevel")?.trim() || null;
    const colleges = parseListParam(url.searchParams.get("colleges"));
    const offices = parseListParam(url.searchParams.get("offices"));
    const employmentStatus =
      url.searchParams.get("employmentStatus")?.trim() || null;
    const appointmentStatus = parseListParam(
      url.searchParams.get("appointmentStatus"),
    );
    const schoolYear = url.searchParams.get("schoolYear")?.trim() || null;
    const semester = url.searchParams.get("semester")?.trim() || null;
    const search = url.searchParams.get("search")?.trim() || null;

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

    const cacheKey = `profile:list:${scopedCollege || "all"}:${type || "all"}:${page}:${limit}:${sex || "all"}:${yearLevel || "all"}:${colleges?.join(",") || "all"}:${offices?.join(",") || "all"}:${employmentStatus || "all"}:${appointmentStatus?.join(",") || "all"}:${schoolYear || "all"}:${semester || "all"}:${search || "all"}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        let termProfileIds = null;
        if (schoolYear || semester) {
          const termFilter = {};
          if (schoolYear) termFilter.school_year = schoolYear;
          if (semester) termFilter.semester = semester;
          const matchingTerms = await ProfileTerm.find(termFilter, {
            profile_id: 1,
          }).lean();
          termProfileIds = new Set(
            matchingTerms.map((t) => String(t.profile_id)),
          );
        }

        const conditions = [];

        if (scopedCollege) {
          conditions.push({
            $or: [
              {
                "personal_info_id.affiliation.academic_information.college":
                  scopedCollege,
              },
              {
                "personal_info_id.affiliation.employment_information.office":
                  scopedCollege,
              },
            ],
          });
        }
        if (type) {
          conditions.push({ "personal_info_id.personal.currentStatus": type });
        }
        if (sex) {
          conditions.push({ "personal_info_id.gadData.sexAtBirth": sex });
        }
        if (yearLevel) {
          conditions.push({
            "personal_info_id.affiliation.academic_information.year_level":
              yearLevel,
          });
        }
        if (colleges?.length) {
          conditions.push({
            "personal_info_id.affiliation.academic_information.college": {
              $in: colleges,
            },
          });
        }
        if (offices?.length) {
          conditions.push({
            "personal_info_id.affiliation.employment_information.office": {
              $in: offices,
            },
          });
        }
        if (employmentStatus) {
          conditions.push({
            "personal_info_id.affiliation.employment_information.employment_status":
              employmentStatus,
          });
        }
        if (appointmentStatus?.length) {
          conditions.push({
            "personal_info_id.affiliation.employment_information.employment_appointment_status":
              { $in: appointmentStatus },
          });
        }
        if (schoolYear || semester) {
          const termIds = [...termProfileIds].map(
            (id) => new mongoose.Types.ObjectId(id),
          );
          conditions.push({ "personal_info_id._id": { $in: termIds } });
        }
        if (search) {
          const re = escapeRegex(search);
          conditions.push({
            $or: [
              {
                "personal_info_id.personal.first_name": {
                  $regex: re,
                  $options: "i",
                },
              },
              {
                "personal_info_id.personal.last_name": {
                  $regex: re,
                  $options: "i",
                },
              },
            ],
          });
        }

        const match = conditions.length ? { $and: conditions } : {};
        const hasMatch = conditions.length > 0;

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
        if (hasMatch) {
          countPipeline.push({ $match: { "personal_info_id._id": { $ne: null } } });
          countPipeline.push({ $match: match });
        }
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
        if (hasMatch) {
          dataPipeline.push({ $match: { "personal_info_id._id": { $ne: null } } });
          dataPipeline.push({ $match: match });
        }
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

        const profileIds = data
          .map((u) => u.personal_info_id?._id)
          .filter(Boolean);

        const allTerms = profileIds.length
          ? await ProfileTerm.aggregate([
              { $match: { profile_id: { $in: profileIds } } },

              {
                $addFields: {
                  semester_rank: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$semester", "Summer"] }, then: 3 },
                        { case: { $eq: ["$semester", "2nd"] }, then: 2 },
                        { case: { $eq: ["$semester", "1st"] }, then: 1 },
                      ],
                      default: 0,
                    },
                  },
                },
              },
              { $sort: { school_year: -1, semester_rank: -1 } },
              {
                $group: {
                  _id: "$profile_id",
                  profile_terms: {
                    $push: {
                      profile_term_id: "$_id",
                      school_year: "$school_year",
                      semester: "$semester",
                      updatedAt: "$updatedAt",
                      createdAt: "$createdAt",
                    },
                  },
                  latest_school_year: { $first: "$school_year" },
                  latest_semester: { $first: "$semester" },
                  latest_profile_term_id: { $first: "$_id" },
                },
              },
            ])
          : [];

        const termByProfileId = new Map(
          allTerms.map((term) => [String(term._id), term]),
        );

        const dataWithTerms = data.map((user) => {
          const profileId = user.personal_info_id?._id;
          const term = profileId
            ? termByProfileId.get(String(profileId))
            : null;
          return {
            ...user,
            school_year: term?.latest_school_year || null,
            semester: term?.latest_semester || null,
            profile_term_id: term?.latest_profile_term_id || null,
            profile_terms: term?.profile_terms || [],
          };
        });

        return {
          data: dataWithTerms,
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