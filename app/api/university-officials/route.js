import { connectDB } from "@/lib/db";
import UniversityOffice from "@/models/universityOffice";
import SystemSetting from "@/models/systemSetting";
import OfficialTerm from "@/models/officialTerm";
import Official from "@/models/official";
import Position from "@/models/position";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { buildDefaultOfficeRows, isOfficeAssignable } from "@/lib/universityOffices";
import {
  normalizeAcademicYear,
  resolveAcademicYear,
  sortAcademicYearsDesc,
} from "@/lib/academicYear";
import {
  rosterPipeline,
  toRosterRow,
  academicYearsFromTermStarts,
  termStartForAcademicYear,
} from "@/lib/officialsTermsQuery";

/**
 * The statuses a caller may file a term under.
 *
 * Mirrors the schema enum minus `interim`, which has no rows and no logic
 * anywhere in the app — accepting it would let a caller create a term whose
 * meaning nothing defines. Anything else is coerced to `substantive` rather
 * than trusted, so a bad body cannot reach the schema enum and surface as a
 * raw Mongoose validation error.
 */
const ASSIGNABLE_STATUSES = ["substantive", "acting", "concurrent"];

/**
 * The academic year the system is currently in, from Settings.
 * `null` when unset, so the caller falls back to the computed year.
 */
async function getActiveTermYear() {
  try {
    const setting = await SystemSetting.findOne({ key: "active_term" }).lean();
    return normalizeAcademicYear(setting?.value?.school_year);
  } catch {
    return null;
  }
}

/**
 * Seeds the offices collection on first use so an upgraded install (offices
 * used to be hard-coded) is not left with an unusable picker.
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

export async function GET(req) {
  const { user, error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const activeYear = await getActiveTermYear();
  const academicYear = resolveAcademicYear({
    query: searchParams.get("academic_year"),
    activeTerm: activeYear,
  });

  await ensureOfficesSeeded();
  const includeInactive = searchParams.get("include_inactive") === "true";
  const offices = await UniversityOffice.find(
    includeInactive ? {} : { is_active: { $ne: false } },
  )
    .sort({ sort_order: 1, header: 1 })
    .lean();

  const years = sortAcademicYearsDesc(
    await termAcademicYears(),
  );
  if (!years.includes(academicYear)) years.unshift(academicYear);

  /* Tenure is a date range now, so the roster is an overlap query against the
     academic year rather than an equality on a stored year. A term that started
     in 2024 and is still open appears in every year since — which is the whole
     reason the snapshot model was retired. */
  const pipeline = rosterPipeline(academicYear);
  const rawRows = pipeline
    ? await OfficialTerm.aggregate([...pipeline, { $sort: { header: 1, name: 1 } }])
    : [];
  let officials = rawRows.map(toRosterRow).filter(Boolean);

  /* Rows already carry the resolved plain-text person name (`official_text`),
     because Official stores the name as plain text — no vault, no UserAuth ref.
     That is why no hydration step is needed here any more: the officials screen
     no longer decrypts PII to render a roster. */
  const legacy = false;

  return Response.json({
    success: true,
    data: officials,
    offices,
    academic_year: academicYear,
    active_year: activeYear,
    years,
    legacy,
  });
}

/**
 * Academic years the term model can answer for, newest first.
 *
 * Terms store a span, not a year, so the distinct `startDate` values are the
 * source: each maps to the year it opened in. A year with no term starting in
 * it (but with a term still open across it) is added by the caller, which
 * always unshifts the requested year.
 */
async function termAcademicYears() {
  const starts = await OfficialTerm.distinct("startDate");
  return academicYearsFromTermStarts(starts);
}

export async function POST(req) {
  const { user, error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const {
    header,
    name,
    official,
    official_text = "",
    academic_year,
    /* Renamed on arrival: `status` in this handler is already the HTTP status
       from requireAuth above, and shadowing it would break every error return. */
    status: termStatusInput,
  } = body || {};

  const seatName = String(name || body?.position || "").trim();
  const personText = String(official_text || "").trim();
  const personId =
    official && mongoose.isValidObjectId(official) ? official : null;

  if (!header || !seatName || (!personId && !personText)) {
    return Response.json(
      { success: false, error: "Missing office, seat, or official (pick a user or type a name)" },
      { status: 400 },
    );
  }

  // Offices are database rows now, so a stale client cannot file an official
  // under an office that was renamed or deactivated since the page loaded.
  await ensureOfficesSeeded();
  const officeRows = await UniversityOffice.find({}).lean();
  if (!officeRows.some((office) => office.header === header)) {
    return Response.json(
      { success: false, error: `Unknown office "${header}". Add it first.` },
      { status: 400 },
    );
  }
  if (!isOfficeAssignable(officeRows, header)) {
    return Response.json(
      { success: false, error: `Office "${header}" is deactivated and cannot take new assignments.` },
      { status: 409 },
    );
  }

  const academicYear = normalizeAcademicYear(academic_year);
  if (!academicYear) {
    return Response.json(
      { success: false, error: "Missing or invalid academic_year (e.g. 2025-2026)" },
      { status: 400 },
    );
  }

  /* The seat must exist as a Position: { header, name } is the seat's identity
     (see models/position.js — the header disambiguates the same seat name in
     different columns). Refusing an unknown seat keeps a stale client from
     inventing one, the same way the office check above rejects a renamed office. */
  const position = await Position.findOne({ header, name: seatName });
  if (!position) {
    return Response.json(
      {
        success: false,
        error: `Unknown seat "${seatName}" under "${header}". Add it in Positions first.`,
      },
      { status: 400 },
    );
  }

  /* Someone is the seat's occupant ALREADY when an open term exists. The
     response is deliberately the same 409 the snapshot model returned for a
     duplicate year+seat, so the page's existing "already assigned" handling
     keeps working. */
  const openTerm = await OfficialTerm.findOne({ position: position._id, isOpen: true });
  if (openTerm) {
    // Naming the current holder is what makes the refusal actionable.
    const current = await Official.findById(openTerm.official).lean();
    return Response.json(
      {
        success: false,
        error: `Seat "${seatName}" is already held by ${current?.name || "someone else"}. Close that term before assigning a new holder.`,
        current_official: current?.name || null,
      },
      { status: 409 },
    );
  }

  try {
    /* The person is keyed by name, which is what the unique index on Official
       enforces. `findOneAndUpdate` with `upsert` makes a re-typed name reuse the
       existing document instead of throwing E11000 — the typed-string nature of
       the source means the same person is routinely entered more than once. */
    const effectiveName = personText || (personId ? await nameForUser(personId) : "");
    if (!effectiveName) {
      return Response.json(
        { success: false, error: "Missing official (pick a user or type a name)" },
        { status: 400 },
      );
    }

    const officialDoc = await Official.findOneAndUpdate(
      { name: effectiveName },
      { $setOnInsert: { name: effectiveName } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    /* New appointments open with the academic year (1 August) and are left
       open, matching how the migration encoded the current roster. */
    const termStatus = ASSIGNABLE_STATUSES.includes(termStatusInput)
      ? termStatusInput
      : "substantive";
    const term = await OfficialTerm.create({
      official: officialDoc._id,
      position: position._id,
      startDate: termStartForAcademicYear(academicYear),
      endDate: null,
      status: termStatus,
    });

    await logActivity({
      req,
      action: "OFFICIAL_ASSIGN",
      description: `Official assigned to "${seatName}" (AY ${academicYear})`,
      resource_type: "university_official",
      resource_id: term._id,
      severity: "info",
      metadata: {
        academic_year: academicYear,
        header,
        name: seatName,
        official: effectiveName,
      },
    });

    /* The response shape is the row shape the page reads, so the optimistic
       update on the client needs no special case for a create. */
    return Response.json(
      {
        success: true,
        data: toRosterRow({
          _id: term._id,
          academic_year: academicYear,
          header: position.header,
          name: position.name,
          official: officialDoc._id,
          official_text: officialDoc.name,
          status: term.status,
          startDate: term.startDate,
          endDate: term.endDate,
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    return Response.json(
      {
        success: false,
        error: isDuplicate
          ? "This seat already has an open term for that official"
          : err.message,
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }
}

/**
 * The typed name for a user account, used when the caller picked a user rather
 * than typing a name.
 *
 * Kept deliberately last-resort: the roster's names are plain strings now, so a
 * user pick only has to contribute a label. It prefers the username, which is
 * the one identifier guaranteed present on a UserAuth document.
 */
async function nameForUser(userId) {
  const UserAuth = mongoose.models.UserAuth;
  if (!UserAuth) return "";
  const user = await UserAuth.findById(userId).select("username").lean();
  return user?.username || "";
}
