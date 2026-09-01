import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get("key");
    const name = searchParams.get("name");

    if (!rawKey) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    let key;
    try {
      key = decodeURIComponent(rawKey);
    } catch {
      key = rawKey;
    }
    key = key.replace(/\\/g, "/");

    if (!key || key.startsWith("/") || key.split("/").includes("..")) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const object = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
    );

    const body = await object.Body.transformToByteArray();
    const buffer = Buffer.from(body);

    const fallbackName = key.split("/").pop() || "file";
    const filename =
      (name || fallbackName).replace(/[\r\n"\\]/g, "").trim() || fallbackName;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": object.ContentType || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err.name === "NoSuchKey") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("DOWNLOAD ERROR:", err);
    return NextResponse.json(
      { error: "Download failed", details: err.message },
      { status: 500 }
    );
  }
}