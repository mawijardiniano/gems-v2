import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { findSeatByParts } from "@/lib/universityOfficialsConstants";
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
  const { header, title, unit = "", name, academic_year } = body || {};

  if (!header || !title || !name) {
    return Response.json(
      { success: false, error: "Missing header, title, or name" },
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

  const seat = findSeatByParts({ header, title, unit });
  if (!seat) {
    return Response.json(
      {
        success: false,
        error:
          "Unknown seat — it is not part of the MarSU offices and administrative designations",
      },
      { status: 400 },
    );
  }

  const existing = await UniversityOfficial.findOne({
    academic_year: academicYear,
    header: seat.header,
    title: seat.title,
    unit: seat.unit,
  });

  if (existing) {
    return Response.json(
      { success: false, error: `Seat is already filled for AY ${academicYear}` },
      { status: 409 },
    );
  }

  try {
    const doc = await UniversityOfficial.create({
      academic_year: academicYear,
      header: seat.header,
      title: seat.title,
      unit: seat.unit,
      name,
    });

    await logActivity({
      req,
      action: "OFFICIAL_ASSIGN",
      description: `Official assigned to "${seat.position}" (AY ${academicYear})`,
      resource_type: "university_official",
      resource_id: doc._id,
      severity: "info",
      metadata: {
        academic_year: academicYear,
        header: seat.header,
        title: seat.title,
        unit: seat.unit,
      },
    });

    await doc.populate(POPULATE);
    return Response.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate ? "Seat is already filled" : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}
