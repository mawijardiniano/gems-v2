import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { logActivity, logPiiAccess } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { applyRowPii, resolvePii } from "@/lib/profileBroker";
import { extractPiiFromProfile, savePii } from "@/lib/vaultWriter";

/*
 * Re-writes the vaulted copy of a profile's PII after an update.
 *
 * Best-effort by design: the legacy fields on the GEMS document are still the
 * source of truth during the migration, so a vault hiccup must not fail the
 * user's save. The profile row records `migrationStatus` so a missed write is
 * visible to scripts/verify-no-pii.mjs and can be replayed.
 */
async function syncVault(profile, body) {
  const existing = extractPiiFromProfile({
    personal: profile.personal,
    gadData: profile.gadData,
    contact: profile.contact,
  });
  const incoming = extractPiiFromProfile({
    personal: body.personal,
    gadData: body.gadData,
    contact: body.contact,
  });

  const { patch } = await savePii({
    profileId: profile._id,
    vaultRef: profile.vaultRef,
    pii: incoming,
    mergedWith: existing,
    ownerType: "profile",
  });

  return patch;
}

export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 },
    );

  await connectDB();
  const profile = await UserAuth.findById(id)
    .populate("personal_info_id")
    .lean();
  if (!profile)
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 },
    );

  /* The caller's role decides masked vs. revealed: Admin and the GAD Focal
     Person get the real identity, everyone else gets initials. Identifiers
     (the affiliation block, the status mirror, the user account itself) always
     come straight from the GEMS document. */
  const role = user?.role || null;
  const gem = profile.personal_info_id;

  const resolved = await resolvePii({
    vaultRef: gem?.vaultRef || null,
    role,
  });

  const data = gem
    ? (() => {
        /* `vaultRef` and `migrationStatus` are internal: the ref was used to
           resolve the identity above and must not reach the browser, and the
           migration state is exposed through the `vaulted` boolean instead. */
        const { vaultRef: _vaultRef, migrationStatus: _migrationStatus, ...safeGem } =
          gem;
        return {
          ...profile,
          /* `migrationStatus` records whether the row was migrated into the
             vault. It is the only correct signal: `vaultRef` is present on
             every row, migrated or not, so `Boolean(vaultRef)` was always true
             and reported an unmigrated profile as vaulted. */
          vaulted: gem?.migrationStatus === "vaulted",
          personal_info_id: {
            ...safeGem,
            ...applyRowPii(
              {
                /* The plaintext blocks were stripped, so there is no legacy hash
                   to fall back to: the vault is the only source now. */
                personal: {},
                gadData: {},
                contact: {},
                /* Resolves `person_type` for the status mirror. */
                affiliation: gem.affiliation || {},
              },
              resolved,
            ),
          },
        };
      })()
    : { ...profile };

  if (resolved?.fullAccess) {
    await logPiiAccess({
      req,
      user_id: user?._id || null,
      role,
      profileId: gem?._id || null,
      gemsPublicId: gem?.gemsPublicId || null,
      fields: ["personal", "gadData", "contact"],
      context: "profile-detail",
    });
  }

  return NextResponse.json({
    status: "success",
    masked: !(resolved?.fullAccess ?? false),
    data,
  });
}

export async function PUT(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing profile id" },
      { status: 400 },
    );
  }

  await connectDB();
  const body = await req.json();
  console.log("body", body);

  const profile = await Profile.findById(id);
  if (!profile) {
    return NextResponse.json(
      { status: "error", message: "Profile not found" },
      { status: 404 },
    );
  }

  try {
    if (Object.prototype.hasOwnProperty.call(body, "personal_information")) {
      const incomingPI = body.personal_information;
      if (incomingPI === null) {
        profile.personal_information = null;
      } else {
        const existingPI = profile.personal_information
          ? typeof profile.personal_information.toObject === "function"
            ? profile.personal_information.toObject()
            : profile.personal_information
          : {};
        const mergedPI = { ...existingPI, ...incomingPI };
        profile.personal_information = mergedPI;
      }
      delete body.personal_information;
    }

    profile.set(body);
  } catch (mergeErr) {
    console.error("Error merging personal_information:", mergeErr);
    return NextResponse.json(
      { status: "error", message: mergeErr.message },
      { status: 400 },
    );
  }
  try {
    profile.data_version = (profile.data_version || 1) + 1;
    
    try {
      const token = req.cookies.get("auth_token")?.value;
      if (token) {
        /* No `|| "fallback"` here. A hardcoded default would let a forged token
           signed with the literal string "fallback" be accepted as a valid
           session — and this block stamps `updated_by` on a PII record. An
           unset secret must fail closed, not degrade to a known value. */
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          profile.updated_by = decoded.id;
        }
      }
    } catch {
      /* Provenance is best-effort: an absent or invalid token leaves
         `updated_by` untouched rather than blocking the save. */
    }

    const updated = await profile.save();

    /* Mirror the PII into the vault. A failure here is logged but never fails
       the save; the vault is the only store of the person's PII, so the
       caller is told nothing was silently lost. */
    try {
      const patch = await syncVault(updated, body);
      if (patch?.profileSearchIndex?.length) {
        await Profile.updateOne(
          { _id: profile._id },
          {
            $set: {
              profileSearchIndex: patch.profileSearchIndex,
              /* "vaulted" rather than "dual": the plaintext blocks this used
                 to mirror into no longer exist, so there is no second copy to
                 be in sync with. */
              migrationStatus: "vaulted",
            },
          },
        );
      }
    } catch (vaultErr) {
      console.error("[profile] Vault write failed:", vaultErr.message);
    }

    const user = await UserAuth.findOne({ personal_info_id: profile._id });
    const userId = user?._id;

    if (userId) {
      await logActivity({
        user_id: userId,
        action: "PROFILE_UPDATE",
        description: "User updated their profile",
        req,
        metadata: { profile_id: profile._id, data_version: profile.data_version },
        resource_type: "profile",
        resource_id: profile._id,
        severity: "info",
      });
      console.log("✅ Logged activity: PROFILE_UPDATE");
    }

    if (global.io) {
      global.io.emit("profile:updated", updated);
      console.log("✅ Emitted profile:updated", updated._id);
    }

    return NextResponse.json({ status: "success", data: updated });
  } catch (error) {
    console.error("Validation failed:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing user id" },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const user = await UserAuth.findById(id);
    if (!user) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    if (user.personal_info_id) {
      const deletedProfile = await Profile.findByIdAndDelete(
        user.personal_info_id,
      );
      if (deletedProfile) {
        console.log(
          "✅ Deleted linked profile:",
          deletedProfile._id.toString(),
        );
      } else {
        console.warn(
          "⚠️ Profile not found for deletion:",
          user.personal_info_id.toString(),
        );
      }
    }

    await UserAuth.findByIdAndDelete(id);
    console.log("✅ Deleted user account:", id);

    if (global.io) {
      global.io.emit("profile:deleted", {
        id: user.personal_info_id?.toString(),
      });
    }

    return NextResponse.json({
      status: "success",
      message: "User account and linked profile deleted",
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
