import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const collegeFilter = url.searchParams.get("college")?.trim();

    const users = await UserAuth.find({})
      .populate({
        path: "personal_info_id",
        model: GemsProfile,
        select: "personal gadData affiliation",
      })
      .lean();

    if (!users || users.length === 0) {
      return NextResponse.json(
        { message: "No users found for summary" },
        { status: 404 },
      );
    }

    const matchesCollege = (profile) => {
      if (!collegeFilter) return true;
      const academicCollege =
        profile?.affiliation?.academic_information?.college || "";
      const employmentOffice =
        profile?.affiliation?.employment_information?.office || "";
      return (
        academicCollege.toLowerCase() === collegeFilter.toLowerCase() ||
        employmentOffice.toLowerCase() === collegeFilter.toLowerCase()
      );
    };

    const filteredUsers = users.filter((user) =>
      matchesCollege(user.personal_info_id || {}),
    );

    if (!filteredUsers.length) {
      return NextResponse.json(
        {
          message: collegeFilter
            ? `No users found for college/office: ${collegeFilter}`
            : "No users found for summary",
        },
        { status: 404 },
      );
    }

    const employees = filteredUsers.filter(
      (u) => u.personal_info_id?.personal?.currentStatus === "Employee",
    );
    const students = filteredUsers.filter(
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

    return NextResponse.json(
      {
        employees: {
          appointmentStatus: employeeList,
          totals: employeeTotals,
        },
        students: {
          courseYear: courseYearList,
          totals: studentTotals,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Summary generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
