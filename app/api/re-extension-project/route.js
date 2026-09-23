import ResearchExtensionProject from "@/models/researchExtensionProject";
import { createCollectionHandlers } from "@/lib/simpleProjectApi";
import {
  PROJECT_MODULE_PREFIXES,
  RE_CLASSIFICATIONS,
  RE_FUNDING_SOURCES,
} from "@/lib/projectModules";

/* List + create endpoints for Research & Extension projects (RNE-<year>-<seq>). */

const handlers = createCollectionHandlers({
  model: ResearchExtensionProject,
  prefix: PROJECT_MODULE_PREFIXES.reExtension,
  label: "Research & Extension",
  resourceType: "re-extension-project",
  actionPrefix: "RE_PROJECT",
  fieldSpecs: {
    title: "string",
    category: "string",
    research_agenda: "string",
    objectives: "array",
    beneficiaries: "array",
    partner_agency: "string",
    delivery_site: "string",
    expected_outputs: "array",
    funding_agency: "string",
    budget: "number",
    source_budget: "string",
    responsible_office: "array",
    approved_resolution_no: "string",
    other_details: "string",
  },
  enumFields: {
    classification: RE_CLASSIFICATIONS,
    funding_source: RE_FUNDING_SOURCES,
  },
  requiredEnums: ["classification"],
  populatePaths: ["createdBy", "project_leader"],
  buildExtra: (body, userId) => ({
    project_leader: body.project_leader || userId || null,
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
