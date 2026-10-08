import mongoose from "mongoose";
import { COLLEGES } from "../lib/colleges.js";
import {
  ACADEMIC_COMMENT_FIELDS,
  ACADEMIC_PROJECT_TYPES,
  ACADEMIC_STATUSES,
  SEMESTERS,
} from "../lib/projectModules.js";
import {
  FieldSchema,
  MilestoneSchema,
  GanttActivitySchema,
  buildCommentSchema,
  applyReferenceNumberIndex,
  fileMetaSchema,
} from "./projectCommon.js";

/* Destructured default import (see projectCommon.js) keeps this schema loadable
   from plain-Node scripts and tests. */
const { Schema, model, models } = mongoose;

/*
 * An Academic project — instructional development, accreditation, curriculum
 * work and similar college-level academic undertakings.
 *
 * Mirrors the GAD / Research & Extension project skeleton so the same
 * monitoring, milestone, reference-number and accomplishment machinery applies.
 *
 * Reference numbers look like `ACD-2025-001` (see lib/referenceNumber.js).
 */

const CommentSchema = buildCommentSchema(ACADEMIC_COMMENT_FIELDS);

const AcademicProjectSchema = new Schema({
  year: { type: Number, required: true },
  /* Human-readable code shown on the monitoring workspace, e.g. "ACD-2025-001".
     Assigned by the API on create and kept forever. */
  reference_number: {
    type: String,
    default: null,
    trim: true,
  },

  title: FieldSchema(String),
  project_type: {
    type: String,
    enum: ACADEMIC_PROJECT_TYPES,
    required: true,
  },

  /* Owning college — single value from the canonical COLLEGES list. */
  college: {
    type: String,
    enum: COLLEGES,
    required: true,
  },
  /* Optional programs within the college (values from COLLEGE_TO_PROGRAMS). */
  programs: { type: [String], default: [] },
  semester: {
    type: String,
    enum: SEMESTERS,
    default: null,
  },

  objectives: FieldSchema([String]),
  expected_outputs: FieldSchema([String]),
  target_participants: { type: Number, default: null },
  partner_agency: FieldSchema(String),

  budget: FieldSchema(Number),
  source_budget: FieldSchema(String),
  /* Other units/offices involved (e.g. "Office of the Vice President for
     Academic Affairs") — options from OFFICE_OPTIONS in lib/colleges.js. */
  responsible_office: FieldSchema([String]),

  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  project_status: {
    type: String,
    enum: ACADEMIC_STATUSES,
    default: "for-review",
  },

  milestones: {
    type: [MilestoneSchema],
    default: [],
  },
  gantt_activities: {
    type: [GanttActivitySchema],
    default: [],
  },

  /* Linked events (type_of_activity "Academic") drive the live
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

applyReferenceNumberIndex(AcademicProjectSchema);
AcademicProjectSchema.index({ college: 1, year: -1 });
AcademicProjectSchema.index({ project_type: 1 });
AcademicProjectSchema.index({ project_status: 1 });

export default models.AcademicProject ||
  model("AcademicProject", AcademicProjectSchema);
