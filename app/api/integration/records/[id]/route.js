import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StagingRecord from "@/models/stagingRecord";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import {
  buildIdentity,
  validateMappedPayload,
} from "@/app/api/integration/_utils/mapping";
import { logActivity, diffFields } from "@/lib/activityLog";

/* Staging payloads contain the same personal data as the live profile, so the
   diff records *that* a field changed without copying its value into the log.
   The audit trail has weaker protection than the vault and must not become a
   second, unprotected copy of the roster. */
const PERSONAL_PATH = /name|birth|sex|gender|address|contact|email|phone|mobile|citizen|religion|civil|disabilit|pwd|salary|tin|gsis|philhealth|pagibig|student_id|employee_id|account_number|password/i;

function personalKeys(payload, prefix = "") {
  const out = [];
  for (const [key, value] of Object.entries(payload || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...personalKeys(value, path));
    } else if (PERSONAL_PATH.test(key)) {
      out.push(path);
    }
  }
  return out;
}

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const auth = await requireIntegrationAccess(req);
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

    /* Snapshot the incoming state before any of the branches below mutate it.
       The diff is only meaningful against what was persisted, and by the time
       we log, `record` already holds the new values. */
    const before = record.toObject();

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

    /* A hand-edit to a staging row is how an operator can put a person into the
       system who was never in the source extract — or quietly change their
       details before migration. It is exactly the kind of change an access
       review looks for, and it is not visible anywhere else. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "IMPORT_RECORD_UPDATE",
      description: `Edited staging record${record.identity?.full_name ? ` for ${record.identity.full_name}` : ""}${
        body.status ? ` (status: ${body.status})` : ""
      }`,
      severity: "warning",
      resource_type: "staging_record",
      resource_id: record._id,
      module: "integration",
      changes: diffFields(
        before.mapped_payload || {},
        record.mapped_payload || {},
        Object.keys({ ...(before.mapped_payload || {}), ...(record.mapped_payload || {}) }),
        {
          /* Every personal key is withheld; the structural ones (school_year,
             semester) are recorded with their values. */
          redactedFields: personalKeys({
            ...(before.mapped_payload || {}),
            ...(record.mapped_payload || {}),
          }),
        },
      ),
      metadata: {
        batch_id: String(record.batch_id || ""),
        status_from: before.status,
        status_to: record.status,
        revalidated: body.revalidate === true,
        validation_errors: record.validation_errors?.length || 0,
      },
    });

    return NextResponse.json({ status: "success", data: record });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
