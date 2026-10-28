import { notFound } from "next/navigation";
import BreadcrumbsPreview from "./content";

/**
 * Dev-only breadcrumb preview. 404s in production builds.
 */
export default function BreadcrumbsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BreadcrumbsPreview />;
}
