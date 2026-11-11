import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getS3Client, storageBucket, storageConfigProblem } from "@/lib/storage";
import { HeadBucketCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Temporary diagnostic: reports what THIS deployment can see. Never keep. */
function hasQuote(v) { return String(v || "").includes(String.fromCharCode(34)) || String(v || "").includes(String.fromCharCode(39)); }
function hasSpace(v) { return /\s/.test(String(v || "")); }

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const env = process.env;
  const report = {
    problem: storageConfigProblem(),
    STORAGE_ENDPOINT_set: Boolean(env.STORAGE_ENDPOINT),
    STORAGE_ENDPOINT_len: (env.STORAGE_ENDPOINT || "").length,
    STORAGE_ENDPOINT_tail: (env.STORAGE_ENDPOINT || "").slice(-24),
    STORAGE_ENDPOINT_hasQuote: hasQuote(env.STORAGE_ENDPOINT),
    STORAGE_ENDPOINT_hasSpace: hasSpace(env.STORAGE_ENDPOINT),
    AWS_REGION: env.AWS_REGION || null,
    AWS_BUCKET_NAME: env.AWS_BUCKET_NAME || null,
    AWS_BUCKET_NAME_hasQuote: hasQuote(env.AWS_BUCKET_NAME),
    AWS_BUCKET_NAME_hasSpace: hasSpace(env.AWS_BUCKET_NAME),
    AWS_ACCESS_KEY_ID_len: (env.AWS_ACCESS_KEY_ID || "").length,
    AWS_ACCESS_KEY_ID_prefix: (env.AWS_ACCESS_KEY_ID || "").slice(0, 4),
    AWS_SECRET_ACCESS_KEY_len: (env.AWS_SECRET_ACCESS_KEY || "").length,
    AWS_SECRET_ACCESS_KEY_hasQuote: hasQuote(env.AWS_SECRET_ACCESS_KEY),
  };

  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: storageBucket() }));
    report.headBucket = "ok";
  } catch (e) {
    report.headBucket = "FAILED";
    report.error_name = e?.name || null;
    report.error_status = e?.$metadata?.httpStatusCode || null;
    report.error_message = e?.message || String(e);
  }

  return NextResponse.json(report);
}
