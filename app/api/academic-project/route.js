import AcademicProject from "@/models/academicProject";
import { createCollectionHandlers } from "@/lib/simpleProjectApi";
import { COLLEGES } from "@/lib/colleges";
import {
  ACADEMIC_PROJECT_TYPES,
  PROJECT_MODULE_PREFIXES,
  SEMESTERS,
} from "@/lib/projectModules";

/* List + create endpoints for Academic projects (ACD-<year>-<seq>). */

const handlers = createCollectionHandlers({
  model: AcademicProject,
  prefix: PROJECT_MODULE_PREFIXES.academic,
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
  requiredEnums: ["project_type", "college"],
  populatePaths: ["createdBy"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
