import ResearchExtensionProject from "@/models/researchExtensionProject";
import { createCommentHandlers } from "@/data/lib/simpleProjectApi";
import { RE_COMMENT_FIELDS } from "@/data/lib/projectModules";

/* Field-targeted comments for a Research & Extension project. */

const handlers = createCommentHandlers({
  model: ResearchExtensionProject,
  resourceType: "re-extension-project",
  actionPrefix: "RE_PROJECT",
  commentFields: RE_COMMENT_FIELDS,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
