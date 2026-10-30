import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import { NextResponse } from "next/server";
import { rateLimiters } from "@/lib/rateLimit";

/* ── Why this route has no audit record ─────────────────────────────────────
 *
 * It serves the public profile-registration page, so it cannot require a
 * session: a first-time registrant has no account yet. A log entry would
 * therefore carry no actor — only a string somebody typed — and the one it
 * would carry is a student or employee ID, which is PII we would be copying
 * into a weakly protected collection in large volume.
 *
 * What it does need is a bound on how fast it can be asked. The endpoint
 * confirms whether an ID exists, which makes it an enumeration oracle: without
 * a limit, a script can walk a plausible ID range and learn who is enrolled or
 * employed. Rate limiting is the control that fits the threat here, and it is
 * applied per source address. */
export async function POST(req) {
  try {
    const limited = await rateLimiters.api(req);
    if (limited.error) {
      return NextResponse.json(
        { exists: false, error: limited.error },
        { status: limited.status, headers: limited.headers },
      );
    }

    await connectDB();
    const body = await req.json();
    const { student_id, employee_id } = body;

    if (student_id) {
      const existing = await Profile.findOne({
        "affiliation.academic_information.student_id": student_id,
      });
      if (existing) {
        return NextResponse.json({
          exists: true,
          message: "This Student ID is already registered in the system",
        });
      }
    }

    if (employee_id) {
      const existing = await Profile.findOne({
        "affiliation.employment_information.employee_id": employee_id,
      });
      if (existing) {
        return NextResponse.json({
          exists: true,
          message: "This Employee ID is already registered in the system",
        });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    return NextResponse.json(
      { exists: false, error: error.message },
      { status: 500 },
    );
  }
}