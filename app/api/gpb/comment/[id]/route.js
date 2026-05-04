import {connectDB} from "@/lib/db";
import GPB from "@/models/gpb";

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    const gpb = await GPB.findById(id)
  .populate({
    path: "comments.userId",
    populate: {
      path: "personal_info_id",
      model: "GemsProfile",
    },
  });

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    return Response.json(gpb.comments);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { userId, message, type } = await req.json();

    if (!userId || !message) {
      return Response.json(
        { error: "userId and message are required" },
        { status: 400 }
      );
    }

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    const newComment = {
      userId,
      message,
      type,
    };

    gpb.comments.push(newComment);
    await gpb.save();

    return Response.json({
      success: true,
      comment: gpb.comments[gpb.comments.length - 1],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { commentId } = await req.json();

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    gpb.comments = gpb.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await gpb.save();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}