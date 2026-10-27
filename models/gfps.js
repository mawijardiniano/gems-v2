import mongoose from "mongoose";
import "./user.js";

/* GFPS members are manual-first. The committee is its own record, not a view
   over the officials roster: one person can legitimately sit in several
   sections (a President is in both the Executive Committee and the
   Secretariat), which the unique-per-seat roster model cannot express. So a
   member's identity is its own row, and the row holds text only.

   The row is deliberately four fields: the seat, the typed name, the memo's
   order, and (for the Executive Committee) the role. Everything the roster
   picker used to add — `official_term`, the legacy `official` / `official_ref`
   pointers, the split `first_name` / `last_name`, the `official_group` header
   and the `manual` provenance flag — was removed once the picker was dropped
   and every write path hardcoded it to null/""/true. `manual` had a single
   possible value, so it is derived on read (`lib/gfpsServer.js`) rather than
   stored; the split name parts duplicated `official_text`, which every display
   path reads first anyway. */
const memberFields = {
  /* The seat from the GFPS memorandum ("Director, Research"). Fixed by the
     memo and independent of who holds it — a position outlives its occupant,
     so it must never be conflated with the person's name. This is what lets
     the chart be complete before any appointment is known. */
  position_title: {
    type: String,
    required: false,
    trim: true,
    default: "",
  },
  /* The member's name, typed by hand. This is the source of truth for who
     occupies `position_title`, and it never depends on a roster lookup.
     NOT required: the memo seeds seats before appointments exist, so a vacant
     seat is a valid row. `hasIdentity` in lib/gfpsServer.js enforces that a
     row still identifies something (a person or a seat). */
  official_text: {
    type: String,
    required: false,
    trim: true,
    default: "",
  },
  /* Where the row sits in the memo's listing, so the chart mirrors the
     memorandum instead of database insertion order. */
  sort_order: {
    type: Number,
    required: false,
  },
};

const MemberSchema = new mongoose.Schema(memberFields);

const ExecutiveMemberSchema = new mongoose.Schema({
  ...memberFields,
  role: {
    type: String,
    enum: ["chair", "member"],
    required: true,
  },
});

const ExecutiveCommitteeSchema = new mongoose.Schema({
  members: [ExecutiveMemberSchema],
});

const TechnicalWorkingGroupSchema = new mongoose.Schema({
  members: [MemberSchema],
});

const GFPSchema = new mongoose.Schema({
  // One GFPS committee snapshot per academic year (e.g. "2025-2026").
  academic_year: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{4}-\d{4}$/, "academic_year must look like 2025-2026"],
  },
  chairOrHeadOfAgency: MemberSchema,
  executiveCommittee: ExecutiveCommitteeSchema,
  technicalWorkingGroup: TechnicalWorkingGroupSchema,
  secretariat: [MemberSchema],
});

export default mongoose.models.GFPS || mongoose.model("GFPS", GFPSchema);
