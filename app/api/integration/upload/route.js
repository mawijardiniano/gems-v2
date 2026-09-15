import { NextResponse } from "next/server";
import csv from "csvtojson";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { stageRows } from "@/app/api/integration/_utils/staging";

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

    const { batch, insertedCount, duplicateCount } = await stageRows({
      rows,
      sourceType: "manual_upload",
      sourceName: name,
      sourceFileKey: name,
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
          source_name: name,
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
