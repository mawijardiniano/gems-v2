import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";
import { loadDecryptedPii, revealProfilePii } from "@/lib/profileBroker";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    await connectDB();

    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }


    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const user = await UserAuth.findById(userId).select("-password").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await GemsProfile.findById(user.personal_info_id).lean();
    if (!profile) {
      return NextResponse.json({
        success: true,
        hasProfile: false,
        user,
        data: null,
      }, { status: 200 });
    }

    /* Owner read: the caller is looking at their own record, so the full
       identity is always returned. Ownership IS the authorization — going
       through `resolvePiiBatch` would mask a Student or Staff account viewing
       its own profile, which is exactly the case a role check gets wrong.

       Reading the legacy columns directly would come back empty once they are
       stripped, so the vault supplies `personal` / `gadData` / `contact`. A
       profile with no vault row keeps its legacy values (mid-migration) and is
       flagged `masked: false` so the screen still renders. */
    const pii = profile.vaultRef
      ? await loadDecryptedPii(profile.vaultRef)
      : null;

    const revealed = pii ? revealProfilePii(pii) : null;

    /* Only non-null vault values are written over the legacy ones: a vault row
       with a blank field must not erase a legacy value that is still present
       mid-migration. `currentStatus` is GEMS-owned and always survives because
       the legacy block is the base of the merge. */
    const overlay = (base, resolved) => {
      const out = { ...(base || {}) };
      for (const [key, value] of Object.entries(resolved || {})) {
        if (value !== null && value !== undefined) out[key] = value;
      }
      return out;
    };

    const data = {
      ...profile,
      personal: overlay(profile.personal, revealed?.personal),
      gadData: overlay(profile.gadData, revealed?.gadData),
      contact: overlay(profile.contact, revealed?.contact),
      masked: false,
    };

    return NextResponse.json({
      success: true,
      hasProfile: true,
      user,
      data,
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/profile/me error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
