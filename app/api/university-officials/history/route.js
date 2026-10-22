import { connectDB } from "@/lib/db";
import Position from "@/models/position";
import ActivityLog from "@/models/activity_log";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  seatHistoryPipeline,
  toHistoryEntry,
  academicYearsFromTermStarts,
} from "@/lib/officialsTermsQuery";

/**
 * GET /api/university-officials/history?header=&name=
 * The tenure trail of one seat: everyone who has held it, earliest first.
 *
 * WHY THIS READS THE TERM MODEL
 * This endpoint used to read the `universityofficials` snapshot collection,
 * which was migrated into OfficialTerm and emptied — so it answered `roster: []`
 * for every seat, and a seat with terms but no snapshots showed an empty trail.
 * Terms carry real `startDate`/`endDate` spans, which is exactly what a timeline
 * needs: a predecessor's closed term and the current open one appear in order,
 * from data rather than from an activity-log reconstruction.
 *
 * The seat is addressed by `{ header, name }` because that is how the chart
 * identifies it; the caller has no Position id to hand.
 */
export async function GET(req) {
  /* Authentication only. This response carries no vault-backed field — a term
     stores the holder directly as `official_text` — so unlike the roster route
     there is no role-dependent redaction to apply. */
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const header = searchParams.get("header") || "";
  const position =
    searchParams.get("name") ||
    searchParams.get("position") ||
    searchParams.get("title") ||
    "";
  const onlyYear = searchParams.get("academic_year") || "";

  if (!header || !position.trim()) {
    return Response.json(
      { success: false, error: "Missing header or seat" },
      { status: 400 },
    );
  }

  const seat = { header, name: position.trim() };
  const pipeline = seatHistoryPipeline(seat);

  /* The seat must exist as a Position before a trail can be assembled: terms
     point at positions, so a typo'd seat name would otherwise look like a seat
     that was never held. This also tells the client whether the seat itself is
     real, which the UI uses to distinguish "no holder yet" from "no such seat". */
  const seatExists = Boolean(
    await Position.exists({ header: seat.header, name: seat.name }),
  );

  const rows = pipeline ? await ActivityLog.db.collection("positions").aggregate(pipeline).toArray() : [];
  const trail = rows.map(toHistoryEntry).filter(Boolean);

  /* Mid-year reassigns recorded by the write path. A term's dates show the
     spans; these show the handovers *inside* a year, which a span alone cannot
     express (a term that was reopened, a holder replaced in December). */
  const logs = await ActivityLog.find({
    resource_type: "university_official",
    action: { $in: ["OFFICIAL_ASSIGN", "OFFICIAL_UPDATE", "OFFICIAL_VACATE"] },
    "metadata.header": seat.header,
    "metadata.name": seat.name,
  })
    .sort({ createdAt: 1 })
    .lean();

  return Response.json({
    success: true,
    data: {
      seat,
      /* `seatExists` is false when the name has no Position at all, which is a
         different situation from a Position nobody has ever filled. */
      seat_exists: seatExists,
      roster: onlyYear
        ? trail.filter((entry) => entry.academic_year === onlyYear)
        : trail,
      /* Years this seat is answerable for, so a caller can offer a picker
         without asking the roster endpoint for the whole chart. */
      years: academicYearsFromTermStarts(trail.map((entry) => entry.startDate)),
      turnover: logs.map((l) => ({
        _id: l._id,
        action: l.action,
        description: l.description,
        createdAt: l.createdAt,
        academic_year: l.metadata?.academic_year || null,
        prev_name: l.metadata?.prev_name || null,
        new_name: l.metadata?.new_name || null,
      })),
    },
  });
}

