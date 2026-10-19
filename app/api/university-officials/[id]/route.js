import { connectDB } from "@/lib/db";
import UniversityOfficial from "@/models/universityOfficials";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { resolvePiiBatch } from "@/lib/profileBroker";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const POPULATE = {
  path: "name",
  model: "UserAuth",
  populate: {
    path: "personal_info_id",
    /* `vaultRef` is what lets GET resolve the name from the vault; the
       `personal` sub-populate is the legacy fallback and goes away with the
       column. */
    select: "vaultRef personal",
    populate: { path: "personal" },
  },
};

/**
 * The seat's name for an audit-log entry.
 *
 * Synchronous because PATCH only records it — nothing is returned to a screen.
 * It reads whatever the populate produced, so it is a best-effort label rather
 * than an authorization decision; GET uses `resolveDisplayName` instead.
 */
const getDisplayName = (doc) => {
  if (!doc) return "";
  if (doc.name_text) return doc.name_text;
  const personal = doc.name?.personal_info_id?.personal;
  if (personal?.first_name || personal?.last_name)
    return `${personal.first_name || ""} ${personal.last_name || ""}`.trim();
  return doc.name?.username || "";
};

/**
 * The seat's name, from the vault when the seat is filled by a user account.
 *
 * `name_text` is a manually typed label and is not PII the vault owns, so it
 * wins when present. When the seat points at a user, the name comes from the
 * vault — the legacy `personal.first_name` beside it is encrypted and will go
 * away, and reading it directly would blank the roster.
 *
 * The two branches are shaped differently by design: masking produces
 * `displayName` ("M*** D***"), revealing produces the real `personal` parts.
 * Both are handled here so the caller does not have to care which it got.
 */
const resolveDisplayName = async (doc, { role } = {}) => {
  if (!doc) return "";
  if (doc.name_text) return doc.name_text;

  const profile = doc.name?.personal_info_id;
  const vaultRef = profile?.vaultRef;

  if (vaultRef) {
    const piiByRef = await resolvePiiBatch({ vaultRefs: [vaultRef], role });
    const resolved = piiByRef.get(String(vaultRef));

    /* Masked: the broker already produced the redacted label. */
    if (resolved?.displayName) return resolved.displayName;

    /* Revealed: the real name sits under `personal`. */
    const personal = resolved?.personal;
    if (personal?.first_name || personal?.last_name) {
      return `${personal.first_name || ""} ${personal.last_name || ""}`.trim();
    }
  }

  return profile?.personal
    ? `${profile.personal.first_name || ""} ${profile.personal.last_name || ""}`.trim()
    : doc.name?.username || "";
};

export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;

  const official = await UniversityOfficial.findById(id).populate(POPULATE);
  if (!official) {
    return Response.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }

  /* The populated `personal` block is masked or absent, never the raw
     identity — this response used to carry the whole plaintext profile. */
  const displayName = await resolveDisplayName(official, { role: user?.role });
  const data = official.toObject();
  if (data.name?.personal_info_id) {
    const { personal, ...rest } = data.name.personal_info_id;
    data.name = { ...data.name, personal_info_id: rest };
  }

  return Response.json({ success: true, data: { ...data, display_name: displayName } });
}

/** Reassigns an existing seat to a different person (same academic year). */
export async function PATCH(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { name, name_text = "", academic_year } = body || {};

  const nameText = String(name_text || "").trim();
  const nameId = name && mongoose.isValidObjectId(name) ? name : null;

  if (!nameId && !nameText) {
    return Response.json(
      { success: false, error: "Missing name (pick a user or type a name)" },
      { status: 400 },
    );
  }

  try {
    const current = await UniversityOfficial.findById(id).populate(POPULATE);
    if (!current) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    // Guard: never silently move a person across academic years.
    if (academic_year && academic_year !== current.academic_year) {
      return Response.json(
        {
          success: false,
          error: `Seat belongs to AY ${current.academic_year}; switch to that year to edit it`,
        },
        { status: 409 },
      );
    }

    const prevName = getDisplayName(current);

    const updated = await UniversityOfficial.findByIdAndUpdate(
      id,
      { $set: { name: nameId, name_text: nameId ? "" : nameText } },
      { new: true, runValidators: true },
    ).populate(POPULATE);

    if (!updated) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    const newName = getDisplayName(updated);

    await logActivity({
      req,
      action: "OFFICIAL_UPDATE",
      description: `Official reassigned for "${updated.position}" (AY ${updated.academic_year})`,
      resource_type: "university_official",
      resource_id: id,
      severity: "info",
      metadata: {
        academic_year: updated.academic_year,
        header: updated.header,
        title: updated.title,
        unit: updated.unit,
        prev_name: prevName,
        new_name: newName,
      },
    });

    return Response.json({ success: true, data: updated });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 400 },
    );
  }
}

/** Vacates a seat — the seat itself stays in the code-side catalog. */
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
    action: "OFFICIAL_VACATE",
    description: `Official vacated "${deleted.position}" (AY ${deleted.academic_year})`,
    resource_type: "university_official",
    resource_id: id,
    severity: "warning",
    metadata: {
      academic_year: deleted.academic_year,
      header: deleted.header,
      title: deleted.title,
      unit: deleted.unit,
    },
  });

  return Response.json({ success: true, data: deleted });
}
