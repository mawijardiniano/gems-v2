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

export async function POST(req) {
  try {
    await connectDB();

    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const body = await req.json();
    const endpoint = body.endpoint;
    const sourceName = body.source_name || "HRMIS API";
    const headers = body.headers || {};
    const defaultSchoolYear = body.school_year || "";
    const defaultSemester = body.semester || "";

    if (!endpoint) {
      return NextResponse.json(
        { status: "error", message: "endpoint is required" },
        { status: 400 },
      );
    }

    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `Failed to fetch endpoint: ${response.status}`,
        },
        { status: 400 },
      );
    }

    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : [];

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
      source_type: "hrmis_api",
      source_name: sourceName,
      status: "pending",
      created_by: auth.user._id,
      created_by_username: auth.user.username,
      totals: { fetched: rows.length, skipped: skippedDuplicates },
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
