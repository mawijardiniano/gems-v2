import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { normalizeAcademicYear } from "@/lib/academicYear";

const MISSING = {
  $or: [
    { academic_year: { $exists: false } },
    { academic_year: null },
    { academic_year: "" },
  ],
};

/**
 * POST /api/university-officials/assign-legacy { to }
 * One-click rescue for pre-migration installs: tags untagged legacy
 * officials + GFPS docs to the selected year in place. Refuses when the
 * target year already has data (use copy-forward instead).
 */
export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const to = normalizeAcademicYear(body?.to);
  if (!to) {
    return Response.json(
      { success: false, error: "to must be a valid academic year" },
      { status: 400 },
    );
  }

  const [legacyOfficials, legacyGfps, targetOfficials, targetGfps] =
    await Promise.all([
      UniversityOfficial.countDocuments(MISSING),
      GFPS.countDocuments(MISSING),
      UniversityOfficial.countDocuments({ academic_year: to }),
      GFPS.countDocuments({ academic_year: to }),
    ]);

  if (!legacyOfficials && !legacyGfps) {
    return Response.json(
      { success: false, error: "No untagged legacy records found" },
      { status: 404 },
    );
  }
  if (targetOfficials || targetGfps) {
    return Response.json(
      {
        success: false,
        error: `AY ${to} already has data; use copy-forward instead`,
      },
      { status: 409 },
    );
  }

  const [offResult, gfpsResult] = await Promise.all([
    legacyOfficials
      ? UniversityOfficial.updateMany(MISSING, { $set: { academic_year: to } })
      : { modifiedCount: 0 },
    legacyGfps
      ? GFPS.updateMany(MISSING, { $set: { academic_year: to } })
      : { modifiedCount: 0 },
  ]);

  await logActivity({
    req,
    action: "OFFICIAL_ASSIGN_LEGACY",
    description: `Legacy records assigned to AY ${to}`,
    resource_type: "university_official",
    severity: "info",
    metadata: {
      to,
      officials: offResult.modifiedCount,
      gfps: gfpsResult.modifiedCount,
    },
  });

  return Response.json({
    success: true,
    data: {
      to,
      officials: offResult.modifiedCount,
      gfps: gfpsResult.modifiedCount,
    },
  });
}
