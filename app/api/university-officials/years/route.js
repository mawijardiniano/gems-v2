import { connectDB } from "@/lib/db";
import OfficialTerm from "@/models/officialTerm";
import SystemSetting from "@/models/systemSetting";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  normalizeAcademicYear,
  sortAcademicYearsDesc,
} from "@/lib/academicYear";
import { academicYearsFromTermStarts } from "@/lib/officialsTermsQuery";

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

  /* Officials years come from the term model, which stores a tenure span rather
     than a per-year snapshot: the distinct `startDate` values map to the years
     the appointments opened in. GFPS still stores a year tag, so both are
     unioned and the dropdown never misses one side. */
  const [termStarts, gfpsYears] = await Promise.all([
    OfficialTerm.distinct("startDate"),
    GFPS.distinct("academic_year"),
  ]);
  const officialYears = academicYearsFromTermStarts(termStarts);
  const years = sortAcademicYearsDesc([...officialYears, ...gfpsYears]);
  if (activeYear && !years.includes(activeYear)) years.unshift(activeYear);

  /* Terms with no start date cannot be attributed to a year. The migration set
     startDate on every row, so this is a health check: a non-zero count means a
     term was written outside the model's constraints. */
  const legacyCount = await OfficialTerm.countDocuments({
    $or: [{ startDate: { $exists: false } }, { startDate: null }],
  });

  return Response.json({
    success: true,
    data: years,
    active_year: activeYear,
    legacy_count: legacyCount,
  });
}
