import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.set("auth_token", "", { maxAge: 0, path: "/", httpOnly: true });
  return response;
}
