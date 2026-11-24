import { connectDB } from "@/data/lib/db";
import OfficialTerm from "@/models/officialTerm";
import Official from "@/models/official";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireOrgStructureEditor } from "@/data/lib/officialsAccess";
import {
  identitiesByPublicId,
  linkStatusFor,
} from "@/data/lib/officialsProfileLink";
import { logActivity } from "@/data/lib/activityLog";

/**
 * POST /api/university-officials/[id]/sync — "Update from profile".
 *
 * `[id]` is a term id (what the roster rows carry). The term's person must be
 * linked to an employee profile. The official's copied name and sex are
 * refreshed from that profile — only the parts that actually differ, so a
 * title the editor added ("Dr.") survives a sex-only update. Nothing changes
 * on its own: the roster only reports "differs" until an editor asks for this.
 *
 * The person's name is unique among officials, so a rename that would collide
 * with another official answers 409 instead of merging two people.
 */
export async function POST(req, { params }) {
  const { error, status } = await requireOrgStructureEditor(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }
  const term = await OfficialTerm.findById(id).lean();
  const official = term ? await Official.findById(term.official) : null;
  if (!official) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }
  if (!official.profileRef) {
    return Response.json(
      { success: false, error: "This official is not linked to a profile." },
      { status: 409 },
    );
  }

  const identity = (await identitiesByPublicId([official.profileRef])).get(
    official.profileRef,
  );
  const verdict = linkStatusFor(official, identity);
  if (verdict === "broken") {
    return Response.json(
      {
        success: false,
        error: "The linked profile no longer exists. Unlink it or search the person again.",
      },
      { status: 409 },
    );
  }

  const changed = [];
  if (verdict === "differs") {
    const nameOnly = linkStatusFor(
      { ...official.toObject(), sex: identity.sex },
      identity,
    );
    if (nameOnly === "differs" && identity.name && identity.name !== official.name) {
      const clash = await Official.findOne(
        { name: identity.name, _id: { $ne: official._id } },
        { _id: 1 },
      ).lean();
      /* A same-named official that holds no term at all, past or present, is
         an orphan — typically what an earlier name correction left behind —
         and carries nothing worth keeping. It is removed so the rename can
         take the name. One that holds any term is a real person: refuse. */
      const orphan =
        clash && !(await OfficialTerm.exists({ official: clash._id }));
      if (orphan) {
        await Official.deleteOne({ _id: clash._id });
      } else if (clash) {
        return Response.json(
          {
            success: false,
            error: `Another official is already named "${identity.name}".`,
          },
          { status: 409 },
        );
      }
      official.name = identity.name;
      changed.push("name");
    }
    if (identity.sex !== "unspecified" && official.sex !== identity.sex) {
      official.sex = identity.sex;
      changed.push("sex");
    }
    if (changed.length) await official.save();
  }

  if (changed.length) {
    await logActivity({
      req,
      action: "OFFICIAL_SYNC_PROFILE",
      description: "Official updated from linked profile",
      resource_type: "university_official",
      resource_id: term._id,
      severity: "info",
      metadata: { fields: changed },
    });
  }

  return Response.json({
    success: true,
    data: {
      _id: term._id,
      official_text: official.name,
      sex: official.sex,
      linked: true,
      linkStatus: "ok",
      changed,
    },
  });
}
