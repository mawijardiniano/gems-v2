import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "uploads"; // default to uploads

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

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
    const { key } = await req.json();

    if (!key) {
      return Response.json({ error: "key is required" }, { status: 400 });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
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