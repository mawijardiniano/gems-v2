import { NextResponse } from "next/server";
import { requireOrgStructureEditor } from "@/data/lib/officialsAccess";

/**
 * POST /api/university-officials/copy-forward — retired.
 *
 * This cloned one academic year's UniversityOfficial snapshot into the next.
 * Officials are OfficialTerm rows now: an open term already appears on every
 * year after it starts, so there is nothing to copy. The route read the
 * retired snapshot collection (empty since the term migration) and could only
 * ever answer "No roster found". It answers 410 so a stale client gets a clear
 * message instead.
 */
export async function POST(req) {
  const { error, status } = await requireOrgStructureEditor(req);
  if (error) return NextResponse.json({ error }, { status });

  return Response.json(
    {
      success: false,
      error:
        "Copy from previous year is no longer needed: officials stay on the chart every year until their seat is vacated.",
    },
    { status: 410 },
  );
}
