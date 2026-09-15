import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/importBatch";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { stageRows } from "@/app/api/integration/_utils/staging";

export async function GET(req) {
  try {
    await connectDB();

    const auth = await requireIntegrationAccess(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
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

    const auth = await requireIntegrationAccess(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
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

    const { batch, insertedCount, duplicateCount } = await stageRows({
      rows,
      sourceType,
      sourceName,
      sourceFileKey,
      createdBy: auth.user._id,
      createdByUsername: auth.user.username,
      defaults: {
        school_year: defaultSchoolYear,
        semester: defaultSemester,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        data: {
          batch_id: batch._id,
          source_type: batch.source_type,
          fetched: rows.length,
          staged: insertedCount,
          duplicates_flagged: duplicateCount,
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
