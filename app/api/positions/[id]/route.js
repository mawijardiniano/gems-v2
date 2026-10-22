import { connectDB } from "@/lib/db";
import Position from "@/models/position";
import OfficialTerm from "@/models/officialTerm";
import UniversityOffice from "@/models/universityOffice";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { canWritePositions } from "@/lib/positionsAccess";
import { NextResponse } from "next/server";
import { isActiveOffice } from "@/lib/universityOffices";
import { cleanName, norm } from "@/lib/universityPositions";

const FORBIDDEN = {
  success: false,
  error: "Only the GAD focal person can manage positions",
};

/** Case/space-insensitive seat key, matching the unique {header,name} index. */
function seatKey(header, name) {
  const h = norm(header);
  const n = cleanName(name);
  if (!h || !n) return "";
  return `${h}||${norm(n)}`;
}

/**
 * Edits a seat: rename it, move it to another office column, set its order, or
 * (de)activate it.
 *
 * Renaming is deliberately NON-retroactive. OfficialTerm rows reference the
 * Position by _id, so a rename instantly changes how *past* tenures read. The
 * constant below makes that explicit and is what the UI warns about — the
 * alternative (forking the seat and re-pointing only the open term) would
 * fragment one person's tenure timeline into two seats.
 */
export const RENAME_IS_RETROACTIVE = true;

export async function PATCH(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canWritePositions(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  const { id } = await params;
  const body = await req.json();
  const { name, header, is_active, sort_order, force } = body || {};

  const seat = await Position.findById(id);
  if (!seat) {
    return Response.json(
      { success: false, error: "Position not found" },
      { status: 404 },
    );
  }

  const updates = {};
  const nextHeader =
    header === undefined ? seat.header : String(header || "").trim();
  const nextName = name === undefined ? seat.name : cleanName(name);

  if (!nextName) {
    return Response.json(
      { success: false, error: "Position name cannot be empty" },
      { status: 400 },
    );
  }
  if (!nextHeader) {
    return Response.json(
      { success: false, error: "Office / group cannot be empty" },
      { status: 400 },
    );
  }

  const moved =
    seatKey(nextHeader, nextName) !== seatKey(seat.header, seat.name);

  if (moved) {
    /* A move targets a different column, so that column must exist and be
       live — otherwise the seat is filed under an office the chart cannot
       render. */
    const officeRows = await UniversityOffice.find({}).lean();
    const office = officeRows.find(
      (row) => norm(row.header) === norm(nextHeader),
    );
    if (!office) {
      return Response.json(
        { success: false, error: `Unknown office "${nextHeader}". Add it first.` },
        { status: 400 },
      );
    }
    if (!isActiveOffice(office)) {
      return Response.json(
        {
          success: false,
          error: `Office "${nextHeader}" is deactivated and cannot take seats.`,
        },
        { status: 409 },
      );
    }

    // Match across active *and* inactive rows: a retired seat still owns its
    // {header,name} identity, so colliding with one would hit the unique index.
    const others = await Position.find({ _id: { $ne: id } }).lean();
    const clash = others.find(
      (row) => seatKey(row.header, row.name) === seatKey(nextHeader, nextName),
    );
    if (clash) {
      return Response.json(
        {
          success: false,
          error:
            clash.is_active === false
              ? `Seat "${clash.name}" already exists under "${clash.header}" but is inactive — reactivate it instead.`
              : `Seat "${clash.name}" already exists under "${clash.header}".`,
          data: clash,
          existing_id: clash._id,
          is_active: clash.is_active !== false,
        },
        { status: 409 },
      );
    }

    updates.header = office.header;
    updates.name = nextName;
  }

  if (sort_order !== undefined) {
    const parsed = Number(sort_order);
    if (!Number.isFinite(parsed)) {
      return Response.json(
        { success: false, error: "sort_order must be a number" },
        { status: 400 },
      );
    }
    updates.sort_order = parsed;
  }

  if (is_active !== undefined) {
    const nextActive = Boolean(is_active);
    /* Deactivating a seat that still holds terms would silently hide a sitting
       official from the chart — refuse unless the caller forces it. The count
       is over ALL terms (history included), matching the message. */
    if (!nextActive && !force) {
      const occupied = await OfficialTerm.countDocuments({ position: seat._id });
      if (occupied > 0) {
        return Response.json(
          {
            success: false,
            error: `${occupied} term(s) still reference this position. Vacate or reassign them first.`,
            occupied,
          },
          { status: 409 },
        );
      }
    }
    updates.is_active = nextActive;
  }

  if (!Object.keys(updates).length) {
    return Response.json({ success: true, data: seat });
  }

  try {
    const updated = await Position.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    const deactivated = updates.is_active === false;
    const renamed = updates.name !== undefined && updates.name !== seat.name;
    await logActivity({
      req,
      action: deactivated ? "POSITION_DEACTIVATE" : "POSITION_UPDATE",
      description: deactivated
        ? `Position "${seat.name}" (${seat.header}) deactivated`
        : renamed
          ? `Position "${seat.name}" renamed to "${updated?.name}"`
          : `Position "${seat.name}" updated`,
      resource_type: "university_position",
      resource_id: id,
      severity: deactivated ? "warning" : "info",
      metadata: {
        prev_header: seat.header,
        prev_name: seat.name,
        header: updated?.header || seat.header,
        name: updated?.name || seat.name,
        is_active: updated?.is_active,
      },
    });

    return Response.json({ success: true, data: updated });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate
          ? `Seat "${nextName}" already exists under "${nextHeader}".`
          : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}

/**
 * Positions are never removed — OfficialTerm rows (and every printed chart)
 * reference them. Use `PATCH { is_active: false }` to retire one.
 */
export async function DELETE(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canWritePositions(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  const { id } = await params;
  const seat = await Position.findById(id);
  if (!seat) {
    return Response.json(
      { success: false, error: "Position not found" },
      { status: 404 },
    );
  }

  const occupied = await OfficialTerm.countDocuments({ position: seat._id });

  return Response.json(
    {
      success: false,
      error:
        "Positions cannot be deleted because term history references them. Deactivate it instead.",
      occupied,
    },
    { status: 409 },
  );
}
