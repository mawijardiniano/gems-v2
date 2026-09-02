import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { normalizeOfficialId } from "@/lib/gfpsServer";

async function normalizeSectionOfficials(section) {
  if (!section) return section;

  if (Array.isArray(section)) {
    return Promise.all(section.map(normalizeSectionOfficials));
  }

  const normalized = { ...section };

  if (normalized.official) {
    normalized.official = await normalizeOfficialId(normalized.official);
  }
  if (normalized.chair) {
    normalized.chair = await normalizeSectionOfficials(normalized.chair);
  }
  if (normalized.members) {
    normalized.members = await Promise.all(
      (normalized.members || []).map(normalizeSectionOfficials),
    );
  }

  return normalized;
}

export async function PUT(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  try {
    const existing = await GFPS.findById(id);
    if (!existing) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    if (body.chairOrHeadOfAgency) {
      existing.chairOrHeadOfAgency = await normalizeSectionOfficials(
        body.chairOrHeadOfAgency,
      );
    }

    if (body.executiveCommittee) {
      const normalized = await normalizeSectionOfficials(
        body.executiveCommittee,
      );
      existing.executiveCommittee = { members: normalized.members || [] };
    }

    if (body.technicalWorkingGroup) {
      const normalized = await normalizeSectionOfficials(
        body.technicalWorkingGroup,
      );
      existing.technicalWorkingGroup = { members: normalized.members || [] };
    }

    if (body.secretariat) {
      existing.secretariat = await normalizeSectionOfficials(
        body.secretariat,
      );
    }

    await existing.save();

    await logActivity({
      req,
      action: "GFP_UPDATE",
      description: "GFPS structure updated",
      resource_type: "gfps",
      resource_id: id,
      severity: "info",
    });

    return Response.json({ success: true, data: existing });
  } catch (error) {
    console.error("[GFPS PUT] Error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
