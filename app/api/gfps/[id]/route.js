import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  GFPS_SECTION_KEYS,
  normalizeSectionOfficials,
} from "@/lib/gfpsServer";

/* Members are stored as typed `official_text` rows, so nothing here resolves a
   pointer at the retired `universityofficials` collection.
 *
 * This route must normalize its input exactly as POST does. `normalizeSectionOfficials`
 * is what applies `hasIdentity`, so a row the operator emptied out (no name, no
 * seat, no roster link) is dropped here instead of being written as a blank
 * member. Skipping it made PUT store raw client rows that POST would have
 * discarded, which is how an added member could vanish on the next read.
 *
 * Sections are ASSIGNED, not merged. The modal opens with the section's whole
 * member list already seated (`seatSectionMembers`) and submits it back whole,
 * so the submitted list is the section's complete truth — including the members
 * the operator just deleted.
 *
 * `mergeMembers` must NOT be used here. It is a union: it can add and update but
 * it has no branch that removes, so a member the operator deleted stayed in the
 * document and reappeared on the next read. That is exactly the bug this route
 * had. Merging is only ever correct for a caller that submits a delta, and
 * nothing in GFPS does: both Add and Edit submit a full section. */

export async function PUT(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  try {
    const existing = await GFPS.findById(id);
    if (!existing) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    /* Normalize first, so `hasIdentity` rejects a blank row before it can be
       merged in. `normalizeSectionOfficials` returns `null` for a single-slot
       section whose only row identifies nothing, which is how clearing the
       chair is expressed.
       Guard on `key in body`, not on truthiness: `null` is the value that
       clears a slot, and `if (body[key])` would skip it and silently keep the
       previous chair. */
    GFPS_SECTION_KEYS.forEach((key) => {
      if (!(key in body)) return;
      body[key] = normalizeSectionOfficials(body[key], {
        isExecutiveCommittee: key === "executiveCommittee",
      });
    });

    /* Assign every named section, driven off `GFPS_SECTION_KEYS` so this branch
       cannot drift out of step with the model — the previous hand-written list
       silently ignored any key it did not spell out. */
    GFPS_SECTION_KEYS.forEach((key) => {
      if (!(key in body)) return;
      const value = body[key];

      if (key === "chairOrHeadOfAgency") {
        existing.chairOrHeadOfAgency = value;
      } else if (Array.isArray(value)) {
        existing[key] = value;
      } else if (value?.members) {
        existing[key] ||= { members: [] };
        existing[key].members = value.members;
      }

      /* Assignment alone does not always mark a nested path dirty, and an
         unmarked path is written back unchanged while the response still
         reports success. */
      existing.markModified(key);
    });

    await existing.save();

    /* Read back from the database rather than responding with the in-memory
       document, so the response matches what a following GET will return. */
    const reread = await GFPS.findById(id).lean();

    await logActivity({
      req,
      action: "GFP_UPDATE",
      description: `GFPS structure updated (AY ${existing.academic_year})`,
      resource_type: "gfps",
      resource_id: id,
      severity: "info",
      metadata: { academic_year: existing.academic_year },
    });

    return Response.json({ success: true, data: existing });
  } catch (error) {
    console.error("[GFPS PUT] Error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
