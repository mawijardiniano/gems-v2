import { connectDB } from "@/data/lib/db";
import OfficialTerm from "@/models/officialTerm";
import Official from "@/models/official";
import Position from "@/models/position";
import SystemSetting from "@/models/systemSetting";
import {
  normalizeAcademicYear,
  resolveAcademicYear,
} from "@/data/lib/academicYear";
import { academicYearAsOf } from "@/data/lib/officialsTermsQuery";
import { logActivity } from "@/data/lib/activityLog";
import { requireOrgStructureEditor } from "@/data/lib/officialsAccess";
import {
  officialNameFromBody,
  upsertOfficialFromBody,
} from "@/data/lib/officialsPerson";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

/*
 * `[id]` is an OfficialTerm id: the roster GET (../route.js) builds its rows
 * from OfficialTerm, so that is the id every Edit and Vacate button sends.
 *
 * These handlers used to read the retired UniversityOfficial snapshot
 * collection, which the term migration emptied. Every edit and vacate looked
 * up a term id in an empty collection and answered 404 "Not found".
 *
 * Succession (a new person takes the seat) is Vacate + Assign, which keeps the
 * outgoing holder in the seat history. Edit is a correction of the open term:
 * the wrong person was entered, or the status was wrong.
 */

const ASSIGNABLE_STATUSES = ["substantive", "acting", "concurrent"];

const notFound = () =>
  Response.json({ success: false, error: "Not found" }, { status: 404 });

/** Loads an open term with its seat and holder, or null. */
async function loadOpenTerm(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const term = await OfficialTerm.findById(id);
  if (!term) return null;
  const [position, official] = await Promise.all([
    Position.findById(term.position).lean(),
    Official.findById(term.official).lean(),
  ]);
  return { term, position, official };
}

/** Corrects the person (and optionally the status) on an open term. */
export async function PATCH(req, { params }) {
  const { error, status } = await requireOrgStructureEditor(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const loaded = await loadOpenTerm(id);
  if (!loaded) return notFound();
  const { term, position, official: prev } = loaded;

  /* Closed terms are history; changing them would rewrite who held the seat. */
  if (!term.isOpen) {
    return Response.json(
      {
        success: false,
        error: "This term has ended and is part of the seat history; it cannot be edited.",
      },
      { status: 409 },
    );
  }

  try {
    /* Officials are keyed by name, so correcting a linked person's name
       ("Maria Santos" -> "Dr. Maria Santos") resolves to a different Official.
       When the editor did not touch the link, it follows the person: it is
       released from the old name first (one official per profile), then set
       on the new one — and restored if the write fails. */
    let input = body;
    let released = null;
    const newName = officialNameFromBody(body);
    const keepsLink =
      prev?.profileRef &&
      !Object.prototype.hasOwnProperty.call(body || {}, "profileRef") &&
      newName &&
      newName !== prev.name;
    if (keepsLink) {
      released = prev.profileRef;
      await Official.updateOne({ _id: prev._id }, { $set: { profileRef: null } });
      input = { ...body, profileRef: released };
    }

    const person = await upsertOfficialFromBody(input);
    if (person.error) {
      if (released) {
        await Official.updateOne(
          { _id: prev._id },
          { $set: { profileRef: released } },
        );
      }
      return Response.json(
        { success: false, error: person.error },
        { status: person.status },
      );
    }
    const officialDoc = person.official;

    term.official = officialDoc._id;
    if (ASSIGNABLE_STATUSES.includes(body?.status)) term.status = body.status;
    await term.save();

    await logActivity({
      req,
      action: "OFFICIAL_UPDATE",
      description: `Official corrected for "${position?.name || "seat"}"`,
      resource_type: "university_official",
      resource_id: term._id,
      severity: "info",
      metadata: {
        header: position?.header || null,
        name: position?.name || null,
        prev_name: prev?.name || null,
        new_name: officialDoc.name,
        status: term.status,
      },
    });

    return Response.json({
      success: true,
      data: {
        _id: term._id,
        header: position?.header || null,
        name: position?.name || null,
        official: officialDoc._id,
        official_text: officialDoc.name,
        sex: officialDoc.sex,
        linked: Boolean(officialDoc.profileRef),
        status: term.status,
        startDate: term.startDate,
        endDate: term.endDate,
      },
    });
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate
          ? "This seat already has an open substantive holder"
          : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}

/** The academic year set in Settings, else the computed current one. */
async function activeAcademicYear() {
  let fromSettings = null;
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    fromSettings = normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    fromSettings = null;
  }
  return resolveAcademicYear({ query: null, activeTerm: fromSettings });
}

/**
 * Vacates a seat by closing its open term. The term stays, so the outgoing
 * holder shows in the seat history and the seat shows as vacant.
 *
 * The roster answers "who held the seat when the year opened" (1 August, see
 * academicYearAsOf). A term closed on today's date would still be running on
 * 1 August and keep the person on this year's chart. So the term ends on
 * 31 July, the day before the active year opened — the same date the migrated
 * appointments that ended carry — and the seat reads vacant for the year.
 *
 * A term that started on or after the active year opened never crossed a year
 * boundary: ending it before its own start is invalid, and keeping it would
 * still put the person on this year's chart. Vacating it is undoing the
 * assignment, so that one is removed instead of closed.
 */
export async function DELETE(req, { params }) {
  const { error, status } = await requireOrgStructureEditor(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;

  const loaded = await loadOpenTerm(id);
  if (!loaded) return notFound();
  const { term, position, official } = loaded;

  if (!term.isOpen) {
    return Response.json(
      { success: false, error: "This seat is already vacant." },
      { status: 409 },
    );
  }

  const yearOpens = academicYearAsOf(await activeAcademicYear());
  if (!yearOpens) {
    return Response.json(
      { success: false, error: "Active academic year is not set or invalid." },
      { status: 500 },
    );
  }
  const endDate = new Date(yearOpens.getTime() - 24 * 60 * 60 * 1000); // 31 July
  const notStarted = !term.startDate || term.startDate >= yearOpens;

  if (notStarted) {
    await OfficialTerm.deleteOne({ _id: term._id });
  } else {
    term.endDate = endDate;
    await term.save();
  }

  await logActivity({
    req,
    action: "OFFICIAL_VACATE",
    description: `Official vacated "${position?.name || "seat"}"`,
    resource_type: "university_official",
    resource_id: term._id,
    severity: "warning",
    metadata: {
      header: position?.header || null,
      name: position?.name || null,
      official: official?.name || null,
      mode: notStarted ? "removed_same_year" : "closed",
      endDate: notStarted ? null : endDate,
    },
  });

  return Response.json({
    success: true,
    data: {
      _id: term._id,
      endDate: notStarted ? null : endDate,
      removed: Boolean(notStarted),
    },
  });
}
