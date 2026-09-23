import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rateLimiters } from "@/lib/rateLimit";
import { logActivity } from "@/lib/activityLog";
import { normalizeRole } from "@/lib/notifications";
import KnowledgeResource from "@/models/knowledgeResource";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_ROLES,
  MAX_FILE_SIZE,
  S3_FOLDER,
  escapeRegex,
  sanitizeFileName,
  validateKnowledgeFile,
} from "@/lib/knowledgeResources";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    if (!KNOWLEDGE_ROLES.includes(normalizeRole(user?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();

    const query = { is_active: true };

    if (category && KNOWLEDGE_CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (search) {
      const pattern = escapeRegex(search);
      query.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { "file.name": { $regex: pattern, $options: "i" } },
        { uploaded_by_name: { $regex: pattern, $options: "i" } },
      ];
    }

    const resources = await KnowledgeResource.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: resources });
  } catch (err) {
    console.error("KNOWLEDGE RESOURCES GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load knowledge resources" },
      { status: 500 }
    );
  }
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

    if (!KNOWLEDGE_ROLES.includes(normalizeRole(user?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (!KNOWLEDGE_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileError = validateKnowledgeFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the maximum allowed size (25MB)" },
        { status: 400 }
      );
    }

    const key = `${S3_FOLDER}/${user._id}/${Date.now()}-${sanitizeFileName(
      file.name
    )}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    await connectDB();

    const resource = await KnowledgeResource.create({
      title,
      category,
      file: {
        url: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`,
        key,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      },
      uploaded_by: user._id,
      uploaded_by_name: user.username || "",
      uploaded_by_role: user.role || "",
    });

    await logActivity({
      req,
      action: "KNOWLEDGE_RESOURCE_CREATE",
      description: `Knowledge resource uploaded: ${title} (${category})`,
      resource_type: "knowledge_resource",
      resource_id: resource._id,
      severity: "info",
    });

    return NextResponse.json({ success: true, data: resource }, { status: 201 });
  } catch (err) {
    console.error("KNOWLEDGE RESOURCES POST ERROR:", err);
    return NextResponse.json(
      { error: "Upload failed", details: err.message },
      { status: 500 }
    );
  }
}
