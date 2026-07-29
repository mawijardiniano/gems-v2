import { connectDB } from "@/lib/db";
import SystemSetting from "@/models/systemSetting";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function getAdminId(req) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === "Admin" || decoded.role === "admin" ? decoded.id : null;
  } catch {
    return null;
  }
}

// GET /api/settings?key=active_term
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "key query parameter is required" },
        { status: 400 },
      );
    }

    const setting = await SystemSetting.findOne({ key }).lean();

    if (!setting) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: { key: setting.key, value: setting.value },
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// PUT /api/settings
// Body: { key: "active_term", value: { school_year: "...", semester: "..." } }
export async function PUT(req) {
  try {
    const adminId = getAdminId(req);
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await req.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: "key and value are required" },
        { status: 400 },
      );
    }

    if (key === "active_term") {
      if (!value.school_year || !value.semester) {
        return NextResponse.json(
          { success: false, error: "active_term requires school_year and semester" },
          { status: 400 },
        );
      }
      const validSemesters = ["1st", "2nd", "Summer"];
      if (!validSemesters.includes(value.semester)) {
        return NextResponse.json(
          { success: false, error: `semester must be one of: ${validSemesters.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true, runValidators: true },
    );

    return NextResponse.json({
      success: true,
      data: { key: setting.key, value: setting.value },
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}