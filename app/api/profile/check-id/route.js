import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
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