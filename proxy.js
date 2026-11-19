import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function proxy(req) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (
    (pathname.startsWith("/api/profile") && (method === "GET" || method === "PUT" || method === "DELETE")) ||
    pathname.startsWith("/api/auth/protected") ||
    pathname === "/api/auth/users"
  ) {
    const token = req.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }
    try {
      jwt.verify(token, JWT_SECRET);

      /* No role check here: the role inside a token is the role at login,
         so it let a demoted Admin past and blocked a newly promoted one.
         Each route checks the account's current role in the database
         (requireAdmin / requireRole / requireStaff). */
      return NextResponse.next();
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/auth/protected/:path*",
    "/api/auth/users",
    "/api/profile/:path*", 
  ],
};
