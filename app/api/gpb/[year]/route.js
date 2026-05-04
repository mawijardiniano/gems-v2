import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import "@/models/event";
import "@/models/gaa_budget";
import "@/models/projects";

export async function GET(req, { params }) {
  await connectDB();

  const { year } = await params;

  const gpb = await GPB.findOne({ year })
    .populate({
      path: "projects",
      populate: {
        path: "events",
        model: "Event",
      },
    })
    .populate("gaaBudgetId"); 

  if (!gpb) {
    return Response.json(
      { message: "GPB not found" },
      { status: 404 }
    );
  }

  return Response.json({ data: gpb });
}


export async function DELETE(req, { params }) {
  await connectDB();

  const { year } = await params;

  const gpb = await GPB.findOneAndDelete({
    year: Number(year),
  });

  if (!gpb) {
    return Response.json(
      { message: "GPB not found" },
      { status: 404 }
    );
  }

  return Response.json({
    message: "GPB deleted successfully",
    data: gpb,
  });
}