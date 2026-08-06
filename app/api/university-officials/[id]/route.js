import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import {NextResponse} from "next/server"

const POPULATE_PATHS = [
  "president.name",
  "vicePresidents.name",
  "campusDirectors.name",
  "collegeDeans.name",
  "associateDeans.name",
  "office_of_the_president.name",
  "office_of_the_vice_president_academic_affairs.name",
  "office_of_the_vice_president_admin_finance.name",
  "office_of_the_vice_president_student_affairs.name",
  "office_of_the_vice_president_research_extension.name",
].join(" ");

export async function GET(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const officials = await UniversityOfficial.find().populate({
    path: POPULATE_PATHS,
    populate: { path: "personal_info_id" },
  });
  if (!officials) {
    return Response.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }
  return Response.json({ success: true, data: official });
}

export async function PATCH(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { section, index, data } = body;

  if (!section || typeof index !== "number" || !data) {
    console.log("PATCH error: missing/invalid values", {
      section,
      index,
      data,
      typeofSection: typeof section,
      typeofIndex: typeof index,
      typeofData: typeof data,
    });
    return Response.json(
      { success: false, error: "Missing section, index, or data" },
      { status: 400 },
    );
  }
  try {
    const doc = await UniversityOfficial.findById(id);
    if (!doc) {
      console.log("PATCH error: doc not found", { id });
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }
    if (Array.isArray(doc[section])) {
      if (!doc[section][index]) {
        console.log("PATCH error: section or index not found (array)", {
          section,
          index,
          docSection: doc[section],
        });
        return Response.json(
          { success: false, error: "Section or index not found" },
          { status: 400 },
        );
      }
      Object.assign(doc[section][index], data);
    } else if (typeof doc[section] === "object" && doc[section] !== null) {
      Object.assign(doc[section], data);
    } else {
      console.log("PATCH error: section not found or invalid type", {
        section,
        docSection: doc[section],
        docSectionType: typeof doc[section],
      });
      return Response.json(
        { success: false, error: "Section not found or invalid type" },
        { status: 400 },
      );
    }
    await doc.save();
    await doc.populate({
      path: POPULATE_PATHS,
      populate: { path: "personal_info_id" },
    });
    await logActivity({
      req,
      action: "OFFICIAL_UPDATE",
      description: `University official updated (section "${section}")`,
      resource_type: "university_official",
      resource_id: id,
      severity: "info",
      metadata: { section },
    });
    return Response.json({ success: true, data: doc });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function PUT(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = params;
  const body = await req.json();
  const { section, officialId, data } = body;

  if (!section || !officialId || !data) {
    return Response.json(
      { success: false, error: "Missing section, officialId, or data" },
      { status: 400 },
    );
  }

  try {
    const updated = await UniversityOfficial.findOneAndUpdate(
      { _id: id, [`${section}._id`]: officialId },
      { $set: { [`${section}.$`]: { _id: officialId, ...data } } },
      { new: true, runValidators: true },
    ).populate(POPULATE_PATHS);
    if (!updated) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }
    await logActivity({
      req,
      action: "OFFICIAL_UPDATE",
      description: `University official replaced (section "${section}")`,
      resource_type: "university_official",
      resource_id: id,
      severity: "info",
      metadata: { section },
    });
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const deleted = await UniversityOfficial.findByIdAndDelete(id);
  if (!deleted) {
    return Response.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }
  await logActivity({
    req,
    action: "OFFICIAL_DELETE",
    description: `University officials record deleted`,
    resource_type: "university_official",
    resource_id: id,
    severity: "warning",
  });
  return Response.json({ success: true, data: deleted });
}
