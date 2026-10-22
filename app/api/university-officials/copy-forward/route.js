import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { normalizeAcademicYear } from "@/lib/academicYear";

/**
 * POST /api/university-officials/copy-forward { from, to }
 * Clones every assignment from one AY into an empty target AY (new _ids).
 * Past years are never modified.
 */
export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const from = normalizeAcademicYear(body?.from);
  const to = normalizeAcademicYear(body?.to);

  if (!from || !to) {
    return Response.json(
      { success: false, error: "from and to must be valid academic years" },
      { status: 400 },
    );
  }
  if (from === to) {
    return Response.json(
      { success: false, error: "from and to must be different years" },
      { status: 400 },
    );
  }

  const [source, targetCount] = await Promise.all([
    UniversityOfficial.find({ academic_year: from }).lean(),
    UniversityOfficial.countDocuments({ academic_year: to }),
  ]);

  if (!source.length) {
    return Response.json(
      { success: false, error: `No roster found for AY ${from}` },
      { status: 404 },
    );
  }
  if (targetCount > 0) {
    return Response.json(
      { success: false, error: `AY ${to} already has ${targetCount} assignment(s)` },
      { status: 409 },
    );
  }

  const docs = source.map((d) => ({
    academic_year: to,
    header: d.header,
    name: d.name,
    official: d.official,
    official_text: d.official_text,
  }));

  let inserted = [];
  try {
    inserted = await UniversityOfficial.insertMany(docs, { ordered: false });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 400 },
    );
  }

  await logActivity({
    req,
    action: "OFFICIAL_COPY_FORWARD",
    description: `Copied ${inserted.length} official(s) from AY ${from} to AY ${to}`,
    resource_type: "university_official",
    severity: "info",
    metadata: { from, to, copied: inserted.length },
  });

  return Response.json({
    success: true,
    data: { from, to, copied: inserted.length },
  });
}
