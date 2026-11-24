import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import { requireAuth } from "@/data/lib/auth";
import { canViewGpbReports } from "@/data/lib/roleAccess";
import OfficialTerm from "@/models/officialTerm";
import { rosterPipeline, toRosterRow } from "@/data/lib/officialsTermsQuery";
import { ayFromYear, buildLeadershipPdf } from "@/data/lib/orgStructureReports";

/**
 * GET /api/reports/leadership-sex?year=2026
 *
 * Leadership by sex for AY 2026-2027: University Officials seat holders when
 * the year opened (the same roster the officials chart shows), counted by sex
 * per office. Same audience as the other university-wide reports.
 */
export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    if (!canViewGpbReports(user?.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const year = Number(new URL(req.url).searchParams.get("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ message: "Valid academic year is required." }, { status: 400 });
    }

    await connectDB();
    const pipeline = rosterPipeline(ayFromYear(year));
    const rows = pipeline
      ? (await OfficialTerm.aggregate(pipeline)).map(toRosterRow).filter(Boolean)
      : [];

    const buffer = buildLeadershipPdf({ year, rows });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="leadership-by-sex-${year}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Leadership by sex report failed:", err);
    return NextResponse.json({ message: "Failed to generate the leadership report." }, { status: 500 });
  }
}
