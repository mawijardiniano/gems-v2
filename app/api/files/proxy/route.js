import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { requireAuth } from "@/data/lib/auth";
import { NextResponse } from "next/server";
import { getS3Client, storageBucket } from "@/data/lib/storage";
import { connectDB } from "@/data/lib/db";
import { canReadStoredFile } from "@/data/lib/fileAccess";

const s3 = getS3Client;

export async function GET(req) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
  }

  /* A key must belong to a record the caller may read; any signed-in
     account used to read any file whose key it knew. Not-found and
     not-allowed answer the same, so keys cannot be probed. */
  await connectDB();
  if (!(await canReadStoredFile(user, key))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const response = await s3().send(
      new GetObjectCommand({
        Bucket: storageBucket(),
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
