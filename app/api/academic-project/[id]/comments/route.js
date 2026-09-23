import AcademicProject from "@/models/academicProject";
import { createCommentHandlers } from "@/lib/simpleProjectApi";
import { ACADEMIC_COMMENT_FIELDS } from "@/lib/projectModules";

/* Field-targeted comments for an Academic project. */

const handlers = createCommentHandlers({
  model: AcademicProject,
  resourceType: "academic-project",
  actionPrefix: "ACADEMIC_PROJECT",
  commentFields: ACADEMIC_COMMENT_FIELDS,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
