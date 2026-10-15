import { connectDB } from "@/lib/db";
import UniversityOffice from "@/models/universityOffice";
import UniversityOfficial from "@/models/universityOfficials";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { canWriteOffices } from "@/lib/officesAccess";
import { NextResponse } from "next/server";
import { normalizeOfficeName, officeKey } from "@/lib/universityOffices";
import { normalizeAcademicYear } from "@/lib/academicYear";

const FORBIDDEN = {
  success: false,
  error: "Only the GAD focal person can manage offices",
};

/** Renames an office or (de)activates it. */
export async function PATCH(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canWriteOffices(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  const { id } = await params;
  const body = await req.json();
  const { header, is_active, academic_year, force } = body || {};

  const office = await UniversityOffice.findById(id);
  if (!office) {
    return Response.json(
      { success: false, error: "Office not found" },
      { status: 404 },
    );
  }

  const updates = {};

  if (header !== undefined) {
    const nextHeader = normalizeOfficeName(header);
    if (!nextHeader) {
      return Response.json(
        { success: false, error: "Office name cannot be empty" },
        { status: 400 },
      );
    }
    if (officeKey(nextHeader) !== officeKey(office.header)) {
      const others = await UniversityOffice.find({ _id: { $ne: id } }).lean();
      if (others.some((row) => officeKey(row.header) === officeKey(nextHeader))) {
        return Response.json(
          { success: false, error: "Another office already uses that name" },
          { status: 409 },
        );
      }
    }
    updates.header = nextHeader;
  }

  if (is_active !== undefined) {
    const nextActive = Boolean(is_active);
    // Deactivating an office that still holds seats would silently hide
    // assigned people from the chart — refuse unless the caller forces it.
    if (!nextActive && !force) {
      const year = normalizeAcademicYear(academic_year);
      const query = { header: office.header };
      if (year) query.academic_year = year;
      const occupied = await UniversityOfficial.countDocuments(query);
      if (occupied > 0) {
        return Response.json(
          {
            success: false,
            error: `${occupied} official(s) are still assigned to this office${year ? ` in AY ${year}` : ""}. Vacate or reassign them first.`,
            occupied,
          },
          { status: 409 },
        );
      }
    }
    updates.is_active = nextActive;
  }

  if (!Object.keys(updates).length) {
    return Response.json({ success: true, data: office });
  }

  try {
    const updated = await UniversityOffice.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    const deactivated = updates.is_active === false;
    await logActivity({
      req,
      action: deactivated ? "OFFICE_DEACTIVATE" : "OFFICE_UPDATE",
      description: deactivated
        ? `Office "${office.header}" deactivated`
        : `Office "${office.header}" updated`,
      resource_type: "university_office",
      resource_id: id,
      severity: deactivated ? "warning" : "info",
      metadata: {
        prev_header: office.header,
        header: updated?.header || office.header,
        is_active: updated?.is_active,
      },
    });

    return Response.json({ success: true, data: updated });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate ? "Another office already uses that name" : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}

/**
 * Offices are never removed — history (past AYs, printed reports) still
 * references them. Use `PATCH { is_active: false }` to retire one.
 */
export async function DELETE(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canWriteOffices(req)) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  await connectDB();

  const { id } = await params;
  const office = await UniversityOffice.findById(id);
  if (!office) {
    return Response.json(
      { success: false, error: "Office not found" },
      { status: 404 },
    );
  }

  const occupied = await UniversityOfficial.countDocuments({
    header: office.header,
  });

  return Response.json(
    {
      success: false,
      error:
        "Offices cannot be deleted because past years reference them. Deactivate it instead.",
      occupied,
    },
    { status: 409 },
  );
}
