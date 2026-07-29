import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import SystemSetting from "@/models/systemSetting";
import UserAuth from "@/models/user";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/activityLog";

const JWT_SECRET = process.env.JWT_SECRET;

async function generateUniqueUsername(personal, affiliation) {
  const isStudent = personal?.currentStatus === "Student";
  const isEmployee = personal?.currentStatus === "Employee";

  const candidates = [];

  if (isStudent) {
    const studentId = affiliation?.academic_information?.student_id;
    if (studentId) {
      candidates.push(studentId);
    }
  }

  if (isEmployee) {
    const firstName = personal?.first_name || "";
    const lastName = personal?.last_name || "";
    if (firstName && lastName) {
     
      const combined =
        firstName.charAt(0).toUpperCase() +
        firstName.slice(1).toLowerCase() +
        lastName.charAt(0).toUpperCase() +
        lastName.slice(1).toLowerCase();
      candidates.push(combined);
    }
  }

  const first = personal?.first_name || "";
  if (first) {
    candidates.push(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase());
  }

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const candidate of uniqueCandidates) {
    const exists = await UserAuth.findOne({ username: candidate }).lean();
    if (!exists) {
      return candidate;
    }
  }

  // Fallback: generate a unique username with random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 10).toLowerCase();
  let fallback = `user${randomSuffix}`;
  let counter = 1;
  while (await UserAuth.findOne({ username: fallback }).lean()) {
    fallback = `user${randomSuffix}${counter}`;
    counter += 1;
  }
  return fallback;
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

function capitalizeObjectStrings(obj) {
  if (!obj) return obj;
  const newObj = { ...obj };
  for (const key in newObj) {
    if (typeof newObj[key] === "string") {
      newObj[key] = capitalizeWords(newObj[key]);
    }
  }
  return newObj;
}

export async function GET(req) {
  try {
    await connectDB();

    const users = await UserAuth.find({}).populate("personal_info_id").lean();

    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        decoded = null;
      }
    }

    let scopedUsers = users;
    if (decoded?.assignedCollege) {
      scopedUsers = users.filter((u) => {
        const aff = u.personal_info_id?.affiliation || {};
        const acad = aff.academic_information || {};
        const emp = aff.employment_information || {};
        return (
          acad?.college === decoded.assignedCollege ||
          emp?.office === decoded.assignedCollege
        );
      });
    }

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

    const usersNoPassword = filteredUsers.map((u) => {
      const { password, ...rest } = u;
      return rest;
    });
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
    await connectDB();

    const body = await req.json();

    let personal = body.personal || body.personal_information;
    personal = capitalizeObjectStrings(personal);
    if (!personal || !personal.first_name || !personal.last_name) {
      throw new Error(
        "personal.first_name and personal.last_name are required",
      );
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

    const profilePayload = { ...body, personal };
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

    const profile = await Profile.create(profilePayloadWithAudit);
    const role = body.role ? body.role : "User";

    const username = await generateUniqueUsername(personal, body.affiliation);
    const tempPassword = generateTempPassword();

    await UserAuth.create({
      personal_info_id: profile._id,
      username,
      password: tempPassword,
      role,
    });

    // Auto-create ProfileTerm from admin-configured active term
    try {
      const activeTermSetting = await SystemSetting.findOne({
        key: "active_term",
      }).lean();
      if (activeTermSetting?.value) {
        const { school_year, semester } = activeTermSetting.value;
        if (school_year && semester) {
          await ProfileTerm.create({
            profile_id: profile._id,
            school_year,
            semester,
            affiliation: profile.affiliation || {},
          });
        }
      }
    } catch (termError) {
      console.error("Failed to create ProfileTerm:", termError);
    }

    await logActivity({
      req,
      action: "PROFILE_CREATE",
      description: `Profile created for ${personal.first_name} ${personal.last_name} (role: ${role})`,
      resource_type: "profile",
      resource_id: profile._id,
      severity: "info",
    });

    if (global.io) {
      global.io.emit("profile:new", profile);
      console.log("✅ Emitted profile:new", profile._id);
    }

    return NextResponse.json(
      {
        success: true,
        profile_id: profile._id,
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

export async function DELETE() {
  try {
    await connectDB();

    const usersToDelete = await UserAuth.find({ role: "User" }).select(
      "personal_info_id",
    );
    const profileIds = usersToDelete.map((u) => u.personal_info_id);

    await Profile.deleteMany({ _id: { $in: profileIds } });
    await UserAuth.deleteMany({ role: "User" });

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