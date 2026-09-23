import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { normalizeRole } from "@/lib/notifications";
import KnowledgeResource from "@/models/knowledgeResource";
import {
  DELETE_ANY_ROLES,
  KNOWLEDGE_ROLES,
} from "@/lib/knowledgeResources";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function DELETE(req, { params }) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const role = normalizeRole(user?.role);
    if (!KNOWLEDGE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await connectDB();

    const resource = await KnowledgeResource.findById(id);
    if (!resource || !resource.is_active) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const isOwner =
      String(resource.uploaded_by || "") === String(user._id || "");
    const canDeleteAny = DELETE_ANY_ROLES.includes(role);

    if (!isOwner && !canDeleteAny) {
      return NextResponse.json(
        { error: "You can only delete documents you uploaded" },
        { status: 403 }
      );
    }

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: resource.file?.key,
        })
      );
    } catch (s3Err) {
      console.error("KNOWLEDGE RESOURCE S3 DELETE ERROR:", s3Err);
    }

    await KnowledgeResource.findByIdAndDelete(id);

    await logActivity({
      req,
      action: "KNOWLEDGE_RESOURCE_DELETE",
      description: `Knowledge resource deleted: ${resource.title}`,
      resource_type: "knowledge_resource",
      resource_id: resource._id,
      severity: "warning",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("KNOWLEDGE RESOURCES DELETE ERROR:", err);
    return NextResponse.json(
      { error: "Delete failed", details: err.message },
      { status: 500 }
    );
  }
}
