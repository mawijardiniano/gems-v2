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
      const decoded = jwt.verify(token, JWT_SECRET);

      if (pathname.startsWith("/api/auth") && decoded.role !== "Admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

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
