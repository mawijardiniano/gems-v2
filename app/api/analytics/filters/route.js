import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";

const FILTERS_CACHE_TTL = 30 * 1000;

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const result = await cacheOrSet(
      "analytics:filters",
      async () => {

        const colleges = await Profile.distinct(
          "affiliation.academic_information.college",
        );
        const offices = await Profile.distinct(
          "affiliation.employment_information.office",
        );
        const collegeOptions = [...new Set([...colleges, ...offices])]
          .filter(Boolean)
          .sort((a, b) => String(a).localeCompare(String(b)));

        const yearLevels = await Profile.distinct(
          "affiliation.academic_information.year_level",
        );
        const sexOptions = await Profile.distinct("gadData.sexAtBirth");
        const employmentStatuses = await Profile.distinct(
          "affiliation.employment_information.employment_status",
        );
        const appointmentStatuses = await Profile.distinct(
          "affiliation.employment_information.employment_appointment_status",
        );

        const schoolYears = [...new Set(await ProfileTerm.distinct("school_year"))]
          .filter(Boolean)
          .sort((a, b) => String(b).localeCompare(String(a)));
        const semesters = [...new Set(await ProfileTerm.distinct("semester"))]
          .filter(Boolean)
          .sort((a, b) => String(a).localeCompare(String(b)));

        return {
          collegeOptions,
          yearLevelOptions: yearLevels.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
          sexOptions: sexOptions.filter(Boolean),
          employmentStatuses: employmentStatuses.filter(Boolean),
          appointmentStatuses: appointmentStatuses.filter(Boolean),
          schoolYears,
          semesters,
        };
      },
      FILTERS_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", ...result });
  } catch (err) {
    console.error("GET /api/analytics/filters error:", err);
    return NextResponse.json(
      { status: "error", message: "Failed to load filter options" },
      { status: 500 },
    );
  }
}