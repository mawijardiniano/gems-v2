import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import UniversityOfficial from "@/models/universityOfficials";
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

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const universityOfficials = await UniversityOfficial.findOne({})
    .populate(UNIVERSITY_OFFICIALS_POPULATE)
    .lean();

  const { filterSectionWithDetails } = makeFilterHelpers(universityOfficials);

  let gfps = await GFPS.find().lean();

  gfps = gfps.map((doc) => ({
    ...doc,
    ...Object.fromEntries(
      GFPS_SECTION_KEYS.map((key) => [
        key,
        filterSectionWithDetails(doc[key]),
      ]),
    ),
  }));

  return Response.json({ success: true, data: gfps });
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();

  GFPS_SECTION_KEYS.forEach((key) => {
    if (body[key]) body[key] = normalizeSectionOfficials(body[key]);
  });

  let doc = await GFPS.findOne({});
  const isCreate = !doc;

  if (!doc) {
    doc = await GFPS.create(body);
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
      ? "GFPS structure created"
      : "GFPS structure updated",
    resource_type: "gfps",
    resource_id: doc._id,
    severity: "info",
  });

  return Response.json({ success: true, data: doc });
}

export async function DELETE(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  await GFPS.deleteMany({});
  return Response.json({ success: true });
}
