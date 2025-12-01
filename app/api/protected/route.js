import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ message: `Hello Admin ${decoded.email}` });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
