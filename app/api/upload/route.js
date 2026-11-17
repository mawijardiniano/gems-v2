import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth } from "@/data/lib/auth";
import { connectDB } from "@/data/lib/db";
import { NextResponse } from "next/server";
import { rateLimiters } from "@/data/lib/rateLimit";
import { normalizeRole } from "@/data/lib/notifications";
import Project from "@/models/projects";
import Event from "@/models/event";
import AccomplishmentReport from "@/models/accomplishment_report";
import GPB from "@/models/gpb";
import AcademicProject from "@/models/academicProject";
import ResearchExtensionProject from "@/models/researchExtensionProject";
import { isProjectManagerRole } from "@/data/lib/projectAccess";
import { getS3Client, storageBucket, buildObjectUrl } from "@/data/lib/storage";

const s3 = getS3Client;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const PDF_EXTS = [".pdf"];
const DOC_EXTS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];

const FOLDER_RULES = {
  "events/posters": IMAGE_EXTS,
  "reports/photos": IMAGE_EXTS,
  "reports/memorandum": [...IMAGE_EXTS, ...PDF_EXTS],
  "reports/activity-design": [...IMAGE_EXTS, ...PDF_EXTS],
  "reports/attendance": [...IMAGE_EXTS, ...PDF_EXTS],
  "reports/other-attachments": [...IMAGE_EXTS, ...PDF_EXTS, ...DOC_EXTS],
  "status/scanned": [...IMAGE_EXTS, ...PDF_EXTS],
  "expenditure-evidence": [".pdf", ".jpg", ".jpeg", ".png"],
  /* Proof files attached to completed project milestones. */
  "milestone-proof": [".pdf", ".jpg", ".jpeg", ".png"],
};

const BLOCKED_MIME_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
];

function getFileExtension(name) {
  const idx = String(name || "").lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

function sanitizeFileName(name) {
  const base = String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.slice(-120) || "file";
}

function validateUploadTarget(file, folder) {
  const allowedExts = FOLDER_RULES[folder];
  if (!allowedExts) {
    return "Invalid upload folder";
  }
  const ext = getFileExtension(file.name);
  if (!ext || !allowedExts.includes(ext)) {
    return `File type not allowed in this folder (allowed: ${allowedExts.join(", ")})`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File exceeds the maximum allowed size (25MB)";
  }
  if (BLOCKED_MIME_TYPES.includes(file.type)) {
    return "File type not allowed";
  }
  return null;
}

const GPB_MANAGEMENT_ROLES = [
  "admin",
  "planning director",
  "suc president",
  "gad focal person",
];

/* Module projects (Academic, Research & Extension) let these roles edit any
   project, as in data/lib/simpleProjectApi.js. */
const MODULE_EDITOR_ROLES = ["gad focal person", "gad coordinator", "admin"];

/**
 * Whether `user` may delete a stored file that is not in their own upload
 * folder: only when the file is attached to at least one record and the
 * caller may manage every record it is attached to.
 *
 * This replaces a check that allowed the delete whenever *no one else's*
 * record referenced the key. That check never looked at Academic or R&E
 * projects, so anyone could delete their evidence and milestone proofs, and it
 * let anyone delete another user's unattached uploads.
 */
async function canDeleteReferencedKey(key, user, canManageGPB) {
  await connectDB();

  const fileQuery = {
    $or: [{ "expenditure_evidence.key": key }, { "milestones.proofs.key": key }],
  };
  const [gadProjects, academic, research, events, reports, gpbRef] =
    await Promise.all([
      Project.find(fileQuery).select("createdBy").lean(),
      AcademicProject.find(fileQuery).select("createdBy").lean(),
      ResearchExtensionProject.find(fileQuery).select("createdBy").lean(),
      Event.find({ "event_poster.key": key }).select("created_by").lean(),
      AccomplishmentReport.find({
        $or: [
          { "office_memorandum.key": key },
          { "activity_design.key": key },
          { "attendance_sheet.key": key },
          { photos: { $elemMatch: { key } } },
          { other_attachments: { $elemMatch: { key } } },
        ],
      })
        .select("submitted_by")
        .lean(),
      GPB.exists({ "status_of_gpb.scanned_copy.key": key }),
    ]);

  const me = String(user?._id);
  const role = normalizeRole(user?.role);
  const owns = (id) => String(id) === me;

  const checks = [
    ...gadProjects.map(
      (p) => owns(p.createdBy) || isProjectManagerRole(user?.role),
    ),
    ...[...academic, ...research].map(
      (p) => owns(p.createdBy) || MODULE_EDITOR_ROLES.includes(role),
    ),
    ...events.map((e) => owns(e.created_by)),
    ...reports.map((r) => owns(r.submitted_by)),
    ...(gpbRef ? [canManageGPB] : []),
  ];

  return checks.length > 0 && checks.every(Boolean);
}

function isKeyOwnedByCaller(key, user) {
  const segments = key.split("/");
  const folder = segments[0];
  if (!FOLDER_RULES[folder]) return false;
  if (["Admin", "admin"].includes(user?.role)) return true;
  return segments[1] === String(user._id);
}


function isSafeKey(key) {
  return Boolean(key) && !key.startsWith("/") && !key.split("/").includes("..");
}

export async function POST(req) {
  try {
    const rateLimitResult = await rateLimiters.upload(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers },
      );
    }

    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validationError = validateUploadTarget(file, folder);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File exceeds the maximum allowed size (25MB)" },
        { status: 400 },
      );
    }

    const key = `${folder}/${user._id}/${Date.now()}-${sanitizeFileName(file.name)}`;

    await s3().send(
      new PutObjectCommand({
        Bucket: storageBucket(),
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    /* The key is the durable identifier: reads resolve through
       `getFileSourceUrl`, which prefers it. A URL is still stored for older
       consumers, but it must not name the storage provider — that is how the
       previous provider's hostname ended up frozen into every document. */
    const fileUrl = buildObjectUrl(key);

    return Response.json({
      message: "Upload successful",
      url: fileUrl,
      key,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return Response.json(
      { error: "Upload failed", details: err.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const rateLimitResult = await rateLimiters.upload(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers },
      );
    }

    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { key } = await req.json();

    if (!key) {
      return Response.json({ error: "key is required" }, { status: 400 });
    }
    const normalizedKey = String(key).replace(/\\/g, "/");
    if (!isSafeKey(normalizedKey)) {
      return Response.json({ error: "Invalid key" }, { status: 400 });
    }

    let allowed = isKeyOwnedByCaller(normalizedKey, user);

    if (!allowed) {
      allowed = await canDeleteReferencedKey(
        normalizedKey,
        user,
        GPB_MANAGEMENT_ROLES.includes(normalizeRole(user?.role)),
      );
    }

    if (!allowed) {
      return Response.json(
        { error: "You can only delete files you uploaded" },
        { status: 403 },
      );
    }

    await s3().send(
      new DeleteObjectCommand({
        Bucket: storageBucket(),
        Key: normalizedKey,
      }),
    );

    return Response.json({
      message: "File deleted successfully",
    });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return Response.json(
      { error: "Delete failed", details: err.message },
      { status: 500 },
    );
  }
}
