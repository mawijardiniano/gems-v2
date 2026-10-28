import { redirect } from "next/navigation";

/**
 * /president/project-monitoring is a navigation group, not a page (see the
 * matching route under (event)). Redirect to its first section.
 */
export default function PresidentProjectMonitoringPage() {
  redirect("/president/project-monitoring/gad-projects");
}
