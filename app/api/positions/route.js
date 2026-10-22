import { connectDB } from "@/lib/db";
import Position from "@/models/position";
import OfficialTerm from "@/models/officialTerm";
import UniversityOffice from "@/models/universityOffice";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { canReadPositions, canWritePositions } from "@/lib/positionsAccess";
import { normalizeAcademicYear, resolveAcademicYear, academicYearRange } from "@/lib/academicYear";
import { NextResponse } from "next/server";
import { buildDefaultOfficeRows, isActiveOffice } from "@/lib/universityOffices";
import { cleanName, norm } from "@/lib/universityPositions";

/**
 * The seat list behind the org chart — one row per Position document.
 *
 * NOT the same as /api/university-offices: an office is a *column*
 * ("EXECUTIVE OFFICIALS"), a position is a *seat inside* one
 * ("University President"). This endpoint manages the seats.
 *
 * Seats are soft-retired, never deleted: OfficialTerm rows reference a position
 * forever, so an unused seat must still resolve its tenure history — the same
 * rule the offices route enforces.
 */

const FORBIDDEN = {
  success: false,
  error: "Only the GAD focal person can manage positions",
};

/** The academic year whose roster drives the per-seat assigned counts. */
async function getActiveTermYear() {
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    return normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    return null;
  }
}

/**
 * Ensures the offices collection is populated on first use, so an upgraded
 * install is not left with a seat list whose columns do not exist.
 */
async function ensureOfficesSeeded() {
  const count = await UniversityOffice.estimatedDocumentCount();
  if (count > 0) return;
  try {
    await UniversityOffice.insertMany(buildDefaultOfficeRows(), {
      ordered: false,
    });
  } catch (err) {
    if (err?.code !== 11000 && !err?.writeErrors) throw err;
  }
}

/** Case/space-insensitive seat key, matching the unique {header,name} index. */
function seatKey(header, name) {
  const h = norm(header);
  const n = cleanName(name);
  if (!h || !n) return "";
  return `${h}||${norm(n)}`;
}

/**
 * Term counts per { header, name } seat key.
 *
 * OfficialTerm stores `startDate`/`endDate`, not a per-year snapshot, so a
 * seat's occupancy for a given academic year is a **date-range overlap**:
 * a term counts when it started on or before the year ends and had not ended
 * before the year began. Filtering on a stored `academic_year` field would
 * match nothing at all (that field does not exist on this model) and every
 * row would read "vacant".
 *
 * `occupied_all` is the same count with no year filter, which is what the
 * deactivation guard checks.
 */
async function getAssignedCounts(academicYear) {
  const range = academicYearRange(academicYear);

  const match = range
    ? {
        startDate: { $lte: range.end },
        $or: [{ endDate: null }, { endDate: { $gte: range.start } }],
      }
    : {};

  const rows = await OfficialTerm.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    {
      $lookup: {
        from: "positions",
        localField: "position",
        foreignField: "_id",
        as: "seat",
      },
    },
    { $unwind: "$seat" },
    {
      $group: {
        _id: { header: "$seat.header", name: "$seat.name" },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = new Map();
  for (const row of rows) {
    const key = seatKey(row._id?.header, row._id?.name);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + (row.count || 0));
  }
  return counts;
}

/* Exported for the [id] route, which needs the identical seat identity so the
   two cannot drift. */
export { seatKey, ensureOfficesSeeded };

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canReadPositions(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  await ensureOfficesSeeded();

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("include_inactive") === "true";
  const includeCounts = searchParams.get("include_counts") === "true";
  const requestedYear = normalizeAcademicYear(searchParams.get("academic_year"));
  const activeYear = includeCounts ? await getActiveTermYear() : null;
  const academicYear = includeCounts
    ? resolveAcademicYear({ query: requestedYear, activeTerm: activeYear })
    : null;

  const query = includeInactive ? {} : { is_active: { $ne: false } };
  const positions = await Position.find(query)
    .sort({ header: 1, sort_order: 1, name: 1 })
    .lean();

  const offices = await UniversityOffice.find({})
    .sort({ sort_order: 1, header: 1 })
    .lean();

  let data = positions;
  if (includeCounts) {
    /* Two counts per seat: the selected year's occupancy (what the row shows)
       and the seat's whole history (what the deactivation guard refuses on).
       They differ whenever a seat changed hands between years. */
    const [yearCounts, allCounts] = await Promise.all([
      getAssignedCounts(academicYear),
      getAssignedCounts(null),
    ]);
    data = positions.map((seat) => {
      const key = seatKey(seat.header, seat.name);
      return {
        ...seat,
        assigned_count: yearCounts.get(key) || 0,
        occupied_all: allCounts.get(key) || 0,
      };
    });
  }

  const body = {
    success: true,
    data,
    offices,
    total: data.length,
    active_total: data.filter((s) => s.is_active !== false).length,
    inactive_total: data.filter((s) => s.is_active === false).length,
  };
  if (includeCounts) {
    body.academic_year = academicYear;
    /* What the deactivation guard will check — the whole history, not just the
       selected year — so the confirm dialog can state it up front. */
    body.occupied_total = data.reduce(
      (sum, seat) =>
        sum + (seat.is_active !== false ? seat.occupied_all || 0 : 0),
      0,
    );
  }
  return Response.json(body);
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canWritePositions(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  const body = await req.json();
  const header = String(body?.header || "").trim();
  const name = cleanName(body?.name);

  if (!header) {
    return Response.json(
      { success: false, error: "Pick the office / group this seat belongs to" },
      { status: 400 },
    );
  }
  if (!name) {
    return Response.json(
      { success: false, error: "Position name is required" },
      { status: 400 },
    );
  }

  // The column must exist and be assignable, or the seat would be orphaned the
  // moment the chart groups by office header.
  const officeRows = await UniversityOffice.find({}).lean();
  const office = officeRows.find((row) => norm(row.header) === norm(header));
  if (!office) {
    return Response.json(
      { success: false, error: `Unknown office "${header}". Add it first.` },
      { status: 400 },
    );
  }
  if (!isActiveOffice(office)) {
    return Response.json(
      {
        success: false,
        error: `Office "${header}" is deactivated and cannot take new seats.`,
      },
      { status: 409 },
    );
  }

  /* Matched across active *and* inactive rows: a retired seat still owns its
     {header,name} identity (term history references it), so adding it again
     would collide with the unique index. The colliding row is returned so the
     client can say which state it is in rather than a bare "already exists". */
  const existingRows = await Position.find({}).lean();
  const existing = existingRows.find(
    (row) => seatKey(row.header, row.name) === seatKey(header, name),
  );
  if (existing) {
    return Response.json(
      {
        success: false,
        error:
          existing.is_active === false
            ? `Seat "${existing.name}" already exists under "${existing.header}" but is inactive — reactivate it instead.`
            : `Seat "${existing.name}" already exists under "${existing.header}".`,
        data: existing,
        existing_id: existing._id,
        is_active: existing.is_active !== false,
      },
      { status: 409 },
    );
  }

  const last = await Position.findOne({ header: office.header })
    .sort({ sort_order: -1 })
    .lean();

  try {
    const doc = await Position.create({
      header: office.header,
      name,
      is_active: true,
      sort_order: (last?.sort_order ?? -1) + 1,
    });

    await logActivity({
      req,
      action: "POSITION_CREATE",
      description: `Position "${doc.name}" added under "${doc.header}"`,
      resource_type: "university_position",
      resource_id: doc._id,
      severity: "info",
      metadata: { header: doc.header, name: doc.name },
    });

    return Response.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate
          ? `Seat "${name}" already exists under "${header}".`
          : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}
