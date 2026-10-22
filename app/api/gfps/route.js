import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import UniversityOfficial from "@/models/universityOfficials";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  GFPS_SECTION_KEYS,
  UNIVERSITY_OFFICIALS_POPULATE,
  makeFilterHelpers,
  mergeMembers,
  normalizeSectionOfficials,
} from "@/lib/gfpsServer";
import {
  hydrateUniversityOfficialNames,
  stripOfficialVaultRefs,
} from "@/lib/userPopulate";
import {
  normalizeAcademicYear,
  resolveAcademicYear,
  sortAcademicYearsDesc,
} from "@/lib/academicYear";

async function getActiveTermYear() {
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    return normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { user, error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const activeYear = await getActiveTermYear();
  const academicYear = resolveAcademicYear({
    query: searchParams.get("academic_year"),
    activeTerm: activeYear,
  });

  // Only same-year officials may resolve GFPS member links. Mixing years
  // would null out details or leak people across snapshots.
  const universityOfficials = await UniversityOfficial.find({
    academic_year: academicYear,
  })
    .populate(UNIVERSITY_OFFICIALS_POPULATE)
    .lean();

  /* Officials are linked to user accounts; the real name lives in the vault, so
     the roster would render every seat blank once the legacy columns are
     stripped. Hydrating here covers both the details lookup below and the
     names the response carries - gated on the caller's role, since the unmasked
     name is PII. */
  /* Both helpers return the value to use: the hydrator works on plain-object
     copies, and the scrubber drops the pointer during serialization. */
  const hydratedOfficials = await hydrateUniversityOfficialNames(
    universityOfficials,
    user?.role,
  );
  const safeOfficials = stripOfficialVaultRefs(hydratedOfficials, user?.role);

  const { filterSectionWithDetails } = makeFilterHelpers(safeOfficials);

  const years = sortAcademicYearsDesc(await GFPS.distinct("academic_year"));
  if (!years.includes(academicYear)) years.unshift(academicYear);

  let gfps = await GFPS.find({ academic_year: academicYear }).lean();

  // Fallback for installs that predate the AY migration: surface the untagged
  // legacy committee instead of an empty page.
  let legacy = false;
  if (!gfps.length) {
    const untagged = await GFPS.find({
      $or: [
        { academic_year: { $exists: false } },
        { academic_year: null },
        { academic_year: "" },
      ],
    }).lean();
    if (untagged.length) {
      gfps = untagged;
      legacy = true;
    }
  }

  gfps = gfps.map((doc) => ({
    ...doc,
    ...Object.fromEntries(
      GFPS_SECTION_KEYS.map((key) => [
        key,
        filterSectionWithDetails(doc[key]),
      ]),
    ),
  }));

  return Response.json({
    success: true,
    data: gfps,
    academic_year: academicYear,
    active_year: activeYear,
    years,
    legacy,
  });
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const academicYear = normalizeAcademicYear(body?.academic_year);
  if (!academicYear) {
    return Response.json(
      { success: false, error: "Missing or invalid academic_year (e.g. 2025-2026)" },
      { status: 400 },
    );
  }

  GFPS_SECTION_KEYS.forEach((key) => {
    if (body[key]) body[key] = normalizeSectionOfficials(body[key]);
  });

  let doc = await GFPS.findOne({ academic_year: academicYear });
  const isCreate = !doc;

  if (!doc) {
    doc = await GFPS.create({ ...body, academic_year: academicYear });
  } else {
    if (body.chairOrHeadOfAgency) {
      doc.chairOrHeadOfAgency = body.chairOrHeadOfAgency;
    }

    if (body.executiveCommittee?.members) {
      doc.executiveCommittee ||= { members: [] };
      mergeMembers(doc.executiveCommittee.members, body.executiveCommittee.members);
    }

    if (body.technicalWorkingGroup?.members) {
      doc.technicalWorkingGroup ||= { members: [] };
      mergeMembers(doc.technicalWorkingGroup.members, body.technicalWorkingGroup.members);
    }

    if (body.secretariat) {
      mergeMembers(doc.secretariat, body.secretariat);
    }

    await doc.save();
  }

  await logActivity({
    req,
    action: isCreate ? "GFP_CREATE" : "GFP_UPDATE",
    description: isCreate
      ? `GFPS structure created (AY ${academicYear})`
      : `GFPS structure updated (AY ${academicYear})`,
    resource_type: "gfps",
    resource_id: doc._id,
    severity: "info",
    metadata: { academic_year: academicYear },
  });

  return Response.json({ success: true, data: doc });
}

export async function DELETE(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const academicYear = normalizeAcademicYear(searchParams.get("academic_year"));
  if (!academicYear) {
    return Response.json(
      { success: false, error: "academic_year query is required" },
      { status: 400 },
    );
  }

  // Scoped delete: never wipe other years' committees.
  await GFPS.deleteMany({ academic_year: academicYear });
  return Response.json({ success: true });
}
