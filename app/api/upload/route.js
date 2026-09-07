import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimiters } from "@/lib/rateLimit";
import { normalizeRole } from "@/lib/notifications";
import Project from "@/models/projects";
import Event from "@/models/event";
import AccomplishmentReport from "@/models/accomplishment_report";
import GPB from "@/models/gpb";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
};

const BLOCKED_MIME_TYPES = ["text/html", "application/xhtml+xml", "image/svg+xml"];

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


async function canDeleteLegacyKey(key, userId, canManageGPB) {
  await connectDB();

  const [foreignProject, foreignEvent, foreignReport, gpbReference] =
    await Promise.all([
      Project.exists({
        "expenditure_evidence.key": key,
        createdBy: { $ne: userId },
      }),
      Event.exists({
        "event_poster.key": key,
        created_by: { $ne: userId },
      }),
      AccomplishmentReport.exists({
        $or: [
          { "office_memorandum.key": key },
          { "activity_design.key": key },
          { "attendance_sheet.key": key },
          { photos: { $elemMatch: { key } } },
          { other_attachments: { $elemMatch: { key } } },
        ],
        submitted_by: { $ne: userId },
      }),
      GPB.exists({ "status_of_gpb.scanned_copy.key": key }),
    ]);

  if (foreignProject || foreignEvent || foreignReport) {
    return false;
  }
  if (gpbReference && !canManageGPB) {
    return false;
  }
  return true;
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
        { status: rateLimitResult.status, headers: rateLimitResult.headers }
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
        { status: 400 }
      );
    }

    const key = `${folder}/${user._id}/${Date.now()}-${sanitizeFileName(file.name)}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return Response.json({
      message: "Upload successful",
      url: fileUrl,
      key,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return Response.json(
      { error: "Upload failed", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const rateLimitResult = await rateLimiters.upload(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers }
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
      allowed = await canDeleteLegacyKey(
        normalizedKey,
        user._id,
        GPB_MANAGEMENT_ROLES.includes(normalizeRole(user?.role)),
      );
    }

    if (!allowed) {
      return Response.json(
        { error: "You can only delete files you uploaded" },
        { status: 403 },
      );
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: normalizedKey,
      })
    );

    return Response.json({
      message: "File deleted successfully",
    });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return Response.json(
      { error: "Delete failed", details: err.message },
      { status: 500 }
    );
  }
}