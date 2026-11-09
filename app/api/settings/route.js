import { connectDB } from "@/lib/db";
import SystemSetting from "@/models/systemSetting";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireAuth } from "@/lib/auth";
import { logActivity, diffFields } from "@/lib/activityLog";
import { normalizeAcademicYear } from "@/lib/academicYear";
import { SIGNATORY_SLOTS, withoutMiddleName } from "@/lib/signatories";

const JWT_SECRET = process.env.JWT_SECRET;

/* Roles allowed to write a setting, per key.
 *
 * `report_signatories` holds the names printed on the GPB and the GAD-AR —
 * the GAD Focal Person's own signature. Ownership follows the document: the
 * Focal Person signs it, the admin can always correct it. The coordinator is
 * deliberately NOT here, even though it maintains GPB content day to day:
 * the signature must stay with the person whose name is on it.
 *
 * `active_term` decides which academic year every later record is filed under,
 * so it keeps the system administrators. This widening is scoped to the one
 * key and does not touch `active_term` or anything added later. */
const SETTING_WRITE_ROLES = {
  report_signatories: ["admin", "gad focal person"],
};

/** Roles permitted to write `key`; defaults to system administrators only. */
function writeRolesFor(key) {
  return SETTING_WRITE_ROLES[key] || ["admin", "ictu director"];
}

/**
 * Verifies the request's role and returns the writer's id when it may write
 * `key`, or null when it may not. Reading the role from the verified token
 * (never the body) keeps a caller from granting itself a role.
 */
function getWriterId(req, key) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const role = String(decoded.role || "").toLowerCase();
    return writeRolesFor(key).includes(role) ? decoded.id : null;
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
    const { user, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const { key } = body;
    let { value } = body;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: "key and value are required" },
        { status: 400 },
      );
    }

    const writerId = getWriterId(req, key);
    if (!writerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    await connectDB();

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

    /* Report signatories are keyed BY ACADEMIC YEAR so a GPB from an earlier
       year keeps the names that were in post then. Two rules matter:
         - the year must be well formed, or the entry can never be found again
         - the bookkeeping stamps are written here, never accepted from the
           body, so a caller cannot claim someone else last edited it. */
    if (key === "report_signatories") {
      const invalidYear = Object.keys(value).find(
        (year) =>
          !["updated_by", "updated_by_username", "updated_at"].includes(year) &&
          !normalizeAcademicYear(year),
      );
      if (invalidYear) {
        return NextResponse.json(
          {
            success: false,
            error: `report_signatories keys must be academic years like 2025-2026 (got "${invalidYear}")`,
          },
          { status: 400 },
        );
      }

      const entries = Object.entries(value).filter(
        ([year]) => !["updated_by", "updated_by_username", "updated_at"].includes(year),
      );
      if (!entries.length) {
        return NextResponse.json(
          { success: false, error: "report_signatories requires at least one academic year" },
          { status: 400 },
        );
      }

      for (const [year, entry] of entries) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return NextResponse.json(
            { success: false, error: `report_signatories["${year}"] must be an object` },
            { status: 400 },
          );
        }
        for (const [slot, person] of Object.entries(entry)) {
          if (!SIGNATORY_SLOTS.includes(slot)) {
            return NextResponse.json(
              {
                success: false,
                error: `Unknown signatory "${slot}" in ${year}. Allowed: ${SIGNATORY_SLOTS.join(", ")}`,
              },
              { status: 400 },
            );
          }
          /* Two accepted shapes: a plain typed name, or the richer
             `{ name, profile_id, source }` written when a person was picked from
             the directory. Only `name` is printed; `profile_id` is provenance. */
          if (typeof person === "string") continue;
          if (!person || typeof person !== "object" || Array.isArray(person)) {
            return NextResponse.json(
              { success: false, error: `${slot} in ${year} must be a name or a { name } object` },
              { status: 400 },
            );
          }
          if (typeof person.name !== "string" || !person.name.trim()) {
            return NextResponse.json(
              { success: false, error: `${slot} in ${year} requires a non-empty name` },
              { status: 400 },
            );
          }
          if (
            person.name.length > 200 ||
            (person.profile_id != null && typeof person.profile_id !== "string")
          ) {
            return NextResponse.json(
              { success: false, error: `${slot} in ${year} has an invalid name or profile_id` },
              { status: 400 },
            );
          }
        }
      }

      /* Persist the normalized shape so a typed string and a picked person are
         stored identically — the reader would otherwise have to special-case
         each form on every render. The name is also stripped of a middle name
         here, so what is stored is already what prints. */
      const stamped = {};
      for (const [year, entry] of entries) {
        const slotValues = {};
        for (const slot of SIGNATORY_SLOTS) {
          const person = entry[slot];
          if (person === undefined) continue;
          if (typeof person === "string") {
            const name = withoutMiddleName(person);
            if (!name) continue;
            slotValues[slot] = { name, profile_id: null, source: "manual" };
          } else {
            slotValues[slot] = {
              name: withoutMiddleName(person.name),
              profile_id: person.profile_id ? String(person.profile_id) : null,
              source: person.source === "directory" ? "directory" : "manual",
            };
          }
        }
        stamped[year] = slotValues;
      }
      stamped.updated_by = writerId;
      stamped.updated_by_username = user?.username || "";
      stamped.updated_at = new Date();
      value = stamped;
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