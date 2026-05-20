import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json(
        { error: "GPB Status not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: gpb.status_of_gpb,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { status, reason, scanned_copy } = await req.json();

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    gpb.status_of_gpb = {
      status: status || gpb.status_of_gpb?.status || "draft",
      reason: reason || gpb.status_of_gpb?.reason || "",
      scanned_copy: {
        url: scanned_copy?.url || "",
        key: scanned_copy?.key || "",
      },
    };

    await gpb.save();

    return Response.json({
      success: true,
      data: gpb.status_of_gpb,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
