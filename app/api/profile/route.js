import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import SystemSetting from "@/models/systemSetting";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { rateLimiters } from "@/lib/rateLimit";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";

const PROFILE_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

const JWT_SECRET = process.env.JWT_SECRET;

const CAPITALIZE_KEYS = new Set([
  "first_name",
  "last_name",
  "middle_name",
  "nationality",
  "student_id",
  "headOfHousehold",
]);

async function generateUniqueUsername(personal, affiliation, contact) {
  const isStudent = personal?.currentStatus === "Student";
  const isEmployee = personal?.currentStatus === "Employee";

  const candidates = [];

  if (isStudent) {
    const studentId = affiliation?.academic_information?.student_id;
    if (studentId) {
      candidates.push(studentId.toUpperCase());
    }
  }

  if (isEmployee) {
    const email = contact?.email;
    if (email) {
      candidates.push(email.toLowerCase());
    }
  }

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const candidate of uniqueCandidates) {
    const exists = await UserAuth.findOne({ username: candidate }).lean();
    if (!exists) {
      return candidate;
    }
  }

  throw new Error(
    "Unable to generate a unique username. Please provide a valid student ID (for students) or email (for employees).",
  );
}

function generateTempPassword() {
  return `gems1234`;
}

function capitalizeWords(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function capitalizeObjectStrings(value) {
  if (!value) return value;
  if (Array.isArray(value)) return value.map(capitalizeObjectStrings);

  const newObj = { ...value };
  for (const key in newObj) {
    if (CAPITALIZE_KEYS.has(key) && typeof newObj[key] === "string") {
      newObj[key] = capitalizeWords(newObj[key]);
    } else if (typeof newObj[key] === "object") {
      newObj[key] = capitalizeObjectStrings(newObj[key]);
    }
  }
  return newObj;
}

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        decoded = null;
      }
    }

    const assignedCollege = decoded?.assignedCollege || null;
    const cacheKey = `profile:list:${assignedCollege || "all"}`;

    const usersNoPassword = await cacheOrSet(
      cacheKey,
      async () => {

        const match = {};
        if (assignedCollege) {
          match.$or = [
            {
              "personal_info_id.affiliation.academic_information.college":
                assignedCollege,
            },
            {
              "personal_info_id.affiliation.employment_information.office":
                assignedCollege,
            },
          ];
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
          { $unwind: { path: "$personal_info_id", preserveNullAndEmptyArrays: true } },
        ];

        if (assignedCollege) {
          pipeline.push({ $match: match });
        }

        const scopedUsers = await UserAuth.aggregate(pipeline);

        const profileIds = scopedUsers
          .map((user) => user.personal_info_id?._id)
          .filter(Boolean);

        const allTerms = profileIds.length
          ? await ProfileTerm.aggregate([
              { $match: { profile_id: { $in: profileIds } } },
              { $sort: { updatedAt: -1 } },
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

        const filteredUsers = scopedUsers
          .map((user) => {
            const profileId = user.personal_info_id?._id;
            const term = profileId ? termByProfileId.get(String(profileId)) : null;

            return {
              ...user,
              school_year: term?.latest_school_year || null,
              semester: term?.latest_semester || null,
              profile_term_id: term?.latest_profile_term_id || null,
              profile_terms: term?.profile_terms || [],
            };
          })
          .filter((u) => u.username !== "Admin" && u.username !== "Focal");

        return filteredUsers.map((u) => {
          const { password, ...rest } = u;
          return rest;
        });
      },
      PROFILE_LIST_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", data: usersNoPassword });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const rateLimitResult = await rateLimiters.register(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers },
      );
    }

    await connectDB();

    const body = await req.json();

    const capitalizedBody = capitalizeObjectStrings(body);

    if (capitalizedBody?.affiliation?.academic_information?.student_id) {
      capitalizedBody.affiliation.academic_information.student_id =
        capitalizedBody.affiliation.academic_information.student_id.toUpperCase();
    }

    let personal =
      capitalizedBody.personal || capitalizedBody.personal_information;
    if (!personal || !personal.first_name || !personal.last_name) {
      throw new Error(
        "personal.first_name and personal.last_name are required",
      );
    }

    if (personal.birthday) {
      const birthdayDate = new Date(personal.birthday);
      const existingByNameAndBirthday = await Profile.findOne({
        "personal.first_name": {
          $regex: new RegExp(`^${personal.first_name}$`, "i"),
        },
        "personal.last_name": {
          $regex: new RegExp(`^${personal.last_name}$`, "i"),
        },
        "personal.birthday": birthdayDate,
      });
      if (existingByNameAndBirthday) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A user with the same name and birthday already exists in the system",
          },
          { status: 409 },
        );
      }
    }

    if (capitalizedBody?.affiliation?.academic_information?.student_id) {
      const studentId =
        capitalizedBody.affiliation.academic_information.student_id;
      const existingProfile = await Profile.findOne({
        "affiliation.academic_information.student_id": studentId,
      });
      if (existingProfile) {
        return NextResponse.json(
          {
            success: false,
            error: "This Student ID is already registered in the system",
          },
          { status: 409 },
        );
      }

      const existingUsername = await UserAuth.findOne({
        username: studentId.toUpperCase(),
      }).lean();
      if (existingUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "This Student ID is already registered in the system",
          },
          { status: 409 },
        );
      }
    }

    if (capitalizedBody?.affiliation?.employment_information?.employee_id) {
      const employeeId =
        capitalizedBody.affiliation.employment_information.employee_id;
      const existingProfile = await Profile.findOne({
        "affiliation.employment_information.employee_id": employeeId,
      });
      if (existingProfile) {
        return NextResponse.json(
          {
            success: false,
            error: "This Employee ID is already registered in the system",
          },
          { status: 409 },
        );
      }

      const existingUsername = await UserAuth.findOne({
        username: employeeId,
      }).lean();
      if (existingUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "This Employee ID is already registered in the system",
          },
          { status: 409 },
        );
      }
    }

    if (personal.religion) {
      const allowedReligions = [
        "Roman Catholic",
        "Iglesia ni Cristo",
        "Iglesia Independencia Filipina",
        "Protestant",
        "Born Again Christian",
        "Evangelical Christian",
        "Latter Day Saints",
        "Members Church of God International (MGCI)",
        "Other",
      ];
      personal.religion =
        allowedReligions.find(
          (r) => r.toLowerCase() === personal.religion.toLowerCase(),
        ) || personal.religion;
    }
    if (personal.bloodType) {
      const allowedBloodTypes = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
        "Unknown",
      ];
      personal.bloodType =
        allowedBloodTypes.find(
          (b) => b.toLowerCase() === personal.bloodType.toLowerCase(),
        ) || personal.bloodType;
    }

    const profilePayload = { ...capitalizedBody, personal };
    delete profilePayload.personal_information;

    const token = req.cookies.get("auth_token")?.value;
    let createdByUserId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        createdByUserId = decoded.id;
      } catch {}
    }

    const profilePayloadWithAudit = {
      ...profilePayload,
      created_by: createdByUserId,
    };

    const email = capitalizedBody?.contact?.email;
    if (email) {
      const existingEmail = await Profile.findOne({ "contact.email": email });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: "This email is already registered in the system",
          },
          { status: 409 },
        );
      }
    }

    const role = "User";

    const username = await generateUniqueUsername(
      personal,
      capitalizedBody.affiliation,
      capitalizedBody.contact,
    );
    const tempPassword = generateTempPassword();

    const session = await mongoose.startSession();
    let profile;
    try {
      await session.withTransaction(async () => {
        profile = await Profile.create([profilePayloadWithAudit], { session });

        await UserAuth.create(
          [
            {
              personal_info_id: profile[0]._id,
              username,
              password: tempPassword,
              role,
            },
          ],
          { session },
        );

        const activeTermSetting = await SystemSetting.findOne({
          key: "active_term",
        }).lean();
        if (activeTermSetting?.value) {
          const { school_year, semester } = activeTermSetting.value;
          if (school_year && semester) {
            await ProfileTerm.create(
              [
                {
                  profile_id: profile[0]._id,
                  school_year,
                  semester,
                  affiliation: profile[0].affiliation || {},
                },
              ],
              { session },
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }

    const createdProfile = profile[0];

    cacheDelPrefix("profile:list:");

    await logActivity({
      req,
      action: "PROFILE_CREATE",
      description: `Profile created for ${personal.first_name} ${personal.last_name} (role: ${role})`,
      resource_type: "profile",
      resource_id: createdProfile._id,
      severity: "info",
    });

    if (global.io) {
      global.io.emit("profile:new", createdProfile);
      console.log("✅ Emitted profile:new", createdProfile._id);
    }

    return NextResponse.json(
      {
        success: true,
        profile_id: createdProfile._id,
        username,
        temporary_password: tempPassword,
        role,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req) {
  try {
    const { error, status } = await requireAdmin(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const usersToDelete = await UserAuth.find({ role: "User" }).select(
      "personal_info_id",
    );
    const profileIds = usersToDelete.map((u) => u.personal_info_id);

    await Profile.deleteMany({ _id: { $in: profileIds } });
    await UserAuth.deleteMany({ role: "User" });

    cacheDelPrefix("profile:list:");

    await logActivity({
      req,
      action: "BULK_PROFILE_DELETE",
      description: `Bulk deleted ${usersToDelete.length} user(s) with role "User"`,
      resource_type: "profile",
      severity: "critical",
      metadata: { count: usersToDelete.length },
    });

    if (global.io) {
      global.io.emit("profile:deleted");
      console.log("✅ Emitted profile:deleted for User role only");
    }

    return NextResponse.json({
      status: "success",
      message: `Deleted ${usersToDelete.length} users with role "User".`,
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
