import { connectDB } from "@/data/lib/db";
import Profile from "@/models/profile";
import { NextResponse } from "next/server";
import { requireOrgStructureEditor } from "@/data/lib/officialsAccess";
import { blindIndexTokens } from "@/data/lib/identityVault";
import { canViewPII, loadDecryptedPiiBatch } from "@/data/lib/profileBroker";
import { logActivity } from "@/data/lib/activityLog";

const MAX_RESULTS = 10;
const MIN_WORD_LENGTH = 2;

/**
 * GET /api/university-officials/person-search?q=maria santos
 *
 * The officials picker's people lookup. It replaces a page-load fetch of the
 * whole /api/profile list, which decrypted every profile and shipped it to the
 * browser so the picker could filter client-side.
 *
 * - Editors only: the same roles that may assign officials, which are also the
 *   only roles cleared to see real names (CAN_VIEW_PII_ROLES).
 * - Employees only: officials are staff, so students never appear.
 * - Names are encrypted, so matching goes through the blind index. The index
 *   holds whole words (first name, last name, full name), not prefixes, so
 *   "maria" matches and "mar" does not. Every word typed must match ($all),
 *   which keeps "maria santos" from returning every Maria and every Santos.
 * - At most 10 rows, and each row carries only what the form needs:
 *   { gemsPublicId, name, office, sex }. No birthday, contact or ids.
 * - One audit entry per search lists the public ids that were revealed.
 */
export async function GET(req) {
  const { error, status, user } = await requireOrgStructureEditor(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canViewPII(user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q") || "";
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || words.some((w) => w.length < MIN_WORD_LENGTH)) {
    return Response.json({ success: true, data: [] });
  }

  /* One digest per word. blindIndexTokens(word) is [digest(word)]. */
  const digests = words.map((w) => blindIndexTokens(w)[0]).filter(Boolean);
  if (digests.length !== words.length) {
    return Response.json({ success: true, data: [] });
  }

  await connectDB();

  const profiles = await Profile.find(
    {
      profileSearchIndex: { $all: digests },
      "affiliation.person_type": "Employee",
      vaultRef: { $ne: null },
    },
    {
      vaultRef: 1,
      gemsPublicId: 1,
      "affiliation.employment_information.office": 1,
    },
  )
    .limit(MAX_RESULTS)
    .lean();

  if (!profiles.length) return Response.json({ success: true, data: [] });

  /* Only the four fields the row needs are read and decrypted. */
  const piiByRef = await loadDecryptedPiiBatch(
    profiles.map((p) => p.vaultRef),
    { fields: ["first_name", "middle_name", "last_name", "sexAtBirth"] },
  );

  const data = profiles
    .map((p) => {
      const pii = piiByRef.get(String(p.vaultRef));
      if (!pii) return null;
      const name = [pii.first_name, pii.middle_name, pii.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (!name) return null;
      return {
        gemsPublicId: p.gemsPublicId || null,
        name,
        office: p.affiliation?.employment_information?.office || "",
        sex: pii.sexAtBirth === "Male" || pii.sexAtBirth === "Female"
          ? pii.sexAtBirth
          : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (data.length) {
    await logActivity({
      req,
      user_id: user?._id || null,
      action: "PII_ACCESS",
      description: `Viewed ${data.length} employee name(s) in the officials person search`,
      severity: "warning",
      resource_type: "profile",
      metadata: {
        role: user?.role || null,
        gems_public_ids: data.map((d) => d.gemsPublicId).filter(Boolean),
        fields: ["name", "sexAtBirth", "office"],
        context: "officials-person-search",
      },
      module: "profile",
    });
  }

  return Response.json({ success: true, data });
}
