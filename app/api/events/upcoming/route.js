import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { cacheOrSet } from "@/lib/cache";

const UPCOMING_LIST_CACHE_TTL = 60 * 1000; // 60 seconds

const PUBLIC_FIELDS =
  "_id title description number_of_days start_dates end_dates venue type_of_activity organizing_office_unit eligibility_criteria event_poster.url";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 24)
        : null;

    const cacheKey = `events:list:upcoming:${limit ?? "all"}`;

    const events = await cacheOrSet(
      cacheKey,
      async () => {
        const docs = await Event.find({ status: "active" })
          .select(PUBLIC_FIELDS)
          .sort({ "start_dates.0": 1 })
          .lean();

        const now = Date.now();
        const upcoming = docs.filter((event) => {
          const endDates = event.end_dates || [];
          const lastEnd = endDates[endDates.length - 1];
          return lastEnd ? new Date(lastEnd).getTime() >= now : false;
        });

        return limit ? upcoming.slice(0, limit) : upcoming;
      },
      UPCOMING_LIST_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", data: events });
  } catch (error) {
    console.error("GET /api/events/upcoming error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}