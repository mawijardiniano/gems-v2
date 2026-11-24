import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import { requireAuth } from "@/data/lib/auth";
import { canViewGpbReports } from "@/data/lib/roleAccess";
import GFPS from "@/models/gfps";
import { ayFromYear, buildGfpsCompositionPdf } from "@/data/lib/orgStructureReports";

/**
 * GET /api/reports/gfps-composition?year=2026
 *
 * GFPS composition for AY 2026-2027: the constituting issuance, members by
 * sex per section, vacant memorandum seats, and the member list. Same
 * audience as the other university-wide reports.
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
    const gfps = await GFPS.findOne({ academic_year: ayFromYear(year) }).lean();
    if (!gfps) {
      return NextResponse.json(
        { message: `No GFPS recorded for AY ${ayFromYear(year)}.` },
        { status: 404 },
      );
    }

    const buffer = buildGfpsCompositionPdf({ year, gfps });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gfps-composition-${year}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GFPS composition report failed:", err);
    return NextResponse.json({ message: "Failed to generate the GFPS composition report." }, { status: 500 });
  }
}
