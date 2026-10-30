import { connectDB } from "@/lib/db";
import SystemSetting from "@/models/systemSetting";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireAuth } from "@/lib/auth";
import { logActivity, diffFields } from "@/lib/activityLog";

const JWT_SECRET = process.env.JWT_SECRET;

function getAdminId(req) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const role = String(decoded.role || "").toLowerCase();
    return role === "admin" || role === "ictu director" ? decoded.id : null;
  } catch {
    return null;
  }
}

// GET /api/settings?key=active_term
export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

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
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

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

    /* Snapshot the previous value before overwriting.
     *
     * `active_term` decides which academic year every later record is filed
     * under, so changing it retroactively re-files nothing but prospectively
     * mis-files everything. Reconstructing "when did we move to 2nd sem" from
     * the current value alone is impossible; the old value has to be captured
     * at the moment of the write. */
    const previous = await SystemSetting.findOne({ key }).lean();

    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true, runValidators: true },
    );

    const changes = diffFields(
      { value: previous?.value ?? null },
      { value: setting.value },
      ["value"],
    );

    await logActivity({
      req,
      action: previous ? "SETTING_UPDATE" : "SETTING_CREATE",
      description: previous
        ? `Updated system setting "${key}"`
        : `Created system setting "${key}"`,
      severity: "warning",
      resource_type: "system_setting",
      resource_id: setting._id,
      module: "settings",
      changes,
      metadata: {
        key,
        previous_value: previous?.value ?? null,
        new_value: setting.value,
      },
    });

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