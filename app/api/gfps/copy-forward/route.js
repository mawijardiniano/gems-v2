import { connectDB } from "@/lib/db";
import GFPS from "@/models/gfps";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { GFPS_SECTION_KEYS } from "@/lib/gfpsServer";
import { normalizeAcademicYear } from "@/lib/academicYear";

/**
 * POST /api/gfps/copy-forward { from, to }
 * Clones the GFPS committee into an empty target AY.
 *
 * This is a STRUCTURE copy. GFPS members are manual-first, so each carried row
 * is written as a typed row holding its own name and seat text — no roster
 * lookup happens here, because a GFPS seat is defined by the memorandum rather
 * than by a roster title. The previous year's rows are carried down as they
 * stand, which also means a copy no longer depends on the officials roster
 * being complete.
 *
 * A row is only carried when it can still say who or what it is: it holds a
 * `official_text`, a `position_title`, or both. A row with neither is skipped
 * rather than written as a blank member — carrying blank rows is what produced
 * empty GFPS pages.
 */
export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const body = await req.json();
  const from = normalizeAcademicYear(body?.from);
  const to = normalizeAcademicYear(body?.to);

  if (!from || !to) {
    return Response.json(
      { success: false, error: "from and to must be valid academic years" },
      { status: 400 },
    );
  }
  if (from === to) {
    return Response.json(
      { success: false, error: "from and to must be different years" },
      { status: 400 },
    );
  }

  const [source, targetCount] = await Promise.all([
    GFPS.findOne({ academic_year: from }).lean(),
    GFPS.countDocuments({ academic_year: to }),
  ]);

  if (!source) {
    return Response.json(
      { success: false, error: `No GFPS found for AY ${from}` },
      { status: 404 },
    );
  }
  if (targetCount > 0) {
    return Response.json(
      { success: false, error: `AY ${to} already has a GFPS record` },
      { status: 409 },
    );
  }

  const carried = [];

  /* A carried row must never arrive in the new year blank. Only the identity
     fields travel, and a row holding neither a name nor a seat is counted and
     dropped so the operator can tell a partial copy from an empty one. */
  const carryMember = (member = {}) => {
    const text = String(member.official_text || "").trim();
    /* A seat survives copy-forward whether or not anyone holds it: the position
       comes from the memorandum and outlives the appointment, so an unfilled
       seat is carried as an unfilled seat rather than as an unnamed member. */
    const seatText = String(member.position_title || "").trim();

    if (!text && !seatText) {
      carried.push(member._id || "blank");
      return null;
    }

    const row = {
      position_title: seatText,
      official_text: text,
    };

    /* Order and role travel only when present, so a copied row sorts and groups
       on the new year exactly as it did on the old one. */
    if (member.sort_order !== undefined && member.sort_order !== null) {
      row.sort_order = member.sort_order;
    }
    if (member.role) row.role = member.role;

    return row;
  };

  const carrySection = (section) => {
    if (!section) return section;
    if (Array.isArray(section)) {
      return section.map(carryMember).filter(Boolean);
    }
    if (Array.isArray(section.members)) {
      return {
        ...section,
        members: section.members.map(carryMember).filter(Boolean),
      };
    }
    return carryMember(section);
  };

  const payload = { academic_year: to };
  GFPS_SECTION_KEYS.forEach((key) => {
    if (source[key] !== undefined) payload[key] = carrySection(source[key]);
  });

  /* What will actually render: the rows that survived the identity test above.
     Returned so the caller can tell a real copy from an empty one — a copy that
     carried 46 pointers but resolved no names looks identical to success. */
  const copied = GFPS_SECTION_KEYS.reduce((n, key) => {
    const section = payload[key];
    if (Array.isArray(section)) return n + section.length;
    if (Array.isArray(section?.members)) return n + section.members.length;
    return n + (section ? 1 : 0);
  }, 0);

  const doc = await GFPS.create(payload);

  await logActivity({
    req,
    action: "GFP_COPY_FORWARD",
    description: `GFPS copied from AY ${from} to AY ${to}`,
    resource_type: "gfps",
    resource_id: doc._id,
    severity: "info",
    metadata: { from, to, carried: carried.length },
  });

  return Response.json({
    success: true,
    data: {
      from,
      to,
      _id: doc._id,
      /* Rows that survived as real, renderable members. */
      copied,
      /* Ids skipped because they named neither a person nor a seat. Surfaced so
         the operator knows a copy was partial rather than silently empty. */
      carried,
    },
  });
}
