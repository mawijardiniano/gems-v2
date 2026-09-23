import ResearchExtensionProject from "@/models/researchExtensionProject";
import { createItemHandlers } from "@/lib/simpleProjectApi";
import {
  RE_CLASSIFICATIONS,
  RE_FUNDING_SOURCES,
  RE_STATUSES,
} from "@/lib/projectModules";

/* Single Research & Extension project: fetch, update and delete. */

const handlers = createItemHandlers({
  model: ResearchExtensionProject,
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
  statuses: RE_STATUSES,
  populatePaths: ["createdBy", "project_leader"],
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
