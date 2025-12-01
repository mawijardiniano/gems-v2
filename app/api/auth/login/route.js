import { connectDB } from "@/lib/db";
import User from "@/models/user";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function POST(req) {
  const { email, password } = await req.json();
  await connectDB();

  const user = await User.findOne({ email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });

  const { password: _, ...userWithoutPassword } = user.toObject();

  return NextResponse.json({ user: userWithoutPassword, token }, { status: 200 });
}
