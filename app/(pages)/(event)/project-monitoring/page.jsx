import { redirect } from "next/navigation";

/**
 * /project-monitoring is a navigation group, not a page: the sidebar expands
 * it into the four project sections. Landing on the bare URL used to 404, so
 * send visitors to the first section the same way the collapsed sidebar does.
 */
export default function ProjectMonitoringPage() {
  redirect("/project-monitoring/gad-projects");
}
