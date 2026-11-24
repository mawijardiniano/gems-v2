import Event from "@/models/event";
import AccomplishmentReport from "@/models/accomplishment_report";
import Project from "@/models/projects";
import AcademicProject from "@/models/academicProject";
import ResearchExtensionProject from "@/models/researchExtensionProject";
import GPB from "@/models/gpb";
import GFPS from "@/models/gfps";
import { canViewEventReport } from "@/data/lib/eventAccess";
import { canViewProjectDetails } from "@/data/lib/projectAccess";
import { canAccessGpb, EVENT_ROLE_PAGE_ACCESS } from "@/data/lib/roleAccess";
import { normalizeRole } from "@/data/lib/notifications";
import { KNOWLEDGE_ROLES } from "@/data/lib/knowledgeResources";
import { REPORT_FILE_FIELDS, REPORT_FILE_LISTS } from "@/data/lib/eventFileKeys";
import { fileKeyKind, uploaderOfKey } from "@/data/lib/fileKeyKinds";

/**
 * Whether `user` may read the stored object `key` through /api/files/proxy
 * or /api/download.
 *
 * Both routes used to serve any key to any signed-in account, and the keys
 * are not secret (report and project APIs return them). So a student could
 * fetch another office's signed attendance sheet, and the audit-log archives
 * share the bucket. Now a key must belong to a record the caller may read:
 *
 * - event posters: anyone signed in (they are shown publicly anyway)
 * - accomplishment-report files: who may read that event's report
 * - expenditure evidence / milestone proofs: who may read that project
 * - GPB scanned copies: the GPB roles
 * - knowledge resources: the knowledge-resource roles
 * - GFPS issuances: the roles that can open the GFPS page
 * - anything else (audit archives, unknown folders): Admin only
 *
 * A file nobody has saved onto a record yet (still in an open form) is
 * readable by the person who uploaded it.
 */
export async function canReadStoredFile(user, key) {
  if (!user || !key) return false;
  if (user.role === "Admin") return true;

  const kind = fileKeyKind(key);
  if (!kind) return false;

  switch (kind) {
    case "poster":
      return true;
    case "knowledge":
      return KNOWLEDGE_ROLES.includes(normalizeRole(user.role));
    case "report":
      return canReadReportFile(user, key);
    case "project":
      return canReadProjectFile(user, key);
    case "gpb-scan":
      return canReadGpbScan(user, key);
    case "gfps-issuance":
      return canReadGfpsIssuance(user, key);
    default:
      return false;
  }
}

const isUploader = (user, key) =>
  String(uploaderOfKey(key) || "") === String(user._id);

async function canReadReportFile(user, key) {
  const or = [
    ...REPORT_FILE_FIELDS.map((f) => ({ [`${f}.key`]: key })),
    ...REPORT_FILE_LISTS.map((f) => ({ [`${f}.key`]: key })),
  ];
  const report = await AccomplishmentReport.findOne({ $or: or })
    .select("event_id")
    .lean();
  if (!report) return isUploader(user, key);
  const event = await Event.findById(report.event_id)
    .select("created_by")
    .lean();
  return Boolean(event) && canViewEventReport(user, event);
}

const PROJECT_KEY_QUERY = (key) => ({
  $or: [{ "expenditure_evidence.key": key }, { "milestones.proofs.key": key }],
});

async function canReadProjectFile(user, key) {
  if (canViewProjectDetails(user.role)) return true;
  for (const Model of [Project, AcademicProject, ResearchExtensionProject]) {
    const project = await Model.findOne(PROJECT_KEY_QUERY(key))
      .select("createdBy")
      .lean();
    if (project) return String(project.createdBy) === String(user._id);
  }
  return isUploader(user, key);
}

async function canReadGpbScan(user, key) {
  if (canAccessGpb(user.role)) return true;
  const used = await GPB.exists({ "status_of_gpb.scanned_copy.key": key });
  return !used && isUploader(user, key);
}

/* The GFPS issuance is shown on the GFPS page, so the roles that can open
   that page may read it. An issuance not yet saved onto a GFPS record is
   readable only by whoever uploaded it. */
async function canReadGfpsIssuance(user, key) {
  const role = normalizeRole(user.role);
  if ((EVENT_ROLE_PAGE_ACCESS[role] || []).includes("gfps")) return true;
  const used = await GFPS.exists({ "issuance.file.key": key });
  return !used && isUploader(user, key);
}
