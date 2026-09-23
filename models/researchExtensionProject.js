import mongoose from "mongoose";
import {
  RE_CLASSIFICATIONS,
  RE_COMMENT_FIELDS,
  RE_FUNDING_SOURCES,
  RE_STATUSES,
} from "../lib/projectModules.js";
import {
  FieldSchema,
  MilestoneSchema,
  buildCommentSchema,
  applyReferenceNumberIndex,
  fileMetaSchema,
} from "./projectCommon.js";

/* Destructured default import (see projectCommon.js) keeps this schema loadable
   from plain-Node scripts and tests. */
const { Schema, model, models } = mongoose;

/*
 * A Research & Extension project tracked by the Research & Extension Office.
 *
 * One model covers both kinds — Research and Extension share the same
 * lifecycle (for-review → ongoing → completed → terminated) and differ only in
 * their metadata, so `classification` acts as the discriminator.
 *
 * Reference numbers look like `RNE-2025-001` (see lib/referenceNumber.js).
 */

const CommentSchema = buildCommentSchema(RE_COMMENT_FIELDS);

const ResearchExtensionProjectSchema = new Schema({
  year: { type: Number, required: true },
  /* Human-readable code shown on the monitoring workspace, e.g. "RNE-2025-001".
     Assigned by the API on create and kept forever. */
  reference_number: {
    type: String,
    default: null,
    trim: true,
  },

  title: FieldSchema(String),
  classification: {
    type: String,
    enum: RE_CLASSIFICATIONS,
    required: true,
  },
  /* Research category or extension modality depending on `classification`.
     Options live in lib/projectModules.js (RE_CATEGORIES). */
  category: FieldSchema(String),
  research_agenda: FieldSchema(String),

  objectives: FieldSchema([String]),
  /* For Extension: communities/sectors served. For Research: target sectors. */
  beneficiaries: FieldSchema([String]),
  partner_agency: FieldSchema(String),
  delivery_site: FieldSchema(String),
  expected_outputs: FieldSchema([String]),

  funding_source: {
    type: String,
    enum: RE_FUNDING_SOURCES,
    default: "Internal",
  },
  funding_agency: FieldSchema(String),
  budget: FieldSchema(Number),
  source_budget: FieldSchema(String),
  responsible_office: FieldSchema([String]),

  /* Project leader + team reference authenticated users so reports can pull
     names/roles the same way events populate `created_by`. */
  project_leader: {
    type: Schema.Types.ObjectId,
    ref: "UserAuth",
    required: true,
  },
  team_members: [{ type: Schema.Types.ObjectId, ref: "UserAuth", default: [] }],

  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  project_status: {
    type: String,
    enum: RE_STATUSES,
    default: "for-review",
  },

  /* Optional approval metadata encoded from the monitoring page. */
  approved_resolution_no: FieldSchema(String),
  other_details: FieldSchema(String),

  milestones: {
    type: [MilestoneSchema],
    default: [],
  },

  /* Linked events (type_of_activity "Research" / "Extension") drive the live
     actual-accomplishment summary via lib/accomplishmentSummary.js. */
  events: [{ type: Schema.Types.ObjectId, ref: "Event" }],

  actual_accomplishment: {
    type: [String],
    default: [],
  },
  /* When true, `actual_accomplishment` is manual text; otherwise it is derived live from `events`. */
  actual_accomplishment_override: {
    type: Boolean,
    default: false,
  },
  actual_expenditures: {
    type: Number,
    default: 0,
  },
  expenditure_evidence: {
    type: [fileMetaSchema],
    default: [],
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "UserAuth",
    default: null,
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: "UserAuth",
    default: null,
  },

  comments: [CommentSchema],
});

applyReferenceNumberIndex(ResearchExtensionProjectSchema);
ResearchExtensionProjectSchema.index({ classification: 1, year: -1 });
ResearchExtensionProjectSchema.index({ project_status: 1 });
ResearchExtensionProjectSchema.index({ project_leader: 1 });

export default models.ResearchExtensionProject ||
  model("ResearchExtensionProject", ResearchExtensionProjectSchema);
