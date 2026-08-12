import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import { cacheOrSet } from "@/lib/cache";

const SUMMARY_CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const collegeFilter = url.searchParams.get("college")?.trim();
    const schoolYear = url.searchParams.get("school_year")?.trim();
    const semester = url.searchParams.get("semester")?.trim();


    const cacheKey = `analytics:summary:${collegeFilter || "all"}:${schoolYear || "all"}:${semester || "all"}`;

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

          termProfileIds = new Set(matchingTerms.map((t) => String(t.profile_id)));
        }

        const pipeline = [];

        pipeline.push({
          $lookup: {
            from: GemsProfile.collection.name,
            localField: "personal_info_id",
            foreignField: "_id",
            as: "personal_info_id",
          },
        });

        pipeline.push({
          $unwind: { path: "$personal_info_id", preserveNullAndEmptyArrays: true },
        });

        if (collegeFilter) {
          pipeline.push({
            $match: {
              $or: [
                {
                  "personal_info_id.affiliation.academic_information.college":
                    collegeFilter,
                },
                {
                  "personal_info_id.affiliation.employment_information.office":
                    collegeFilter,
                },
              ],
            },
          });
        }

        if (termProfileIds) {
          const termProfileObjectIds = [...termProfileIds]
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

          pipeline.push({
            $match: {
              "personal_info_id._id": { $in: termProfileObjectIds },
            },
          });
        }

        const users = await UserAuth.aggregate(pipeline);

        if (!users || users.length === 0) {
          return {
            error: true,
            message:
              collegeFilter || schoolYear || semester
                ? "No users found for selected filters"
                : "No users found for summary",
            status: 404,
          };
        }

        const employees = users.filter(
          (u) => u.personal_info_id?.personal?.currentStatus === "Employee",
        );
        const students = users.filter(
          (u) => u.personal_info_id?.personal?.currentStatus === "Student",
        );

        const employeeCounts = {};
        const employeeTotals = { Male: 0, Female: 0, Unspecified: 0 };

        employees.forEach((user) => {
          const status =
            user.personal_info_id?.affiliation?.employment_information
              ?.employment_appointment_status || "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";

          if (!employeeCounts[status]) {
            employeeCounts[status] = { Male: 0, Female: 0, Unspecified: 0 };
          }

          employeeCounts[status][sex] = (employeeCounts[status][sex] || 0) + 1;

          if (!employeeTotals[sex]) employeeTotals[sex] = 0;
          employeeTotals[sex] += 1;
        });

        const employeeList = Object.entries(employeeCounts).map(
          ([status, counts]) => {
            const male = counts.Male || 0;
            const female = counts.Female || 0;
            const unspecified = counts.Unspecified || 0;
            const total = male + female + unspecified;
            return { status, male, female, unspecified, total };
          },
        );

        const courseYearCounts = {};
        const studentTotals = { Male: 0, Female: 0, Unspecified: 0 };

        students.forEach((user) => {
          const course =
            user.personal_info_id?.affiliation?.academic_information?.course ||
            "Unspecified";
          const yearLevel =
            user.personal_info_id?.affiliation?.academic_information?.year_level ||
            "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";

          if (!courseYearCounts[course]) {
            courseYearCounts[course] = {};
          }
          if (!courseYearCounts[course][yearLevel]) {
            courseYearCounts[course][yearLevel] = {
              Male: 0,
              Female: 0,
              Unspecified: 0,
            };
          }

          courseYearCounts[course][yearLevel][sex] =
            (courseYearCounts[course][yearLevel][sex] || 0) + 1;

          if (!studentTotals[sex]) studentTotals[sex] = 0;
          studentTotals[sex] += 1;
        });

        const courseYearList = [];
        Object.entries(courseYearCounts).forEach(([course, yearMap]) => {
          Object.entries(yearMap).forEach(([yearLevel, counts]) => {
            const male = counts.Male || 0;
            const female = counts.Female || 0;
            const unspecified = counts.Unspecified || 0;
            const total = male + female + unspecified;
            courseYearList.push({
              course,
              yearLevel,
              male,
              female,
              unspecified,
              total,
            });
          });
        });

        const officeSexCounts = {};
        employees.forEach((user) => {
          const office =
            user.personal_info_id?.affiliation?.employment_information?.office ||
            "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";
          if (!officeSexCounts[office])
            officeSexCounts[office] = { Male: 0, Female: 0, Unspecified: 0 };
          officeSexCounts[office][sex] = (officeSexCounts[office][sex] || 0) + 1;
        });
        const officeSexList = [];
        Object.entries(officeSexCounts).forEach(([office, counts]) => {
          if (office === "Unspecified") return;
          if (counts.Male > 0)
            officeSexList.push({ office, sex: "Male", total: counts.Male });
          if (counts.Female > 0)
            officeSexList.push({ office, sex: "Female", total: counts.Female });
        });

        const collegeSexCounts = {};
        students.forEach((user) => {
          const college =
            user.personal_info_id?.affiliation?.academic_information?.college ||
            "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";
          if (!collegeSexCounts[college])
            collegeSexCounts[college] = { Male: 0, Female: 0, Unspecified: 0 };
          collegeSexCounts[college][sex] =
            (collegeSexCounts[college][sex] || 0) + 1;
        });
        const collegeSexList = [];
        Object.entries(collegeSexCounts).forEach(([college, counts]) => {
          if (college === "Unspecified") return;
          if (counts.Male > 0)
            collegeSexList.push({ college, sex: "Male", total: counts.Male });
          if (counts.Female > 0)
            collegeSexList.push({ college, sex: "Female", total: counts.Female });
        });

        const yearLevelSexCounts = {};
        students.forEach((user) => {
          const yearLevel =
            user.personal_info_id?.affiliation?.academic_information?.year_level ||
            "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";
          if (!yearLevelSexCounts[yearLevel])
            yearLevelSexCounts[yearLevel] = { Male: 0, Female: 0, Unspecified: 0 };
          yearLevelSexCounts[yearLevel][sex] =
            (yearLevelSexCounts[yearLevel][sex] || 0) + 1;
        });
        const yearLevelSexList = [];
        Object.entries(yearLevelSexCounts).forEach(([yearLevel, counts]) => {
          if (yearLevel === "Unspecified") return;
          if (counts.Male > 0)
            yearLevelSexList.push({ yearLevel, sex: "Male", total: counts.Male });
          if (counts.Female > 0)
            yearLevelSexList.push({
              yearLevel,
              sex: "Female",
              total: counts.Female,
            });
        });

        return {
          employees: {
            appointmentStatus: employeeList,
            totals: employeeTotals,
            officeSex: officeSexList,
          },
          students: {
            courseYear: courseYearList,
            totals: studentTotals,
            collegeSex: collegeSexList,
            yearLevelSex: yearLevelSexList,
          },
        };
      },
      SUMMARY_CACHE_TTL,
    );

    if (result?.error) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Summary generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate summary" },
      { status: 500 },
    );
  }
}