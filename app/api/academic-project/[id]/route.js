import AcademicProject from "@/models/academicProject";
import { createItemHandlers } from "@/lib/simpleProjectApi";
import { COLLEGES } from "@/lib/colleges";
import {
  ACADEMIC_PROJECT_TYPES,
  ACADEMIC_STATUSES,
  SEMESTERS,
} from "@/lib/projectModules";

/* Single Academic project: fetch, update and delete. */

const handlers = createItemHandlers({
  model: AcademicProject,
  label: "Academic",
  resourceType: "academic-project",
  actionPrefix: "ACADEMIC_PROJECT",
  fieldSpecs: {
    title: "string",
    objectives: "array",
    expected_outputs: "array",
    partner_agency: "string",
    budget: "number",
    source_budget: "string",
    responsible_office: "array",
    approved_resolution_no: "string",
    other_details: "string",
  },
  plainSpecs: {
    programs: "array",
    target_participants: "nullableNumber",
  },
  enumFields: {
    project_type: ACADEMIC_PROJECT_TYPES,
    college: COLLEGES,
    semester: SEMESTERS,
  },
  statuses: ACADEMIC_STATUSES,
  populatePaths: ["createdBy"],
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
