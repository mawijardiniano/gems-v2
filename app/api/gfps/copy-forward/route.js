import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import UniversityOfficial from "@/models/universityOfficials";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { GFPS_SECTION_KEYS } from "@/lib/gfpsServer";
import { normalizeAcademicYear } from "@/lib/academicYear";

const seatKey = (o) => `${o?.header || ""}::${o?.name || o?.position || o?.title || ""}`;

/**
 * POST /api/gfps/copy-forward { from, to }
 * Clones the GFPS committee into an empty target AY, remapping every
 * member.official from the old year's UniversityOfficial _ids to the new
 * year's _ids by seat key. Requires the officials roster to be copied first.
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
    GFPS.findOne({ academic_year: from }).lean(),
    GFPS.countDocuments({ academic_year: to }),
  ]);

  if (!source) {
    return Response.json(
      { success: false, error: `No GFPS found for AY ${from}` },
      { status: 404 },
    );
  }
  if (targetCount > 0) {
    return Response.json(
      { success: false, error: `AY ${to} already has a GFPS record` },
      { status: 409 },
    );
  }

  const [fromOfficials, toOfficials] = await Promise.all([
    UniversityOfficial.find({ academic_year: from }).lean(),
    UniversityOfficial.find({ academic_year: to }).lean(),
  ]);

  if (!toOfficials.length) {
    return Response.json(
      {
        success: false,
        error: `Copy the officials roster to AY ${to} first (POST /api/university-officials/copy-forward)`,
      },
      { status: 409 },
    );
  }

  const fromById = new Map(fromOfficials.map((o) => [String(o._id), o]));
  const toBySeat = new Map(toOfficials.map((o) => [seatKey(o), o]));

  const unmapped = [];
  const remapMember = (member = {}) => {
    const oldOfficial = fromById.get(String(member.official || ""));
    const target = oldOfficial ? toBySeat.get(seatKey(oldOfficial)) : null;
    if (!target) {
      unmapped.push(String(member.official || "unknown"));
      return { ...member, official: null };
    }
    return { ...member, official: target._id };
  };
  const remapSection = (section) => {
    if (!section) return section;
    if (Array.isArray(section)) return section.map(remapMember);
    if (section.official) return remapMember(section);
    if (Array.isArray(section.members)) {
      return { ...section, members: section.members.map(remapMember) };
    }
    return section;
  };

  const payload = { academic_year: to };
  GFPS_SECTION_KEYS.forEach((key) => {
    if (source[key] !== undefined) payload[key] = remapSection(source[key]);
  });

  const doc = await GFPS.create(payload);

  await logActivity({
    req,
    action: "GFP_COPY_FORWARD",
    description: `GFPS copied from AY ${from} to AY ${to}`,
    resource_type: "gfps",
    resource_id: doc._id,
    severity: "info",
    metadata: { from, to, unmapped: unmapped.length },
  });

  return Response.json({
    success: true,
    data: {
      from,
      to,
      _id: doc._id,
      unmapped: [...new Set(unmapped)],
    },
  });
}
