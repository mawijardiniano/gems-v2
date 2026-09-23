import { Suspense } from "react";
import Content from "./content";

export default function ResearchExtensionProjectsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
