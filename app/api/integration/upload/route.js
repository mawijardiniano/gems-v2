import { NextResponse } from "next/server";
import csv from "csvtojson";
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

    const formData = await req.formData();
    const file = formData.get("file");
    const defaultSchoolYear = formData.get("school_year") || "";
    const defaultSemester = formData.get("semester") || "";

    if (!file) {
      return NextResponse.json(
        { status: "error", message: "file is required" },
        { status: 400 },
      );
    }

    const name = file.name || "upload.csv";
    const lower = name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      return NextResponse.json(
        { status: "error", message: "Only .csv or .xlsx files are allowed" },
        { status: 400 },
      );
    }

    if (lower.endsWith(".xlsx")) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "XLSX parsing is not enabled yet in this build. Install and wire the xlsx parser first.",
        },
        { status: 400 },
      );
    }

    const text = await file.text();
    const rows = await csv().fromString(text);

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
      source_type: "manual_upload",
      source_name: name,
      source_file_key: name,
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
          source_name: name,
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
