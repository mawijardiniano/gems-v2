import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  GFPS_SECTION_KEYS,
  makeFilterHelpers,
  normalizeSectionOfficials,
} from "@/lib/gfpsServer";
import {
  normalizeAcademicYear,
  resolveAcademicYear,
  sortAcademicYearsDesc,
} from "@/lib/academicYear";

async function getActiveTermYear() {
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    return normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const activeYear = await getActiveTermYear();
  const academicYear = resolveAcademicYear({
    query: searchParams.get("academic_year"),
    activeTerm: activeYear,
  });

  /* GFPS members are manual-first: each row owns its seat and its typed name,
     and nothing here consults — or needs — the officials roster. This used to
     aggregate OfficialTerm on every read to resolve `official_term` links; the
     links are gone, so the aggregation is too. */
  const { filterSectionWithDetails } = makeFilterHelpers();

  const years = sortAcademicYearsDesc(await GFPS.distinct("academic_year"));
  if (!years.includes(academicYear)) years.unshift(academicYear);

  let gfps = await GFPS.find({ academic_year: academicYear }).lean();

  // Fallback for installs that predate the AY migration: surface the untagged
  // legacy committee instead of an empty page.
  let legacy = false;
  if (!gfps.length) {
    const untagged = await GFPS.find({
      $or: [
        { academic_year: { $exists: false } },
        { academic_year: null },
        { academic_year: "" },
      ],
    }).lean();
    if (untagged.length) {
      gfps = untagged;
      legacy = true;
    }
  }

  gfps = gfps.map((doc) => ({
    ...doc,
    ...Object.fromEntries(
      GFPS_SECTION_KEYS.map((key) => [key, filterSectionWithDetails(doc[key])]),
    ),
  }));

  return Response.json({
    success: true,
    data: gfps,
    academic_year: academicYear,
    active_year: activeYear,
    years,
    legacy,
  });
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const academicYear = normalizeAcademicYear(body?.academic_year);

  if (!academicYear) {
    return Response.json(
      { success: false, error: "Missing or invalid academic_year (e.g. 2025-2026)" },
      { status: 400 },
    );
  }

  /* Normalize only the sections the request actually names. Guarding on
     `key in body` rather than on truthiness matters: a section can normalize to
     `null`, which is how "clear this slot" is expressed, and `if (body[key])`
     would skip that assignment and leave the old value in place while reporting
     success. */
  GFPS_SECTION_KEYS.forEach((key) => {
    if (!(key in body)) return;
    body[key] = normalizeSectionOfficials(body[key], {
      isExecutiveCommittee: key === "executiveCommittee",
    });
  });

  let doc = await GFPS.findOne({ academic_year: academicYear });
  const isCreate = !doc;

  if (!doc) {
    doc = await GFPS.create({ ...body, academic_year: academicYear });
  } else {
    /* Assign every named section rather than a hand-written list of fields.
       The previous version named each section individually, which meant any
       section key not spelled out there was accepted, normalized, reported as
       saved — and never written. Driving it off `GFPS_SECTION_KEYS` keeps this
       branch and the model in step by construction. */
    GFPS_SECTION_KEYS.forEach((key) => {
      if (!(key in body)) return;
      const value = body[key];

      /* A single-slot section (`chairOrHeadOfAgency`) is a subdocument, while
         the list sections are either an array (`secretariat`) or an object
         holding `members`. Assigning the normalized value wholesale is what
         makes a cleared slot actually clear. */
      if (key === "chairOrHeadOfAgency") {
        doc.chairOrHeadOfAgency = value;
      } else if (Array.isArray(value)) {
        doc[key] = value;
      } else if (value?.members) {
        doc[key] ||= { members: [] };
        doc[key].members = value.members;
      }

      /* Nested arrays are not guaranteed to be marked dirty by assignment, and
         an unmarked path is saved as-is — the "saved but unchanged" failure. */
      doc.markModified(key);
    });

    await doc.save();
  }

  /* Read the document back from the database rather than trusting the in-memory
     result, and respond with that (`onDisk`). A subdocument path the write did
     not touch is serialized by Mongoose as an empty shell (`{members: []}`),
     which made the response claim sections held members they did not. The lean
     document is also exactly what the client will get from the next GET. */
  const onDisk = await GFPS.findById(doc._id).lean();

  await logActivity({
    req,
    action: isCreate ? "GFP_CREATE" : "GFP_UPDATE",
    description: isCreate
      ? `GFPS structure created (AY ${academicYear})`
      : `GFPS structure updated (AY ${academicYear})`,
    resource_type: "gfps",
    resource_id: doc._id,
    severity: "info",
    metadata: { academic_year: academicYear },
  });

  /* Respond with the document as re-read from disk, so the response matches what
     a following GET will return. */
  return Response.json({ success: true, data: onDisk });
}

export async function DELETE(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const academicYear = normalizeAcademicYear(searchParams.get("academic_year"));
  if (!academicYear) {
    return Response.json(
      { success: false, error: "academic_year query is required" },
      { status: 400 },
    );
  }

  // Scoped delete: never wipe other years' committees.
  await GFPS.deleteMany({ academic_year: academicYear });
  return Response.json({ success: true });
}
