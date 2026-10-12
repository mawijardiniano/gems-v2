import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import SystemSetting from "@/models/systemSetting";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  normalizeAcademicYear,
  sortAcademicYearsDesc,
} from "@/lib/academicYear";

/** GET /api/university-officials/years -> ["2026-2027", ...] + active year. */
export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const [{ default: GFPS }, setting] = await Promise.all([
    import("@/models/gfps"),
    SystemSetting.findOne({ key: "active_term" }).lean(),
  ]);
  const activeYear = normalizeAcademicYear(setting?.value?.school_year);

  // Union both collections so the dropdown never misses one side's years.
  const [officialYears, gfpsYears] = await Promise.all([
    UniversityOfficial.distinct("academic_year"),
    GFPS.distinct("academic_year"),
  ]);
  const years = sortAcademicYearsDesc([...officialYears, ...gfpsYears]);
  if (activeYear && !years.includes(activeYear)) years.unshift(activeYear);

  const legacyCount = await UniversityOfficial.countDocuments({
    $or: [
      { academic_year: { $exists: false } },
      { academic_year: null },
      { academic_year: "" },
    ],
  });

  return Response.json({
    success: true,
    data: years,
    active_year: activeYear,
    legacy_count: legacyCount,
  });
}
