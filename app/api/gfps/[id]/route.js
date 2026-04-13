import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import UniversityOfficial from "@/models/universityOfficials";

async function normalizeOfficialId(id) {
  if (!id) return null;
  const universityOfficials = await UniversityOfficial.findOne({}).lean();
  const idStr = id.toString();

  if (universityOfficials.president) {
    if (universityOfficials.president.name?.toString() === idStr) {
      return universityOfficials.president.name?.toString();
    }
  }
  for (const vp of universityOfficials.vicePresidents || []) {
    if (vp._id?.toString() === idStr) return vp.name?.toString();
  }
  for (const cd of universityOfficials.campusDirectors || []) {
    if (cd._id?.toString() === idStr) return cd.name?.toString();
  }
  for (const dean of universityOfficials.collegeDeans || []) {
    if (dean._id?.toString() === idStr) return dean.name?.toString();
  }
  for (const ad of universityOfficials.associateDeans || []) {
    if (ad._id?.toString() === idStr) return ad.name?.toString();
  }
  for (const op of universityOfficials.office_of_the_president || []) {
    if (op._id?.toString() === idStr) return op.name?.toString();
  }
  for (const arr of [
    universityOfficials.office_of_the_vice_president_academic_affairs,
    universityOfficials.office_of_the_vice_president_admin_finance,
    universityOfficials.office_of_the_vice_president_student_affairs,
    universityOfficials.office_of_the_vice_president_research_extension,
  ]) {
    for (const item of arr || []) {
      if (item._id?.toString() === idStr) return item.name?.toString();
    }
  }
  return id;
}

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
      (normalized.members || []).map(normalizeSectionOfficials)
    );
  }
  return normalized;
}

export async function PUT(req, { params }) {
  const { id } = await params; // ← fix: await params first
  await connectDB();
  const body = await req.json();

  try {
    const existing = await GFPS.findById(id); // ← use id
    if (!existing) {
      return Response.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (body.chairOrHeadOfAgency) {
      existing.chairOrHeadOfAgency = await normalizeSectionOfficials(
        body.chairOrHeadOfAgency
      );
    }

    if (body.executiveCommittee) {
      const normalized = await normalizeSectionOfficials(body.executiveCommittee);
      existing.executiveCommittee = {
        members: normalized.members || [],
      };
    }

    if (body.technicalWorkingGroup) {
      const normalized = await normalizeSectionOfficials(body.technicalWorkingGroup);
      existing.technicalWorkingGroup = {
        members: normalized.members || [],
      };
    }

    if (body.secretariat) {
      existing.secretariat = await normalizeSectionOfficials(body.secretariat);
    }

    await existing.save();

    console.log("[GFPS PUT] Updated doc:", JSON.stringify(existing, null, 2));

    return Response.json({ success: true, data: existing });
  } catch (error) {
    console.error("[GFPS PUT] Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}