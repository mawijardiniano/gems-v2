import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { findSeatByParts } from "@/lib/universityOfficialsConstants";

const POPULATE = {
  path: "name",
  model: "UserAuth",
  populate: { path: "personal_info_id", populate: { path: "personal" } },
};

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const officials = await UniversityOfficial.find()
    .populate(POPULATE)
    .sort({ header: 1, title: 1, unit: 1 });

  return Response.json({ success: true, data: officials });
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const { header, title, unit = "", name } = body || {};

  if (!header || !title || !name) {
    return Response.json(
      { success: false, error: "Missing header, title, or name" },
      { status: 400 },
    );
  }

  const seat = findSeatByParts({ header, title, unit });
  if (!seat) {
    return Response.json(
      {
        success: false,
        error:
          "Unknown seat — it is not part of the MarSU offices and administrative designations",
      },
      { status: 400 },
    );
  }

  const existing = await UniversityOfficial.findOne({
    header: seat.header,
    title: seat.title,
    unit: seat.unit,
  });

  if (existing) {
    return Response.json(
      { success: false, error: "Seat is already filled" },
      { status: 409 },
    );
  }

  try {
    const doc = await UniversityOfficial.create({
      header: seat.header,
      title: seat.title,
      unit: seat.unit,
      name,
    });

    await logActivity({
      req,
      action: "OFFICIAL_ASSIGN",
      description: `Official assigned to "${seat.position}"`,
      resource_type: "university_official",
      resource_id: doc._id,
      severity: "info",
      metadata: { header: seat.header, title: seat.title, unit: seat.unit },
    });

    await doc.populate(POPULATE);
    return Response.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate ? "Seat is already filled" : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}
