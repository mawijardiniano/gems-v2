import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { HEADERS } from "@/lib/universityOfficialsConstants";
import {
  normalizeAcademicYear,
  resolveAcademicYear,
  sortAcademicYearsDesc,
} from "@/lib/academicYear";

const POPULATE = {
  path: "name",
  model: "UserAuth",
  populate: { path: "personal_info_id", populate: { path: "personal" } },
};

async function getActiveTermYear() {
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    return normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const activeYear = await getActiveTermYear();
  const academicYear = resolveAcademicYear({
    query: searchParams.get("academic_year"),
    activeTerm: activeYear,
  });

  const years = sortAcademicYearsDesc(
    await UniversityOfficial.distinct("academic_year"),
  );
  if (!years.includes(academicYear)) years.unshift(academicYear);

  let officials = await UniversityOfficial.find({ academic_year: academicYear })
    .populate(POPULATE)
    .sort({ header: 1, title: 1, unit: 1 });

  // Fallback for installs that predate the AY migration: surface untagged
  // legacy docs instead of an empty picker.
  let legacy = false;
  if (!officials.length) {
    const untagged = await UniversityOfficial.find({
      $or: [
        { academic_year: { $exists: false } },
        { academic_year: null },
        { academic_year: "" },
      ],
    })
      .populate(POPULATE)
      .sort({ header: 1, title: 1, unit: 1 });
    if (untagged.length) {
      officials = untagged;
      legacy = true;
    }
  }

  return Response.json({
    success: true,
    data: officials,
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
  const { header, title, position, unit = "", name, name_text = "", academic_year } = body || {};

  const positionText = String(position || title || "").trim();
  const nameText = String(name_text || "").trim();
  const nameId =
    name && mongoose.isValidObjectId(name) ? name : null;

  if (!header || !HEADERS.includes(header) || !positionText || (!nameId && !nameText)) {
    return Response.json(
      { success: false, error: "Missing office, position, or name (pick a user or type a name)" },
      { status: 400 },
    );
  }

  const academicYear = normalizeAcademicYear(academic_year);
  if (!academicYear) {
    return Response.json(
      { success: false, error: "Missing or invalid academic_year (e.g. 2025-2026)" },
      { status: 400 },
    );
  }

  const titleText = String(title || positionText).trim();
  const unitText = String(unit || "").trim();

  const existing = await UniversityOfficial.findOne({
    academic_year: academicYear,
    header,
    position: positionText,
  });

  if (existing) {
    return Response.json(
      { success: false, error: `Position is already assigned for AY ${academicYear}` },
      { status: 409 },
    );
  }

  try {
    const doc = await UniversityOfficial.create({
      academic_year: academicYear,
      header,
      title: titleText,
      position: positionText,
      unit: unitText,
      name: nameId,
      name_text: nameId ? "" : nameText,
    });

    await logActivity({
      req,
      action: "OFFICIAL_ASSIGN",
      description: `Official assigned to "${positionText}" (AY ${academicYear})`,
      resource_type: "university_official",
      resource_id: doc._id,
      severity: "info",
      metadata: {
        academic_year: academicYear,
        header,
        position: positionText,
      },
    });

    await doc.populate(POPULATE);
    return Response.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate ? "Position is already assigned" : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}
