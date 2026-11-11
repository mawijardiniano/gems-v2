import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, storageBucket, storageConfigProblem } from "@/lib/storage";

export async function deleteFileFromBucket(key) {
  if (!key) return;
  if (storageConfigProblem()) {
    /* Cascading deletes run from routes that must not fail wholesale because
       storage is unconfigured in this environment. */
    console.warn(`lib/delete: storage not configured, leaving ${key} in place`);
    return;
  }

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: storageBucket(),
      Key: key,
    })
  );
}