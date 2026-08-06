import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StagingRecord from "@/models/stagingRecord";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import {
  buildIdentity,
  validateMappedPayload,
} from "@/app/api/integration/_utils/mapping";

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const { id } = await params;
    const body = await req.json();

    const record = await StagingRecord.findById(id);
    if (!record) {
      return NextResponse.json(
        { status: "error", message: "Staging record not found" },
        { status: 404 },
      );
    }

    if (body.mapped_payload) {
      record.mapped_payload = body.mapped_payload;
      record.identity = buildIdentity(body.mapped_payload);
      record.school_year = body.mapped_payload.school_year || "";
      record.semester = body.mapped_payload.semester || "";
    }

    if (
      body.status &&
      ["approved", "rejected", "pending"].includes(body.status)
    ) {
      record.status = body.status;
      record.reviewed_by = auth.user._id;
      record.reviewed_at = new Date();
    }

    if (body.revalidate === true) {
      const errors = validateMappedPayload(record.mapped_payload || {});
      record.validation_errors = errors;
      record.status = errors.length ? "invalid" : "valid";
    }

    await record.save();

    return NextResponse.json({ status: "success", data: record });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
