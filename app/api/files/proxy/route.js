import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
  }

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
    );

    const headers = {
      "Content-Type": response.ContentType || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    };
    if (response.ContentLength != null) {
      headers["Content-Length"] = String(response.ContentLength);
    }

    return new NextResponse(Readable.toWeb(response.Body), { headers });
  } catch (err) {

    const isNotFound =
      err?.name === "NoSuchKey" ||
      err?.name === "NotFound" ||
      err?.$metadata?.httpStatusCode === 404;
    if (isNotFound) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("FILE PROXY ERROR:", err);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}
