import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import {
  buildIdentity,
  buildIdentityDedupeKey,
  mapToStagingPayload,
} from "@/app/api/integration/_utils/mapping";

export async function GET(req) {
  try {
    await connectDB();

    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status },
      );
    }

    const batches = await ImportBatch.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ status: "success", data: batches });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status },
      );
    }

    const body = await req.json();
    const sourceType = body.source_type;
    const sourceName = body.source_name || "";
    const sourceFileKey = body.source_file_key || "";
    const defaultSchoolYear = body.school_year || "";
    const defaultSemester = body.semester || "";
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!["hrmis_api", "manual_upload"].includes(sourceType)) {
      return NextResponse.json(
        {
          status: "error",
          message: "source_type must be hrmis_api or manual_upload",
        },
        { status: 400 },
      );
    }

    const seenIdentities = new Set();
    const docs = [];
    let skippedDuplicates = 0;

    for (let idx = 0; idx < rows.length; idx += 1) {
      const raw = rows[idx];
      const mapped = mapToStagingPayload(raw, {
        school_year: defaultSchoolYear,
        semester: defaultSemester,
      });
      const identity = buildIdentity(mapped);
      const dedupeKey = buildIdentityDedupeKey(identity);

      if (dedupeKey && seenIdentities.has(dedupeKey)) {
        skippedDuplicates += 1;
        continue;
      }

      if (dedupeKey) {
        seenIdentities.add(dedupeKey);
      }

      docs.push({
        row_number: idx + 1,
        raw_payload: raw,
        mapped_payload: mapped,
        identity,
        school_year: mapped.school_year || "",
        semester: mapped.semester || "",
        status: "pending",
      });
    }

    const batch = await ImportBatch.create({
      source_type: sourceType,
      source_name: sourceName,
      source_file_key: sourceFileKey,
      created_by: auth.user._id,
      created_by_username: auth.user.username,
      totals: {
        fetched: rows.length,
        skipped: skippedDuplicates,
      },
    });

    if (docs.length > 0) {
      await StagingRecord.insertMany(
        docs.map((doc) => ({ ...doc, batch_id: batch._id })),
        { ordered: false },
      );
    }

    return NextResponse.json(
      {
        status: "success",
        data: {
          batch_id: batch._id,
          source_type: batch.source_type,
          fetched: rows.length,
          staged: docs.length,
          skipped_duplicates: skippedDuplicates,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
