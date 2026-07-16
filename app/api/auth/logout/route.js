import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";

export async function POST(req) {
  await logActivity({
    req,
    action: "LOGOUT",
    description: "User logged out",
    resource_type: "user",
    severity: "info",
  });

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.set("auth_token", "", { maxAge: 0, path: "/", httpOnly: true });
  return response;
}
