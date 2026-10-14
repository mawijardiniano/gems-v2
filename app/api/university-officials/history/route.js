import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import ActivityLog from "@/models/activity_log";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { normalizeAcademicYear } from "@/lib/academicYear";

const POPULATE = {
  path: "name",
  model: "UserAuth",
  populate: { path: "personal_info_id", populate: { path: "personal" } },
};

/**
 * GET /api/university-officials/history?header=&position=
 * Timeline of who held one manually-encoded position across academic years
 * (roster docs), plus mid-year reassigns sourced from the activity log.
 */
export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const header = searchParams.get("header") || "";
  const position =
    searchParams.get("position") || searchParams.get("title") || "";
  const onlyYear = normalizeAcademicYear(searchParams.get("academic_year"));

  if (!header || !position.trim()) {
    return Response.json(
      { success: false, error: "Missing header or position" },
      { status: 400 },
    );
  }

  const rosterFilter = {
    header,
    position: position.trim(),
    ...(onlyYear ? { academic_year: onlyYear } : {}),
  };
  const roster = await UniversityOfficial.find(rosterFilter)
    .populate(POPULATE)
    .sort({ academic_year: -1 })
    .lean();

  // Mid-year turnover trail from OFFICIAL_UPDATE logs on these roster docs.
  const rosterIds = roster.map((d) => d._id);
  const logFilter = {
    resource_type: "university_official",
    action: { $in: ["OFFICIAL_ASSIGN", "OFFICIAL_UPDATE", "OFFICIAL_VACATE"] },
    ...(rosterIds.length ? { resource_id: { $in: rosterIds } } : { resource_id: null }),
  };
  const logs = rosterIds.length
    ? await ActivityLog.find(logFilter).sort({ createdAt: 1 }).lean()
    : [];

  return Response.json({
    success: true,
    data: {
      seat: {
        header,
        position: position.trim(),
      },
      roster,
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
