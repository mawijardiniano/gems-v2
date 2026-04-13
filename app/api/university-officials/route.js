import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";

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

const ARRAY_SECTIONS = [
  "vicePresidents",
  "campusDirectors",
  "collegeDeans",
  "associateDeans",
  "office_of_the_president",
  "office_of_the_vice_president_academic_affairs",
  "office_of_the_vice_president_admin_finance",
  "office_of_the_vice_president_student_affairs",
  "office_of_the_vice_president_research_extension",
];

export async function GET(req) {
  await connectDB();

  const officials = await UniversityOfficial.find().populate({
    path: POPULATE_PATHS,
    populate: { path: "personal_info_id" },
  });
  return Response.json({ success: true, data: officials });
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const { section, data } = body;
  if (!section || !data) {
    return Response.json(
      { success: false, error: "Missing section or data" },
      { status: 400 },
    );
  }
  try {
    let update;
    if (ARRAY_SECTIONS.includes(section)) {
      update = { $push: { [section]: data } };
    } else {
      update = { $set: { [section]: data } };
    }
    const updated = await UniversityOfficial.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      runValidators: true,
    }).populate({
      path: POPULATE_PATHS,
      populate: { path: "personal_info_id" },
    });
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
