import jwt from "jsonwebtoken";
import UserAuth from "@/models/user";
import { rateLimiters } from "@/lib/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET;

export async function requireAdmin(req) {

  const rateLimitResult = await rateLimiters.integration(req);
  if (rateLimitResult.error) {
    return { error: rateLimitResult.error, status: rateLimitResult.status, headers: rateLimitResult.headers };
  }

  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return { error: "No token provided", status: 401 };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return { error: "Invalid token", status: 401 };
  }

  const user = await UserAuth.findById(decoded.id).lean();
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  if (user.role !== "Admin") {
    return { error: "Forbidden: Admins only", status: 403 };
  }

  return { user };
}
