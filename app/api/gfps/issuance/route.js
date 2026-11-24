import { connectDB } from "@/data/lib/db";
import GFPS from "@/models/gfps";
import { NextResponse } from "next/server";
import { requireOrgStructureEditor } from "@/data/lib/officialsAccess";
import { normalizeAcademicYear } from "@/data/lib/academicYear";
import { fileKeyKind, uploaderOfKey } from "@/data/lib/fileKeyKinds";
import { deleteFileFromBucket } from "@/data/lib/delete";
import { logActivity } from "@/data/lib/activityLog";

const MAX_NUMBER_LENGTH = 120;

/** A Date from "YYYY-MM-DD" (or any parseable value), null when blank. */
function toDateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * PUT /api/gfps/issuance
 * { academic_year, number, date, effectivity, file: { key, name } | null }
 *
 * Records the memorandum or special order that constitutes the GFPS for one
 * academic year. Editors only (Admin, GAD Focal Person). The year's GFPS
 * document is created if it does not exist yet, so an issuance can be filed
 * before any member is encoded.
 *
 * The file must already be uploaded to the `gfps/issuance` folder (through
 * /api/upload) — by this caller, or be the file already on record. Any other
 * key is refused, so a request cannot attach someone else's upload or a file
 * from another module. A replaced or removed file is deleted from storage
 * after the record is saved.
 */
export async function PUT(req) {
  const { error, status, user } = await requireOrgStructureEditor(req);
  if (error) return NextResponse.json({ error }, { status });

  const body = await req.json().catch(() => ({}));
  const academicYear = normalizeAcademicYear(body?.academic_year);
  if (!academicYear) {
    return Response.json(
      { success: false, error: "academic_year must look like 2026-2027" },
      { status: 400 },
    );
  }

  const number = String(body?.number || "").trim();
  if (number.length > MAX_NUMBER_LENGTH) {
    return Response.json(
      { success: false, error: `Issuance number is longer than ${MAX_NUMBER_LENGTH} characters` },
      { status: 400 },
    );
  }
  const date = toDateOrNull(body?.date);
  const effectivity = toDateOrNull(body?.effectivity);
  if (date === undefined || effectivity === undefined) {
    return Response.json(
      { success: false, error: "Dates must be valid (YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  if (date && effectivity && effectivity < date) {
    return Response.json(
      { success: false, error: "Effectivity cannot be earlier than the issuance date" },
      { status: 400 },
    );
  }

  await connectDB();
  const existing = await GFPS.findOne({ academic_year: academicYear })
    .select("issuance")
    .lean();
  const previousKey = existing?.issuance?.file?.key || null;

  let file = { key: null, name: "" };
  if (body?.file?.key) {
    const key = String(body.file.key);
    const isOnRecord = key === previousKey;
    const isOwnUpload =
      fileKeyKind(key) === "gfps-issuance" &&
      uploaderOfKey(key) === String(user._id);
    if (!isOnRecord && !isOwnUpload) {
      return Response.json(
        { success: false, error: "Upload the issuance file again, then save." },
        { status: 400 },
      );
    }
    file = {
      key,
      name: String(body.file.name || "").trim().slice(0, 200) || "Issuance",
    };
  }

  const issuance = { number, date, effectivity, file };
  const doc = await GFPS.findOneAndUpdate(
    { academic_year: academicYear },
    { $set: { issuance }, $setOnInsert: { academic_year: academicYear } },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  /* The old file is only removed once the new record is saved, so a failed
     save never leaves the year pointing at a deleted object. */
  if (previousKey && previousKey !== file.key) {
    try {
      await deleteFileFromBucket(previousKey);
    } catch (err) {
      console.error("GFPS issuance: old file not deleted", err);
    }
  }

  await logActivity({
    req,
    action: "GFPS_ISSUANCE_UPDATE",
    description: `GFPS issuance recorded for AY ${academicYear}`,
    resource_type: "gfps",
    resource_id: doc._id,
    severity: "info",
    metadata: {
      academic_year: academicYear,
      number,
      date,
      effectivity,
      has_file: Boolean(file.key),
      replaced_file: Boolean(previousKey && previousKey !== file.key),
    },
  });

  return Response.json({ success: true, data: doc.issuance });
}
