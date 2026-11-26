import { NextResponse } from "next/server";
import { loadFieldMapping } from "@/app/api/integration/_utils/fieldMapping";
import csv from "csvtojson";
import { connectDB } from "@/data/lib/db";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import {
  stageRows,
  MAX_BATCH_ROWS,
  MAX_SOURCE_BYTES,
} from "@/app/api/integration/_utils/staging";
import { readXlsxRows } from "@/app/api/integration/_utils/xlsxRows";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
import { logActivity } from "@/data/lib/activityLog";

export async function POST(req) {
  try {
    await connectDB();

    const auth = await requireIntegrationAccess(req);
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
    const isXlsx = lower.endsWith(".xlsx");
    if (!lower.endsWith(".csv") && !isXlsx) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Only .csv and .xlsx files are allowed. Save older .xls files as .xlsx first.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_SOURCE_BYTES) {
      return NextResponse.json(
        {
          status: "error",
          message: `File is too large (max ${MAX_SOURCE_BYTES / 1024 / 1024} MB).`,
        },
        { status: 413 },
      );
    }

    let rows;
    if (isXlsx) {
      /* First visible sheet, header row first; values come back as text,
         the same as from a CSV. */
      const parsed = await readXlsxRows(Buffer.from(await file.arrayBuffer()));
      if (parsed.error) {
        return NextResponse.json(
          { status: "error", message: parsed.error },
          { status: 400 },
        );
      }
      rows = parsed.rows;
    } else {
      const text = await file.text();
      rows = await csv().fromString(text);
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { status: "error", message: "The file has no data rows." },
        { status: 400 },
      );
    }
    if (rows.length > MAX_BATCH_ROWS) {
      return NextResponse.json(
        {
          status: "error",
          message: `File has ${rows.length} rows; split it into files of at most ${MAX_BATCH_ROWS}.`,
        },
        { status: 413 },
      );
    }

    const { batch, insertedCount, duplicateCount, sameAs, headerReport } =
      await stageRows({
        rows,
        sourceType: "manual_upload",
        sourceName: name,
        sourceFileKey: name,
        createdBy: auth.user._id,
        createdByUsername: auth.user.username,
        customHeaders: await loadFieldMapping(),
        defaults: {
          school_year: defaultSchoolYear,
          semester: defaultSemester,
        },
      });

    await writeSyncLog({
      batchId: batch._id,
      action: "sync",
      message: `Uploaded ${rows.length} row(s) from ${name} (${insertedCount} staged, ${duplicateCount} duplicates flagged)`,
      details: {
        source_name: name,
        fetched: rows.length,
        staged: insertedCount,
        duplicates_flagged: duplicateCount,
      },
      executedBy: auth.user._id,
      executedByUsername: auth.user.username,
    });

    /* An upload stages a batch of people for import. Logged here so the trail
       shows who introduced the batch, not only who later approved it. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "IMPORT_BATCH_UPLOAD",
      description: `Uploaded import batch ${name} (${insertedCount} staged)`,
      severity: "warning",
      resource_type: "import_batch",
      resource_id: batch._id,
      module: "integration",
      metadata: {
        source_name: name,
        fetched: rows.length,
        staged: insertedCount,
        duplicates_flagged: duplicateCount,
        same_content_as: sameAs ? String(sameAs.batch_id) : null,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        data: {
          batch_id: batch._id,
          source_name: name,
          fetched: rows.length,
          staged: insertedCount,
          duplicates_flagged: duplicateCount,
          same_as: sameAs,
          header_problems: headerReport.problems,
          unused_columns: headerReport.unrecognized,
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
