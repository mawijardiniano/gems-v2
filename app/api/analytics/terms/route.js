import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ProfileTerm from "@/models/profileTerm";
import { cacheOrSet } from "@/lib/cache";

const TERMS_CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    await connectDB();

    const result = await cacheOrSet(
      "analytics:terms",
      async () => {
        const terms = await ProfileTerm.aggregate([
          {
            $group: {
              _id: { school_year: "$school_year", semester: "$semester" },
            },
          },
          { $sort: { "_id.school_year": -1, "_id.semester": -1 } },
          {
            $project: {
              _id: 0,
              school_year: "$_id.school_year",
              semester: "$_id.semester",
            },
          },
        ]);

        const schoolYears = [
          ...new Set(terms.map((t) => t.school_year).filter(Boolean)),
        ].sort((a, b) => b.localeCompare(a));

        return { terms, schoolYears };
      },
      TERMS_CACHE_TTL,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch terms:", err);
    return NextResponse.json(
      { message: "Failed to fetch terms" },
      { status: 500 },
    );
  }
}
