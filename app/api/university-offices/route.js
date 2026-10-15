import { connectDB } from "@/lib/db";
import UniversityOffice from "@/models/universityOffice";
import UniversityOfficial from "@/models/universityOfficials";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { canReadOffices, canWriteOffices } from "@/lib/officesAccess";
import { normalizeAcademicYear, resolveAcademicYear } from "@/lib/academicYear";
import { NextResponse } from "next/server";
import {
  buildDefaultOfficeRows,
  findOffice,
  isActiveOffice,
  isValidOfficeName,
  normalizeOfficeName,
  officeDuplicateMessage,
} from "@/lib/universityOffices";

const FORBIDDEN = {
  success: false,
  error: "Only the GAD focal person can manage offices",
};

/** The academic year whose roster drives the per-office assigned counts. */
async function getActiveTermYear() {
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    return normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    return null;
  }
}

/**
 * Assigned-official count per office header.
 *
 * Scoped to the active academic year by default, because the cards count the
 * seats the operator is looking at. An office with history in older years also
 * reports `occupied_all`, which is what the deactivation guard checks.
 */
async function getAssignedCounts(academicYear) {
  const pipeline = [];
  if (academicYear) {
    pipeline.push({ $match: { academic_year: academicYear } });
  }
  pipeline.push({
    $group: { _id: { header: "$header", year: "$academic_year" }, count: { $sum: 1 } },
  });

  const rows = await UniversityOfficial.aggregate(pipeline);
  const counts = new Map();
  for (const row of rows) {
    const header = row._id?.header;
    if (!header) continue;
    const count = row.count || 0;
    const entry = counts.get(header) || { assigned_count: 0, occupied_all: 0 };
    if (academicYear && row._id?.year === academicYear) {
      entry.assigned_count = count;
    }
    entry.occupied_all += count;
    counts.set(header, entry);
  }
  return counts;
}

/**
 * Ensures the offices collection is populated on first use.
 *
 * Offices used to be hard-coded; an install that upgrades without running a
 * migration would otherwise show an empty picker and be unable to assign
 * anybody. Only seeds when the collection is completely empty, so a
 * deliberately deactivated office is never resurrected.
 */
async function ensureSeeded() {
  const count = await UniversityOffice.estimatedDocumentCount();
  if (count > 0) return;
  try {
    await UniversityOffice.insertMany(buildDefaultOfficeRows(), {
      ordered: false,
    });
  } catch (err) {
    // A concurrent request may have seeded first — duplicates are harmless.
    if (err?.code !== 11000 && !err?.writeErrors) throw err;
  }
}

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canReadOffices(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  await ensureSeeded();

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("include_inactive") === "true";
  const includeCounts = searchParams.get("include_counts") === "true";
  const requestedYear = normalizeAcademicYear(
    searchParams.get("academic_year"),
  );
  const activeYear = includeCounts ? await getActiveTermYear() : null;
  const academicYear = includeCounts
    ? resolveAcademicYear({ query: requestedYear, activeTerm: activeYear })
    : null;

  const query = includeInactive ? {} : { is_active: { $ne: false } };
  const offices = await UniversityOffice.find(query)
    .sort({ sort_order: 1, header: 1 })
    .lean();

  let data = offices;
  if (includeCounts) {
    const counts = await getAssignedCounts(academicYear);
    data = offices.map((office) => {
      const entry = counts.get(office.header) || {};
      return {
        ...office,
        assigned_count: entry.assigned_count || 0,
        occupied_all: entry.occupied_all || 0,
      };
    });
  }

  const body = { success: true, data };
  if (includeCounts) {
    body.academic_year = academicYear;
    // What the deactivation guard will check — the whole history, not just the
    // selected year — so the confirm dialog can state it up front.
    body.occupied_total = data.reduce(
      (sum, office) => sum + (isActiveOffice(office) ? office.occupied_all || 0 : 0),
      0,
    );
  }
  return Response.json(body);
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canWriteOffices(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  const body = await req.json();
  const header = normalizeOfficeName(body?.header);

  if (!isValidOfficeName(header)) {
    return Response.json(
      { success: false, error: "Office name is required" },
      { status: 400 },
    );
  }

  // Matched across active *and* inactive rows: a deactivated office still owns
  // its name (history references it), so adding it again would create a
  // duplicate header. The colliding row is returned so the client can say which
  // state it is in rather than a bare "already exists".
  const existingRows = await UniversityOffice.find({}).lean();
  const existing = findOffice(existingRows, header);
  if (existing) {
    return Response.json(
      {
        success: false,
        error: officeDuplicateMessage(header, existing),
        data: existing,
        existing_id: existing._id,
        is_active: existing.is_active !== false,
      },
      { status: 409 },
    );
  }

  const last = await UniversityOffice.findOne({})
    .sort({ sort_order: -1 })
    .lean();

  try {
    const doc = await UniversityOffice.create({
      header,
      is_active: true,
      sort_order: (last?.sort_order ?? -1) + 1,
    });

    await logActivity({
      req,
      action: "OFFICE_CREATE",
      description: `Office "${doc.header}" added`,
      resource_type: "university_office",
      resource_id: doc._id,
      severity: "info",
      metadata: { header: doc.header },
    });

    return Response.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate
          ? officeDuplicateMessage(header)
          : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}
